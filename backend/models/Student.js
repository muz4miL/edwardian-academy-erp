const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Subject sub-schema (matches Class model structure)
const studentSubjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: false,
      unique: true,
      trim: true,
    },
    // ========================================
    // PHASE 2: Physical Security Fields
    // ========================================
    barcodeId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness
      index: true,
      trim: true,
      // Format: EDW-2026-001
    },
    // Student Portal Login Password
    password: {
      type: String,
      select: false, // Hidden by default in queries
    },
    // Plain text password for admin display (Front Desk can always see it)
    plainPassword: {
      type: String,
      trim: true,
    },
    // Enhanced status for student lifecycle
    studentStatus: {
      type: String,
      enum: ["Active", "Pending", "Alumni", "Expelled", "Suspended"],
      default: "Active",
    },
    // ID Card reprint tracking (anti-fraud)
    reprintCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // CNIC for verification
    cnic: {
      type: String,
      trim: true,
    },
    // Student Photo URL
    photo: {
      type: String,
      trim: true,
    },
    // ========================================
    // Original Fields
    // ========================================
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    // Dynamic class name from Classes dashboard
    class: {
      type: String,
      required: true,
      trim: true,
    },
    // Dynamic group name
    group: {
      type: String,
      required: true,
      trim: true,
    },
    // TASK 1: Subjects with locked pricing (matches Class model)
    subjects: [studentSubjectSchema],
    parentCell: {
      type: String,
      required: true,
      trim: true,
    },
    studentCell: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated"],
      default: "active",
    },
    feeStatus: {
      type: String,
      enum: ["paid", "partial", "pending"],
      default: "pending",
    },
    totalFee: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    // ObjectId references for data integrity
    classRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: false,
    },
    sessionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: false,
    },
    // Teacher assignment (auto-linked from class)
    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: false,
    },
    assignedTeacherName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual field for balance - TASK 1: Use Math.max to prevent negative balance
studentSchema.virtual("balance").get(function () {
  return Math.max(0, this.totalFee - this.paidAmount);
});

// Virtual for total subject fees (locked at admission time)
studentSchema.virtual("totalSubjectFees").get(function () {
  if (!this.subjects || !Array.isArray(this.subjects)) return 0;
  return this.subjects.reduce((sum, s) => sum + (s.fee || 0), 0);
});

// Ensure virtuals are included in JSON responses
studentSchema.set("toJSON", { virtuals: true });
studentSchema.set("toObject", { virtuals: true });

// Pre-save hook with price locking
studentSchema.pre("save", async function () {
  console.log("\n🛠️  PRE-SAVE HOOK TRIGGERED");
  console.log(`🛠️  GENERATING ID FOR: ${this.studentName}`);
  console.log(`🛠️  Class: ${this.class}, Group: ${this.group}`);

  // TASK 1: Lock subject prices from Class model at admission time
  if (
    this.isNew &&
    this.classRef &&
    (!this.subjects || this.subjects.length === 0)
  ) {
    try {
      const Class = mongoose.model("Class");
      const classDoc = await Class.findById(this.classRef).lean();

      if (classDoc && classDoc.subjects) {
        // Copy subject prices from Class to lock them at admission time
        this.subjects = classDoc.subjects.map((s) => ({
          name: typeof s === "string" ? s : s.name,
          fee: typeof s === "object" ? s.fee || 0 : classDoc.baseFee || 0,
        }));
        console.log(
          `📌 LOCKED ${this.subjects.length} subjects with prices from Class`,
        );
      }
    } catch (err) {
      console.log("⚠️ Could not lock subject prices:", err.message);
    }
  }

  // Generate studentId for new documents (numeric format: 260001, 260002, ...)
  if (this.isNew && !this.studentId) {
    // Find the highest existing numeric ID
    const lastStudent = await this.constructor
      .findOne({
        studentId: { $exists: true, $ne: null, $regex: /^\\d+$/ },
      })
      .sort({ studentId: -1 })
      .select("studentId")
      .lean();

    if (
      lastStudent &&
      lastStudent.studentId &&
      /^\\d+$/.test(lastStudent.studentId)
    ) {
      const lastNumber = parseInt(lastStudent.studentId, 10);
      this.studentId = String(lastNumber + 1);
      console.log(`✅ GENERATED NUMERIC ID: ${this.studentId}`);
    } else {
      // Check for old STU-XXX format as fallback
      const lastOldStudent = await this.constructor
        .findOne({ studentId: { $regex: /^STU-/ } })
        .sort({ createdAt: -1 })
        .select("studentId")
        .lean();

      if (lastOldStudent) {
        // There are old format IDs, start numeric from 260001
        this.studentId = "260001";
      } else {
        // Fresh start
        this.studentId = "260001";
      }
      console.log("✅ GENERATED ID (Starting numeric): 260001");
    }
  }

  // Ensure totalFee and paidAmount are Numbers
  if (this.totalFee !== undefined) {
    this.totalFee = Number(this.totalFee);
  }
  if (this.paidAmount !== undefined) {
    this.paidAmount = Number(this.paidAmount);
  }

  // TASK 3: Auto-calculate feeStatus based on payment logic
  const totalFee = Number(this.totalFee) || 0;
  const paidAmount = Number(this.paidAmount) || 0;

  // New Logic from Task 3:
  // - If paidAmount >= totalFee → status = 'paid'
  // - If paidAmount > 0 and < totalFee → status = 'partial'
  // - If paidAmount === 0 → status = 'pending'

  if (paidAmount >= totalFee && totalFee > 0) {
    this.feeStatus = "paid";
  } else if (paidAmount > 0 && paidAmount < totalFee) {
    this.feeStatus = "partial";
  } else {
    this.feeStatus = "pending";
  }

  console.log(
    `✅ FINAL STATE: ID=${this.studentId}, FeeStatus=${this.feeStatus}, TotalFee=${totalFee}, PaidAmount=${paidAmount}, Subjects=${this.subjects?.length || 0}\n`,
  );

  // Hash password if modified
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("🔐 Password hashed for student");
  }
});

// ========================================
// INSTANCE METHODS
// ========================================

// Compare password for student login
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate barcode ID (EDW-YEAR-XXX format)
studentSchema.methods.generateBarcodeId = async function () {
  if (this.barcodeId) return this.barcodeId;

  const year = new Date().getFullYear();
  const count = await this.constructor.countDocuments({
    barcodeId: { $exists: true, $ne: null },
  });
  const sequence = String(count + 1).padStart(3, "0");
  this.barcodeId = `EDW-${year}-${sequence}`;

  return this.barcodeId;
};

// Get public profile (for student portal)
studentSchema.methods.getStudentProfile = function () {
  return {
    _id: this._id,
    studentId: this.studentId,
    barcodeId: this.barcodeId,
    studentName: this.studentName,
    fatherName: this.fatherName,
    class: this.class,
    group: this.group,
    subjects: this.subjects,
    email: this.email,
    photo: this.photo,
    studentStatus: this.studentStatus,
    feeStatus: this.feeStatus,
    totalFee: this.totalFee,
    paidAmount: this.paidAmount,
    balance: this.balance,
    sessionRef: this.sessionRef,
  };
};

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
