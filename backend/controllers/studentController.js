const Student = require("../models/Student");
const FeeRecord = require("../models/FeeRecord");
const Transaction = require("../models/Transaction");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Configuration = require("../models/Configuration");
const Notification = require("../models/Notification");
const User = require("../models/User");

// @desc    Get all students
// @route   GET /api/students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
};

// @desc    Get single student by ID
// @route   GET /api/students/:id
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("❌ Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student",
      error: error.message,
    });
  }
};

// @desc    Create new student (admission)
// @route   POST /api/students
exports.createStudent = async (req, res) => {
  try {
    console.log("\n=== CREATE STUDENT REQUEST ===");
    console.log("Incoming Data:", JSON.stringify(req.body, null, 2));

    const {
      studentName,
      fatherName,
      class: className,
      group,
      address,
      parentCell,
      studentCell,
      email,
      admissionDate,
      totalFee,
      paidAmount,
      discountAmount,
      classRef,
      sessionRef,
    } = req.body;

    // Validation
    if (!studentName || !fatherName || !className || !group || !parentCell) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: studentName, fatherName, class, group, parentCell",
      });
    }

    if (totalFee === undefined || totalFee === null) {
      return res.status(400).json({
        success: false,
        message: "Total fee is required",
      });
    }

    // AUTO-LINK: Fetch the class to get assigned teacher
    const Class = require("../models/Class");
    let assignedTeacher = null;
    let assignedTeacherName = null;

    if (classRef) {
      const classDoc =
        await Class.findById(classRef).populate("assignedTeacher");
      if (classDoc?.assignedTeacher) {
        assignedTeacher = classDoc.assignedTeacher._id;
        assignedTeacherName =
          classDoc.assignedTeacher.name || classDoc.teacherName;
        console.log(
          `🔗 Auto-linking student to professor: ${assignedTeacherName}`,
        );
      } else if (classDoc?.teacherName) {
        // Fallback to teacherName string if ObjectId ref not populated
        assignedTeacherName = classDoc.teacherName;
        // Try to find teacher by name
        const Teacher = require("../models/Teacher");
        const teacher = await Teacher.findOne({
          name: { $regex: new RegExp(classDoc.teacherName, "i") },
          status: "active",
        });
        if (teacher) {
          assignedTeacher = teacher._id;
          console.log(`🔗 Found and linked teacher by name: ${teacher.name}`);
        }
      }
    }

    // Create student object
    const studentData = {
      studentName: studentName.trim(),
      fatherName: fatherName.trim(),
      class: className.trim(),
      group: group.trim(),
      parentCell: parentCell.trim(),
      totalFee: Number(totalFee),
      paidAmount: Number(paidAmount) || 0,
      discountAmount: Number(discountAmount) || 0,
    };

    // Optional fields
    if (studentCell) studentData.studentCell = studentCell.trim();
    if (email) studentData.email = email.trim().toLowerCase();
    if (address) studentData.address = address.trim();
    if (admissionDate) studentData.admissionDate = new Date(admissionDate);
    if (classRef) studentData.classRef = classRef;
    if (sessionRef) studentData.sessionRef = sessionRef;

    // Add teacher link if found
    if (assignedTeacher) studentData.assignedTeacher = assignedTeacher;
    if (assignedTeacherName)
      studentData.assignedTeacherName = assignedTeacherName;

    console.log(
      "Processed Student Data:",
      JSON.stringify(studentData, null, 2),
    );

    // Create student (studentId will be auto-generated in pre-save hook)
    const student = await Student.create(studentData);

    console.log("✅ Student created successfully:", student.studentId);
    if (assignedTeacherName) {
      console.log(`   👨‍🏫 Linked to Professor: ${assignedTeacherName}`);
    }

    res.status(201).json({
      success: true,
      message: "Student admitted successfully",
      data: student,
    });
  } catch (error) {
    console.error("❌ Error creating student:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Student with this information already exists",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create student",
      error: error.message,
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if class is changing (classRef)
    const oldClassRef = student.classRef?.toString();
    const newClassRef = req.body.classRef;
    const isClassChanging = newClassRef && oldClassRef !== newClassRef;

    console.log(`\n=== UPDATE STUDENT ===`);
    console.log(`Student: ${student.studentName}`);
    console.log(`Old Class Ref: ${oldClassRef || "none"}`);
    console.log(`New Class Ref: ${newClassRef || "none"}`);
    console.log(`Is Class Changing: ${isClassChanging}`);

    // If class is changing, update Class documents' enrolledCount
    if (isClassChanging) {
      // Remove from old class
      if (oldClassRef) {
        await Class.findByIdAndUpdate(oldClassRef, {
          $inc: { enrolledCount: -1 },
        });
        console.log(`📤 Removed from old class: ${oldClassRef}`);
      }

      // Add to new class
      const newClass = await Class.findByIdAndUpdate(
        newClassRef,
        { $inc: { enrolledCount: 1 } },
        { new: true }
      ).populate("assignedTeacher");

      if (newClass) {
        console.log(`📥 Added to new class: ${newClass.classTitle}`);

        // Update student's class-related fields
        student.classRef = newClassRef;
        student.class = newClass.classTitle || newClass.displayName;
        student.group = newClass.group;

        // Copy subjects from new class
        if (newClass.subjects && newClass.subjects.length > 0) {
          student.subjects = newClass.subjects.map((s) => ({
            name: s.name,
            fee: s.fee || 0,
          }));
        }

        // Update assigned teacher
        if (newClass.assignedTeacher) {
          student.assignedTeacher = newClass.assignedTeacher._id;
          student.assignedTeacherName =
            newClass.assignedTeacher.name || newClass.teacherName;
        }

        // Recalculate total fee from subjects
        const totalFee = student.subjects.reduce((sum, s) => sum + (s.fee || 0), 0);
        student.totalFee = totalFee;
      } else {
        return res.status(404).json({
          success: false,
          message: "New class not found",
        });
      }
    }

    // Update other allowed fields
    const allowedUpdates = [
      "studentName",
      "fatherName",
      "address",
      "parentCell",
      "studentCell",
      "email",
      "status",
      "paidAmount",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    // Handle subjects update separately (if provided and class isn't changing)
    if (req.body.subjects && !isClassChanging) {
      student.subjects = req.body.subjects;
      // Recalculate total fee
      const totalFee = student.subjects.reduce((sum, s) => sum + (s.fee || 0), 0);
      student.totalFee = totalFee;
    }

    // Recalculate fee status
    const balance = student.totalFee - student.paidAmount;
    if (balance <= 0) {
      student.feeStatus = "paid";
    } else if (student.paidAmount > 0) {
      student.feeStatus = "partial";
    } else {
      student.feeStatus = "pending";
    }

    await student.save();

    console.log(`✅ Student updated: ${student.studentName}`);

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    console.error("❌ Error updating student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update student",
      error: error.message,
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await student.deleteOne();

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
      data: {},
    });
  } catch (error) {
    console.error("❌ Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete student",
      error: error.message,
    });
  }
};

// @desc    Collect Fee from Student (Module 2: Fee Collection)
// @route   POST /api/students/:id/collect-fee
// @access  Protected (Staff/Admin)
exports.collectFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month, subject, teacherId, paymentMethod, notes } =
      req.body;

    console.log("\n=== FEE COLLECTION REQUEST ===");
    console.log("Student ID:", id);
    console.log("Amount:", amount);
    console.log("Month:", month);
    console.log("Teacher ID:", teacherId);

    // Validation
    if (!amount || !month) {
      return res.status(400).json({
        success: false,
        message: "Amount and month are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // Find the student
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Find the student's class to check for class-level revenue mode
    const Class = require("../models/Class");
    let studentClass = null;
    if (student.class) {
      studentClass = await Class.findOne({ name: student.class });
      console.log(
        "📚 Student Class:",
        studentClass?.name,
        "| Revenue Mode:",
        studentClass?.revenueMode || "standard",
      );
    }

    // Find the teacher first (to check if they are a Partner/Owner)
    let teacher = null;
    if (teacherId) {
      teacher = await Teacher.findById(teacherId);
    } else if (studentClass?.assignedTeacher) {
      // Try to get teacher from class assignment first
      teacher = await Teacher.findById(studentClass.assignedTeacher);
    } else if (subject) {
      // Fallback: Try to find teacher by subject
      teacher = await Teacher.findOne({
        subject: subject.toLowerCase(),
        status: "active",
      });
    }

    // REVENUE MODE DETECTION:
    // Priority 1: Class-level revenueMode (if set to 'partner' → 100%)
    // Priority 2: Partner Exception (if partner100Rule is ON and teacher is Waqar/Zahid/Saud → 100%)
    // Priority 3: Normal split from configuration

    const partnerNames = ["waqar", "zahid", "saud"];
    const isPartnerTeacher =
      teacher &&
      partnerNames.some((name) => teacher.name?.toLowerCase().includes(name));

    // Check class-level revenue mode
    const isClassPartnerMode = studentClass?.revenueMode === "partner";

    // Get the configuration (including partner100Rule)
    const config = await Configuration.findOne();
    const partner100RuleEnabled = config?.partner100Rule ?? true; // Default ON

    // Get the salary split configuration
    let teacherPercentage = 70;
    let academyPercentage = 30;
    let revenueSource = "configuration"; // For logging

    if (isClassPartnerMode) {
      // Class-level Partner Mode: 100% goes to the teacher
      teacherPercentage = 100;
      academyPercentage = 0;
      revenueSource = "class-partner-mode";
      console.log(
        `📚 CLASS PARTNER MODE: ${studentClass.name} → 100% revenue to ${teacher?.name || "assigned teacher"}`,
      );
    } else if (isPartnerTeacher && partner100RuleEnabled) {
      // Partner Exception by name: 100% goes to the teacher/partner (only if rule is ON)
      teacherPercentage = 100;
      academyPercentage = 0;
      revenueSource = "partner-100-rule";
      console.log(
        `👑 PARTNER 100% RULE: ${teacher.name} → Applying 100% revenue (rule enabled in config)`,
      );
    } else if (isPartnerTeacher && !partner100RuleEnabled) {
      // Partner exists but 100% rule is OFF - use normal split
      if (config && config.salaryConfig) {
        teacherPercentage = config.salaryConfig.teacherShare || 70;
        academyPercentage = config.salaryConfig.academyShare || 30;
      }
      revenueSource = "partner-standard-split";
      console.log(
        `📊 Partner ${teacher.name} using standard split (100% rule disabled)`,
      );
    } else {
      // Normal teachers: Use configuration split
      if (config && config.salaryConfig) {
        teacherPercentage = config.salaryConfig.teacherShare || 70;
        academyPercentage = config.salaryConfig.academyShare || 30;
      }
      revenueSource = "standard-split";
    }

    console.log(
      `📊 Split (${revenueSource}): Teacher ${teacherPercentage}% | Academy ${academyPercentage}%`,
    );

    // Calculate the split
    const teacherShare = Math.round((amount * teacherPercentage) / 100);
    const academyShare = amount - teacherShare; // Ensure no rounding errors

    console.log(
      `💰 Split: Teacher PKR ${teacherShare} | Academy PKR ${academyShare}`,
    );

    // Create the FeeRecord
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      className: student.class,
      subject: subject || studentClass?.subject || "General",
      amount,
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Staff",
      teacher: teacher?._id,
      teacherName: teacher?.name,
      isPartnerTeacher: isPartnerTeacher || isClassPartnerMode, // Track if 100% revenue
      revenueSource, // Track where revenue rule came from
      splitBreakdown: {
        teacherShare,
        academyShare,
        teacherPercentage,
        academyPercentage,
      },
      paymentMethod: paymentMethod || "CASH",
      notes,
    });

    console.log("✅ FeeRecord created:", feeRecord.receiptNumber);

    // Update Student's paidAmount
    student.paidAmount = (student.paidAmount || 0) + amount;
    await student.save();
    console.log("✅ Student paidAmount updated to:", student.paidAmount);

    // Create Transaction for the ledger (type: INCOME)
    const transaction = await Transaction.create({
      type: "INCOME",
      category: subject === "Chemistry" ? "Chemistry" : "Tuition",
      amount,
      description: `Fee payment: ${student.studentName} - ${month} (${subject || "General"})`,
      collectedBy: req.user?._id,
      status: "FLOATING", // Will be verified when partner closes day
      studentId: student._id,
      date: new Date(),
    });

    console.log("✅ Transaction created:", transaction._id);

    // Update Teacher's floating balance (if teacher found)
    if (teacher) {
      // Find or create User record for teacher (teachers may have linked user accounts)
      // For now, we'll track in a separate way or update Teacher model
      console.log(
        `📤 Teacher ${teacher.name} should receive PKR ${teacherShare} (floating)`,
      );

      // Create notification for teacher
      await Notification.create({
        recipient: teacher._id,
        message: `💸 Student ${student.studentName} paid fees for ${month}. Your share (PKR ${teacherShare.toLocaleString()}) is now in your floating balance.`,
        type: "FINANCE",
        relatedId: feeRecord._id.toString(),
      });

      console.log("✅ Teacher notification created");
    }

    // Update the collector's floating balance (if they are a partner)
    if (req.user && req.user.walletBalance) {
      if (typeof req.user.walletBalance === "object") {
        req.user.walletBalance.floating =
          (req.user.walletBalance.floating || 0) + academyShare;
        await req.user.save();
        console.log("✅ Collector floating balance updated");
      }
    }

    return res.status(201).json({
      success: true,
      message: `✅ Fee collected successfully! Receipt: ${feeRecord.receiptNumber}`,
      data: {
        feeRecord,
        transaction,
        split: {
          total: amount,
          teacherShare,
          academyShare,
          teacherName: teacher?.name || "Not assigned",
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in collectFee:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to collect fee",
      error: error.message,
    });
  }
};

// @desc    Get Fee History for a Student
// @route   GET /api/students/:id/fee-history
// @access  Protected
exports.getFeeHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const feeRecords = await FeeRecord.find({ student: id })
      .sort({ createdAt: -1 })
      .lean();

    const totalPaid = feeRecords.reduce(
      (sum, record) => sum + record.amount,
      0,
    );

    return res.status(200).json({
      success: true,
      count: feeRecords.length,
      totalPaid,
      data: feeRecords,
    });
  } catch (error) {
    console.error("❌ Error fetching fee history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee history",
      error: error.message,
    });
  }
};

// @desc    Track Receipt Print & Generate Unique Receipt ID
// @route   POST /api/students/:id/print
// @access  Protected
exports.trackPrint = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "reprint", printedBy = "System" } = req.body;

    const student = await Student.findById(id).populate("classRef");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Calculate next version number
    const currentPrintCount = student.printHistory?.length || 0;
    const version = currentPrintCount + 1;

    // Generate unique receipt ID: TOKEN-[StudentId]-[Random4Chars]-V[Version]
    const randomChars = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    const receiptId = `TOKEN-${student.studentId}-${randomChars}-V${version}`;

    // Create print record
    const printRecord = {
      receiptId,
      printedAt: new Date(),
      version,
      printedBy,
      reason,
    };

    // Push to print history
    student.printHistory = student.printHistory || [];
    student.printHistory.push(printRecord);
    student.reprintCount = version;

    await student.save();

    console.log(
      `🖨️ Receipt printed for ${student.studentName}: ${receiptId} (Version ${version})`,
    );

    return res.status(200).json({
      success: true,
      message: `Receipt generated (Version ${version})`,
      data: {
        receiptId,
        version,
        isOriginal: version === 1,
        printedAt: printRecord.printedAt,
        student: {
          _id: student._id,
          studentId: student.studentId,
          studentName: student.studentName,
          fatherName: student.fatherName,
          class: student.class,
          group: student.group,
          parentCell: student.parentCell,
          studentCell: student.studentCell,
          totalFee: student.totalFee,
          paidAmount: student.paidAmount,
          feeStatus: student.feeStatus,
          admissionDate: student.admissionDate,
          subjects: student.subjects,
          classRef: student.classRef,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error tracking print:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate receipt",
      error: error.message,
    });
  }
};

// @desc    Find student by Receipt Token (for Gatekeeper)
// @route   GET /api/students/by-token/:token
// @access  Public (Gate Scanner)
exports.findByToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Try to find student by receipt token in printHistory
    const student = await Student.findOne({
      "printHistory.receiptId": token,
    }).populate("classRef");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Invalid token - No student found",
      });
    }

    // Find which receipt was used
    const usedReceipt = student.printHistory.find((p) => p.receiptId === token);

    return res.status(200).json({
      success: true,
      data: {
        student,
        usedReceipt,
      },
    });
  } catch (error) {
    console.error("❌ Error finding by token:", error);
    return res.status(500).json({
      success: false,
      message: "Token lookup failed",
      error: error.message,
    });
  }
};
