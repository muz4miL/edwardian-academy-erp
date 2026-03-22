const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Timetable = require("../models/Timetable");
const Class = require("../models/Class");
const FeeRecord = require("../models/FeeRecord");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Configuration = require("../models/Configuration");
const Teacher = require("../models/Teacher");
const DailyRevenue = require("../models/DailyRevenue");
const { protect } = require("../middleware/authMiddleware");
const { handlePhotoUpload } = require("../middleware/upload");
const {
  collectFee,
  getFeeHistory,
  trackPrint,
  findByToken,
} = require("../controllers/studentController");
const { createWithdrawalAdjustments } = require("../helpers/revenueEngine");

// Internal helper to reuse collectFee split engine for admission initial payment.
const runCollectFeeInternal = ({ studentId, amount, month, user }) =>
  new Promise((resolve, reject) => {
    const mockReq = {
      params: { id: studentId },
      body: {
        amount,
        month,
        paymentMethod: "CASH",
        notes: "Admission payment",
      },
      user,
    };

    const mockRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode >= 400) {
          reject(new Error(payload?.message || "collectFee failed"));
          return;
        }
        resolve(payload);
      },
    };

    collectFee(mockReq, mockRes);
  });

// ========================================
// FEE COLLECTION ROUTES (Module 2)
// ========================================

// @route   POST /api/students/:id/collect-fee
// @desc    Collect fee from a student with auto-split
// @access  Protected (Staff/Admin)
router.post("/:id/collect-fee", protect, collectFee);

// @route   GET /api/students/:id/fee-history
// @desc    Get fee payment history for a student
// @access  Protected
router.get("/:id/fee-history", protect, getFeeHistory);

// ========================================
// RECEIPT PRINTING & BARCODE ROUTES
// ========================================

// @route   POST /api/students/:id/print
// @desc    Generate unique receipt ID and track print
// @access  Protected
router.post("/:id/print", protect, trackPrint);

// @route   GET /api/students/by-token/:token
// @desc    Find student by receipt token (for Gate Scanner)
// @access  Public (Gate needs fast access)
router.get("/by-token/:token", findByToken);

// ========================================
// PHOTO UPLOAD ROUTES (System Bridge)
// ========================================

// @route   POST /api/students/:id/upload-photo
// @desc    Upload student photo
// @access  Protected (Staff/Admin)
router.post("/:id/upload-photo", protect, handlePhotoUpload, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No photo file provided",
      });
    }

    // Store relative path for imageUrl
    const imageUrl = `/uploads/students/${req.file.filename}`;
    student.imageUrl = imageUrl;
    await student.save();

    console.log(`📸 Photo uploaded for student ${student.studentId}: ${imageUrl}`);

    res.json({
      success: true,
      message: "Photo uploaded successfully",
      data: {
        studentId: student.studentId,
        imageUrl: student.imageUrl,
      },
    });
  } catch (error) {
    console.error("❌ Error uploading photo:", error.message);
    res.status(500).json({
      success: false,
      message: "Error uploading photo",
      error: error.message,
    });
  }
});

// @route   GET /api/students/:id/placeholder-avatar
// @desc    Generate SVG placeholder avatar with initials
// @access  Public
router.get("/:id/placeholder-avatar", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("studentName");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Generate initials from student name
    const nameParts = student.studentName.trim().split(" ");
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0].slice(0, 2).toUpperCase();

    // Generate a consistent color based on the name
    const hash = student.studentName.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash % 360);

    // Generate SVG
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <rect width="300" height="300" fill="hsl(${hue}, 60%, 45%)"/>
        <text x="150" y="150" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
      </svg>
    `.trim();

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(svg);
  } catch (error) {
    console.error("❌ Error generating placeholder:", error.message);
    res.status(500).json({
      success: false,
      message: "Error generating placeholder avatar",
      error: error.message,
    });
  }
});

// ========================================
// EXISTING STUDENT CRUD ROUTES
// ========================================

// @route   GET /api/students
// @desc    Get all students
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { class: className, group, status, search, sessionRef, time, teacher, feeStatus } = req.query;

    // Build query using $and array for clean composability
    const conditions = [];

    if (className && className !== "all") {
      conditions.push({ class: { $regex: className, $options: "i" } });
    }

    if (group && group !== "all") {
      conditions.push({ group });
    }

    if (status) {
      conditions.push({ status });
    }

    if (feeStatus && feeStatus !== "all") {
      conditions.push({ feeStatus });
    }

    if (search) {
      conditions.push({
        $or: [
          { studentName: { $regex: search, $options: "i" } },
          { fatherName: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (sessionRef && sessionRef !== "all") {
      conditions.push({ sessionRef });
    }

    // Time-based filter: Find students whose classes have timetable entries at this time
    if (time && time !== "all") {
      const timetableEntries = await Timetable.find({
        startTime: time,
        status: "active",
      });

      if (timetableEntries.length === 0) {
        return res.json({ success: true, count: 0, data: [] });
      }

      const classIds = [...new Set(timetableEntries.map((t) => t.classId))];
      const matchingClasses = await Class.find({ _id: { $in: classIds } });
      const classNames = matchingClasses.map((c) => c.classTitle);

      conditions.push({
        $or: [
          { class: { $in: classNames } },
          { classRef: { $in: classIds } },
        ],
      });
    }

    // Teacher filter: Find students who take the subject this teacher teaches, in classes where this teacher is assigned
    if (teacher && teacher !== "all") {
      const teacherDoc = await Teacher.findById(teacher).select("subject");
      const teacherClasses = await Class.find({
        "subjectTeachers.teacherId": teacher,
      });

      if (teacherClasses.length === 0) {
        return res.json({ success: true, count: 0, data: [] });
      }

      const teacherClassIds = teacherClasses.map((c) => c._id);
      const teacherClassNames = teacherClasses.map((c) => c.classTitle);

      const classCondition = {
        $or: [
          { class: { $in: teacherClassNames } },
          { classRef: { $in: teacherClassIds } },
        ],
      };

      // Also filter by the teacher's subject if known
      if (teacherDoc && teacherDoc.subject) {
        conditions.push({
          $and: [
            classCondition,
            { "subjects.name": { $regex: new RegExp(`^${teacherDoc.subject}$`, "i") } },
          ],
        });
      } else {
        conditions.push(classCondition);
      }
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};
    const students = await Student.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
});

// @route   GET /api/students/:id
// @desc    Get single student by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching student",
      error: error.message,
    });
  }
});

// @route   POST /api/students
// @desc    Create a new student with full financial sync
// @access  Protected (Admin/Staff — req.user needed for finance audit trail)
router.post("/", protect, async (req, res) => {
  try {
    console.log("\n📥 FULL REQUEST BODY:", JSON.stringify(req.body, null, 2));

    // ✨ ELASTIC DATA SANITIZATION
    const sanitizedData = { ...req.body };

    // Fix subjects: Convert string to array if needed
    if (typeof sanitizedData.subjects === "string") {
      sanitizedData.subjects = sanitizedData.subjects
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      console.log(
        "🔧 Converted subjects string to array:",
        sanitizedData.subjects,
      );
    }

    // Ensure subjects is an array
    if (!Array.isArray(sanitizedData.subjects)) {
      sanitizedData.subjects = [];
    }

    // Default admissionDate if missing
    if (!sanitizedData.admissionDate) {
      sanitizedData.admissionDate = new Date();
      console.log("🔧 Set default admissionDate:", sanitizedData.admissionDate);
    }

    // Ensure fees are Numbers
    if (sanitizedData.totalFee !== undefined) {
      sanitizedData.totalFee = Number(sanitizedData.totalFee);
      console.log("🔧 Cast totalFee to Number:", sanitizedData.totalFee);
    }
    if (sanitizedData.paidAmount !== undefined) {
      sanitizedData.paidAmount = Number(sanitizedData.paidAmount);
      console.log("🔧 Cast paidAmount to Number:", sanitizedData.paidAmount);
    }
    if (sanitizedData.sessionRate !== undefined) {
      sanitizedData.sessionRate = Number(sanitizedData.sessionRate) || 0;
    }
    if (sanitizedData.discountAmount !== undefined) {
      sanitizedData.discountAmount = Number(sanitizedData.discountAmount) || 0;
    }

    // ✨ CONTROLLER SAFETY - Never let frontend send studentId
    if (sanitizedData.studentId !== undefined) {
      delete sanitizedData.studentId;
      console.log("🔧 Removed studentId from request (will be auto-generated)");
    }

    // ✨ SYSTEM BRIDGE: Auto-generate login credentials for direct admissions
    if (!sanitizedData.password && (sanitizedData.parentCell || sanitizedData.studentCell)) {
      const phone = sanitizedData.parentCell || sanitizedData.studentCell || "";
      const phoneDigits = phone.replace(/\D/g, "").slice(-4);
      const namePart = (sanitizedData.studentName || "user")
        .replace(/\s/g, "")
        .toLowerCase()
        .slice(0, 4);
      const generatedPassword = `${namePart}${phoneDigits}`;
      
      sanitizedData.password = generatedPassword;
      sanitizedData.plainPassword = generatedPassword;
      console.log("🔐 Auto-generated login credentials for student");
    }

    // Default to Active status for direct admissions
    if (!sanitizedData.studentStatus) {
      sanitizedData.studentStatus = "Active";
    }

    // Auto-attach class teacher if missing
    if (sanitizedData.classRef) {
      try {
        const classDoc = await Class.findById(sanitizedData.classRef)
          .select("assignedTeacher teacherName")
          .lean();
        if (classDoc && !sanitizedData.assignedTeacher) {
          sanitizedData.assignedTeacher = classDoc.assignedTeacher;
          sanitizedData.assignedTeacherName = classDoc.teacherName;
        }
      } catch (e) {
        console.log("Class lookup skipped:", e.message);
      }
    }

    // If session rate not provided, try to fetch from config
    if (sanitizedData.sessionRef && !sanitizedData.sessionRate) {
      try {
        const config = await Configuration.findOne().lean();
        const sessionPrice = config?.sessionPrices?.find(
          (sp) => sp.sessionId?.toString() === sanitizedData.sessionRef.toString(),
        );
        if (sessionPrice?.price) {
          sanitizedData.sessionRate = Number(sessionPrice.price) || 0;
        }
      } catch (e) {
        console.log("Session rate lookup skipped:", e.message);
      }
    }

    // Calculate discount if missing and session rate is present
    if (
      sanitizedData.sessionRate &&
      sanitizedData.sessionRate > 0 &&
      (sanitizedData.discountAmount === undefined || sanitizedData.discountAmount === 0)
    ) {
      const netTotal = Number(sanitizedData.totalFee) || 0;
      sanitizedData.discountAmount = Math.max(
        0,
        Number(sanitizedData.sessionRate) - netTotal,
      );
    }

    console.log("\n✅ Sanitized Data:", JSON.stringify(sanitizedData, null, 2));

    // Route through collectFee for initial payment so DailyRevenue/FLOATING splits stay consistent.
    const initialPaidAmount = Number(sanitizedData.paidAmount) || 0;
    sanitizedData.paidAmount = 0;

    const newStudent = new Student(sanitizedData);
    console.log("✅ Student instance created, attempting to save...");

    const savedStudent = await newStudent.save();
    console.log(
      "✅ Student saved successfully with ID:",
      savedStudent.studentId,
    );
    console.log("✅ Fee Status:", savedStudent.feeStatus);

    // =====================================================================
    // FINANCE SYNC: Process admission payment through collectFee split engine
    // =====================================================================
    if (initialPaidAmount > 0) {
      const monthLabel = new Date().toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });

      await runCollectFeeInternal({
        studentId: savedStudent._id.toString(),
        amount: initialPaidAmount,
        month: monthLabel,
        user: req.user,
      });

      console.log("💰 Admission payment processed via collectFee split engine", {
        studentId: savedStudent.studentId,
        amount: initialPaidAmount,
      });
    } else {
      // No payment — still notify owner about the new admission
      try {
        const owner = await User.findOne({ role: "OWNER" });
        if (owner) {
          await Notification.create({
            recipient: owner._id,
            recipientRole: "OWNER",
            message: `📋 NEW ADMISSION: ${savedStudent.studentName} (${savedStudent.studentId}) enrolled in ${savedStudent.class || "N/A"}. Fee: PKR ${(savedStudent.totalFee || 0).toLocaleString()} — Payment pending.`,
            type: "SYSTEM",
            relatedId: savedStudent._id.toString(),
          });
        }
      } catch (notifErr) {
        console.log("Admission notification skipped:", notifErr.message);
      }
    }

    // Include credentials in response for admin display.
    // Re-fetch when initial payment was processed so paidAmount/feeStatus are current.
    const latestStudent =
      initialPaidAmount > 0
        ? await Student.findById(savedStudent._id)
        : savedStudent;
    const responseData = (latestStudent || savedStudent).toObject();
    if (sanitizedData.plainPassword) {
      responseData.credentials = {
        username: savedStudent.studentId,
        password: sanitizedData.plainPassword,
        note: "Share these credentials with the student for portal login",
      };
    }

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Error creating student:", error.message);
    console.error("❌ Full error:", error);

    res.status(400).json({
      success: false,
      message: "Error creating student",
      error: error.message,
    });
  }
});

// @route   PUT /api/students/:id
// @desc    Update a student
// @access  Public
// 🔧 FIX: Use find + save pattern to trigger pre-save hook for feeStatus calculation
router.put("/:id", async (req, res) => {
  try {
    // Step 1: Find the student
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Step 2: Sanitize incoming data
    const updateData = { ...req.body };

    // Ensure fees are Numbers
    if (updateData.totalFee !== undefined) {
      updateData.totalFee = Number(updateData.totalFee);
    }
    if (updateData.paidAmount !== undefined) {
      updateData.paidAmount = Number(updateData.paidAmount);
    }

    // Never allow frontend to override studentId or feeStatus
    delete updateData.studentId;
    delete updateData._id;
    delete updateData.feeStatus; // Pre-save hook auto-calculates this

    console.log("📝 Updating student:", student.studentId);
    console.log("📝 Update data:", JSON.stringify(updateData, null, 2));

    // Step 3: Apply updates using Object.assign
    Object.assign(student, updateData);

    // Step 4: Save (this triggers the pre-save hook!)
    const updatedStudent = await student.save();

    console.log("✅ Student updated:", updatedStudent.studentId);
    console.log("✅ New feeStatus:", updatedStudent.feeStatus);

    res.json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("❌ Error updating student:", error.message);
    res.status(400).json({
      success: false,
      message: "Error updating student",
      error: error.message,
    });
  }
});

// @route   DELETE /api/students/:id
// @desc    Withdraw a student (soft delete) with optional refund
// @access  Public
router.delete("/:id", async (req, res) => {
  try {
    const { refundAmount, refundReason } = req.body || {};

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Already withdrawn?
    if (student.studentStatus === "Withdrawn") {
      return res.status(400).json({
        success: false,
        message: "Student is already withdrawn.",
      });
    }

    const previousStatus = student.studentStatus;
    const refundNum = Number(refundAmount) || 0;

    // Validate refund
    if (refundNum > 0 && refundNum > student.paidAmount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (${refundNum}) cannot exceed amount paid (${student.paidAmount}).`,
      });
    }

    // 1) Soft-delete: set status to Withdrawn
    student.studentStatus = "Withdrawn";
    student.status = "inactive";

    // 2) Process refund if requested
    let refundTransaction = null;
    if (refundNum > 0) {
      // Deduct from student's paid amount
      student.paidAmount = Math.max(0, student.paidAmount - refundNum);

      // Recalculate fee status
      const totalFee = Number(student.totalFee) || 0;
      const paidAmount = Number(student.paidAmount) || 0;
      if (paidAmount >= totalFee && totalFee > 0) {
        student.feeStatus = "paid";
      } else if (paidAmount > 0 && paidAmount < totalFee) {
        student.feeStatus = "partial";
      } else {
        student.feeStatus = "pending";
      }

      // Create REFUND transaction in the finance ledger
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const refundReceiptId = `REF-${student.studentId}-${dateStr}-${randomSuffix}`;

      refundTransaction = await Transaction.create({
        type: "REFUND",
        category: "Refund",
        amount: refundNum,
        description: `Refund to ${student.studentName} (${student.studentId}) — ${refundReason || "Student withdrawn"}. Previous status: ${previousStatus}. Paid before refund: PKR ${(student.paidAmount + refundNum).toLocaleString()}`,
        date: now,
        collectedBy: req.user?._id || undefined,
        status: "VERIFIED",
        studentId: student._id,
      });

      // Mark related FeeRecords as REFUNDED if full refund
      if (refundNum >= (student.paidAmount + refundNum)) {
        // Full refund — mark all fee records
        await FeeRecord.updateMany(
          { student: student._id, status: "PAID" },
          {
            $set: {
              status: "REFUNDED",
              refundAmount: refundNum,
              refundDate: now,
              refundReason: refundReason || "Student withdrawn — full refund",
            },
          }
        );
      } else {
        // Partial refund — record on the latest fee record
        const latestFeeRecord = await FeeRecord.findOne({ student: student._id, status: "PAID" }).sort({ createdAt: -1 });
        if (latestFeeRecord) {
          latestFeeRecord.refundAmount = refundNum;
          latestFeeRecord.refundDate = now;
          latestFeeRecord.refundReason = refundReason || "Student withdrawn — partial refund";
          await latestFeeRecord.save();
        }
      }

      // Deduct refund from collector's totalCash (if applicable)
      if (req.user?._id) {
        try {
          const collector = await User.findById(req.user._id);
          if (collector) {
            collector.totalCash = Math.max(0, (collector.totalCash || 0) - refundNum);
            await collector.save();
          }
        } catch (e) {
          console.log("TotalCash refund deduction skipped:", e.message);
        }
      }

      // Send refund notification
      try {
        const owner = await User.findOne({ role: "OWNER" });
        if (owner) {
          await Notification.create({
            recipient: owner._id,
            recipientRole: "OWNER",
            message: `🔴 REFUND: Student ${student.studentName} (${student.studentId}) withdrawn. Refund of PKR ${refundNum.toLocaleString()} processed. Reason: ${refundReason || "N/A"}`,
            type: "FINANCE",
            relatedId: refundTransaction._id.toString(),
          });
        }
      } catch (notifErr) {
        console.log("Refund notification skipped:", notifErr.message);
      }

      // ── Reverse Owner/Partner revenue entries proportionally ──
      // Query both UNCOLLECTED and COLLECTED entries (owner may have already closed)
      try {
        const studentRevEntries = await DailyRevenue.find({
          studentRef: student._id,
          status: { $in: ["UNCOLLECTED", "COLLECTED"] },
          revenueType: { $in: ["TUITION_SHARE", "ACADEMY_SHARE"] },
          amount: { $gt: 0 },
        }).lean();

        if (studentRevEntries.length > 0) {
          const totalRevenue = studentRevEntries.reduce((s, e) => s + e.amount, 0);
          const refundRatio = Math.min(1, refundNum / (student.paidAmount + refundNum));

          const deductions = [];
          for (const entry of studentRevEntries) {
            const deductAmt = Math.round(entry.amount * refundRatio);
            if (deductAmt > 0) {
              deductions.push({
                userId: entry.partner,
                amount: deductAmt,
                className: entry.className,
                studentName: student.studentName,
                description: `Withdrawal refund reversal: ${student.studentName} — PKR ${refundNum.toLocaleString()} refunded`,
              });

              // Deduct from the correct wallet field based on entry status
              const userToDeduct = await User.findById(entry.partner);
              if (userToDeduct && userToDeduct.walletBalance) {
                if (entry.status === "COLLECTED") {
                  userToDeduct.walletBalance.verified = Math.max(0,
                    (userToDeduct.walletBalance.verified || 0) - deductAmt);
                } else {
                  userToDeduct.walletBalance.floating = Math.max(0,
                    (userToDeduct.walletBalance.floating || 0) - deductAmt);
                }
                await userToDeduct.save();
              }
            }
          }

          if (deductions.length > 0) {
            await createWithdrawalAdjustments(deductions);
          }
        }
      } catch (revErr) {
        console.log("Revenue reversal during withdrawal:", revErr.message);
      }
    } else {
      // No refund — just withdrawal notification
      try {
        const owner = await User.findOne({ role: "OWNER" });
        if (owner) {
          await Notification.create({
            recipient: owner._id,
            recipientRole: "OWNER",
            message: `🔴 WITHDRAWAL: Student ${student.studentName} (${student.studentId}) has been withdrawn. No refund issued. Total paid: PKR ${student.paidAmount.toLocaleString()}`,
            type: "FINANCE",
          });
        }
      } catch (notifErr) {
        console.log("Withdrawal notification skipped:", notifErr.message);
      }
    }

    await student.save();

    res.json({
      success: true,
      message: refundNum > 0
        ? `${student.studentName} withdrawn. Refund of PKR ${refundNum.toLocaleString()} processed.`
        : `${student.studentName} withdrawn successfully. No refund issued.`,
      data: {
        student,
        refundTransaction,
        refundAmount: refundNum,
      },
    });
  } catch (error) {
    console.error("Student Withdrawal Error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing student withdrawal",
      error: error.message,
    });
  }
});

// @route   GET /api/students/stats/overview
// @desc    Get student statistics
// @access  Public
router.get("/stats/overview", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: "active" });
    const preMedical = await Student.countDocuments({ group: "Pre-Medical" });
    const preEngineering = await Student.countDocuments({
      group: "Pre-Engineering",
    });

    res.json({
      success: true,
      data: {
        total: totalStudents,
        active: activeStudents,
        preMedical,
        preEngineering,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
});

module.exports = router;
