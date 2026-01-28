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
        { new: true },
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
        const totalFee = student.subjects.reduce(
          (sum, s) => sum + (s.fee || 0),
          0,
        );
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
      const totalFee = student.subjects.reduce(
        (sum, s) => sum + (s.fee || 0),
        0,
      );
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

// ========================================
// SMART FEE LOGIC: Revenue Split Calculator
// ========================================
// Hierarchical decision tree for fee splits based on Waqar Business Rules:
// Check 1: ETEA/MDCAT Classes → English: 100% ACADEMY, Others: 100% ACADEMY + 3000 Teacher Ledger
// Check 2: Partner Subjects → 100% to respective partner stream
// Check 3: Staff Tuition → 70/30 split (Teacher/Academy)
// ========================================

const calculateRevenueSplit = async (params) => {
  const { student, studentClass, teacher, subject, amount, config } = params;

  const subjectLower = (subject || "").toLowerCase();
  const teacherNameLower = teacher?.name?.toLowerCase() || "";
  const classSessionType = studentClass?.sessionType?.toLowerCase() || "";
  const gradeLevel = studentClass?.gradeLevel?.toLowerCase() || "";

  // Result object
  const result = {
    transactionStream: "STAFF_TUITION",
    transactionStatus: "FLOATING",
    teacherShare: 0,
    academyShare: amount,
    teacherPercentage: 0,
    academyPercentage: 100,
    revenueSource: "default",
    createTeacherLedger: false,
    teacherLedgerAmount: 0,
    isPartnerSubject: false,
    partnerKey: null,
  };

  // ========================================
  // CHECK 1: Is it an ETEA/MDCAT Class?
  // ========================================
  const isETEAClass =
    classSessionType.includes("etea") ||
    classSessionType.includes("mdcat") ||
    gradeLevel.includes("mdcat") ||
    gradeLevel.includes("ecat") ||
    subjectLower.includes("etea") ||
    subjectLower.includes("mdcat");

  if (isETEAClass) {
    result.transactionStream = "ACADEMY_POOL";
    result.transactionStatus = "VERIFIED"; // ETEA goes directly to academy
    result.teacherShare = 0;
    result.academyShare = amount;
    result.teacherPercentage = 0;
    result.academyPercentage = 100;
    result.revenueSource = "etea-class";

    // Check if English subject (teacher gets 0, fixed salary via payroll later)
    const isEnglishSubject =
      subjectLower.includes("english") ||
      teacher?.subject?.toLowerCase() === "english";

    if (!isEnglishSubject && teacher) {
      // Non-English ETEA: Teacher gets +3000 PKR to their pending balance (ledger entry)
      result.createTeacherLedger = true;
      result.teacherLedgerAmount = 3000; // Fixed 3000 PKR per student for ETEA teachers
    }

    console.log(
      `📚 ETEA/MDCAT CLASS: ${isEnglishSubject ? "English (0 commission)" : `Other (+${result.teacherLedgerAmount} PKR ledger)`}`,
    );
    return result;
  }

  // ========================================
  // CHECK 2: Is it a Partner Subject? (100% Rule)
  // ========================================
  // Chemistry (Waqar) → 100% OWNER_CHEMISTRY, VERIFIED
  // Physics (Saud) → 100% PARTNER_PHYSICS, FLOATING
  // Zoology/Biology (Zahid) → 100% PARTNER_BIO, FLOATING

  // Check for Chemistry/Waqar
  const isChemistryWaqar =
    subjectLower.includes("chemistry") || teacherNameLower.includes("waqar");

  if (isChemistryWaqar) {
    result.transactionStream = "OWNER_CHEMISTRY";
    result.transactionStatus = "VERIFIED"; // Waqar's money is immediately verified
    result.teacherShare = amount;
    result.academyShare = 0;
    result.teacherPercentage = 100;
    result.academyPercentage = 0;
    result.revenueSource = "partner-waqar-chemistry";
    result.isPartnerSubject = true;
    result.partnerKey = "waqar";
    console.log(`🧪 PARTNER CHEMISTRY (Waqar): 100% → VERIFIED`);
    return result;
  }

  // Check for Physics/Saud
  const isPhysicsSaud =
    subjectLower.includes("physics") || teacherNameLower.includes("saud");

  if (isPhysicsSaud) {
    result.transactionStream = "PARTNER_PHYSICS";
    result.transactionStatus = "FLOATING"; // Partners need to close day
    result.teacherShare = amount;
    result.academyShare = 0;
    result.teacherPercentage = 100;
    result.academyPercentage = 0;
    result.revenueSource = "partner-saud-physics";
    result.isPartnerSubject = true;
    result.partnerKey = "saud";
    console.log(`⚛️ PARTNER PHYSICS (Saud): 100% → FLOATING`);
    return result;
  }

  // Check for Zoology/Biology/Zahid
  const isBioZahid =
    subjectLower.includes("biology") ||
    subjectLower.includes("zoology") ||
    subjectLower.includes("bio") ||
    teacherNameLower.includes("zahid");

  if (isBioZahid) {
    result.transactionStream = "PARTNER_BIO";
    result.transactionStatus = "FLOATING"; // Partners need to close day
    result.teacherShare = amount;
    result.academyShare = 0;
    result.teacherPercentage = 100;
    result.academyPercentage = 0;
    result.revenueSource = "partner-zahid-bio";
    result.isPartnerSubject = true;
    result.partnerKey = "zahid";
    console.log(`🧬 PARTNER BIO (Zahid): 100% → FLOATING`);
    return result;
  }

  // ========================================
  // CHECK 3: Staff Tuition (70/30 Rule)
  // ========================================
  // 70% credited to Teacher's Ledger (verified)
  // 30% credited to UNALLOCATED_POOL

  const teacherPercent = config?.salaryConfig?.teacherShare || 70;
  const academyPercent = config?.salaryConfig?.academyShare || 30;

  result.transactionStream = "STAFF_TUITION";
  result.transactionStatus = "FLOATING";
  result.teacherShare = Math.round((amount * teacherPercent) / 100);
  result.academyShare = amount - result.teacherShare; // Remainder to academy
  result.teacherPercentage = teacherPercent;
  result.academyPercentage = academyPercent;
  result.revenueSource = "staff-tuition-split";

  console.log(
    `👨‍🏫 STAFF TUITION: ${teacherPercent}/${academyPercent} split → Teacher: ${result.teacherShare} | Pool: ${result.academyShare}`,
  );

  return result;
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
    console.log("Subject:", subject);
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

    // Find the student's class with populated teacher
    let studentClass = null;
    if (student.classRef) {
      studentClass = await Class.findById(student.classRef).populate(
        "assignedTeacher",
      );
    } else if (student.class) {
      studentClass = await Class.findOne({
        $or: [{ classTitle: student.class }, { displayName: student.class }],
      }).populate("assignedTeacher");
    }
    console.log(
      "📚 Student Class:",
      studentClass?.classTitle || studentClass?.displayName,
      "| Session Type:",
      studentClass?.sessionType || "standard",
    );

    // Find the teacher
    let teacher = null;
    if (teacherId) {
      teacher = await Teacher.findById(teacherId);
    } else if (studentClass?.assignedTeacher) {
      teacher = studentClass.assignedTeacher;
    } else if (subject) {
      // Fallback: Try to find teacher by subject
      teacher = await Teacher.findOne({
        subject: subject.toLowerCase(),
        status: "active",
      });
    }

    // Get the configuration
    const config = await Configuration.findOne();

    // ========================================
    // SMART FEE LOGIC: Calculate Revenue Split
    // ========================================
    const splitResult = await calculateRevenueSplit({
      student,
      studentClass,
      teacher,
      subject,
      amount,
      config,
    });

    console.log(`\n📊 SPLIT RESULT:`, JSON.stringify(splitResult, null, 2));

    // Create the FeeRecord
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      className: student.class,
      subject: subject || studentClass?.subjects?.[0]?.name || "General",
      amount,
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Staff",
      teacher: teacher?._id,
      teacherName: teacher?.name,
      isPartnerTeacher: splitResult.isPartnerSubject,
      revenueSource: splitResult.revenueSource,
      splitBreakdown: {
        teacherShare: splitResult.teacherShare,
        academyShare: splitResult.academyShare,
        teacherPercentage: splitResult.teacherPercentage,
        academyPercentage: splitResult.academyPercentage,
      },
      paymentMethod: paymentMethod || "CASH",
      notes,
    });

    console.log("✅ FeeRecord created:", feeRecord.receiptNumber);

    // Update Student's paidAmount
    student.paidAmount = (student.paidAmount || 0) + amount;
    await student.save();
    console.log("✅ Student paidAmount updated to:", student.paidAmount);

    // Create main Transaction for the ledger
    const transaction = await Transaction.create({
      type: "INCOME",
      category: splitResult.isPartnerSubject ? "Chemistry" : "Tuition",
      stream: splitResult.transactionStream,
      amount,
      description: `Fee payment: ${student.studentName} - ${month} (${subject || "General"})`,
      collectedBy: req.user?._id,
      status: splitResult.transactionStatus,
      studentId: student._id,
      splitDetails: {
        teacherShare: splitResult.teacherShare,
        academyShare: splitResult.academyShare,
        teacherPercentage: splitResult.teacherPercentage,
        academyPercentage: splitResult.academyPercentage,
        teacherId: teacher?._id,
        teacherName: teacher?.name,
        isPaid: false,
      },
      date: new Date(),
    });

    console.log(
      `✅ Transaction created: ${transaction._id} | Stream: ${splitResult.transactionStream} | Status: ${splitResult.transactionStatus}`,
    );

    // ========================================
    // ETEA Teacher Ledger Entry (3000 PKR per student)
    // ========================================
    if (splitResult.createTeacherLedger && teacher) {
      // Create a separate ledger entry for teacher's ETEA bonus
      await Transaction.create({
        type: "INCOME",
        category: "Tuition",
        stream: "TEACHER_LEDGER",
        amount: splitResult.teacherLedgerAmount,
        description: `ETEA Bonus: ${student.studentName} - ${month} (+${splitResult.teacherLedgerAmount} PKR)`,
        collectedBy: req.user?._id,
        status: "VERIFIED", // Teacher's ledger entry is immediately verified
        studentId: student._id,
        splitDetails: {
          teacherShare: splitResult.teacherLedgerAmount,
          academyShare: 0,
          teacherPercentage: 100,
          academyPercentage: 0,
          teacherId: teacher._id,
          teacherName: teacher.name,
          isPaid: false, // Pending payout
        },
        date: new Date(),
      });

      // Update teacher's pending balance
      if (!teacher.balance) {
        teacher.balance = { floating: 0, verified: 0 };
      }
      teacher.balance.verified =
        (teacher.balance.verified || 0) + splitResult.teacherLedgerAmount;
      await teacher.save();

      console.log(
        `📚 ETEA Teacher Ledger: ${teacher.name} +${splitResult.teacherLedgerAmount} PKR`,
      );

      // Notify teacher
      await Notification.create({
        recipient: teacher._id,
        message: `📚 ETEA Bonus: Student ${student.studentName} enrolled. +PKR ${splitResult.teacherLedgerAmount.toLocaleString()} added to your verified balance.`,
        type: "FINANCE",
        relatedId: feeRecord._id.toString(),
      });
    }

    // ========================================
    // Staff Tuition: Create UNALLOCATED_POOL entry for 30%
    // ========================================
    if (
      splitResult.revenueSource === "staff-tuition-split" &&
      splitResult.academyShare > 0
    ) {
      await Transaction.create({
        type: "INCOME",
        category: "Pool",
        stream: "UNALLOCATED_POOL",
        amount: splitResult.academyShare,
        description: `Academy Share (${splitResult.academyPercentage}%): ${student.studentName} - ${month}`,
        collectedBy: req.user?._id,
        status: "VERIFIED",
        studentId: student._id,
        isDistributed: false, // Will be distributed to partners later
        date: new Date(),
      });

      console.log(
        `🏦 UNALLOCATED_POOL: +${splitResult.academyShare} PKR (30% academy share)`,
      );
    }

    // Update Teacher's floating balance (for non-ETEA subjects)
    if (
      teacher &&
      splitResult.teacherShare > 0 &&
      !splitResult.createTeacherLedger
    ) {
      if (!teacher.balance) {
        teacher.balance = { floating: 0, verified: 0 };
      }
      teacher.balance.floating =
        (teacher.balance.floating || 0) + splitResult.teacherShare;
      await teacher.save();
      console.log(
        `📤 Teacher ${teacher.name} floating balance: PKR ${teacher.balance.floating}`,
      );

      // Create notification for teacher
      await Notification.create({
        recipient: teacher._id,
        message: `💸 Student ${student.studentName} paid fees for ${month}. Your share (PKR ${splitResult.teacherShare.toLocaleString()}) is now in your floating balance.`,
        type: "FINANCE",
        relatedId: feeRecord._id.toString(),
      });

      console.log("✅ Teacher notification created");
    }

    // Update the collector's floating balance (if they are a partner)
    if (req.user && req.user.walletBalance && splitResult.academyShare > 0) {
      if (typeof req.user.walletBalance === "object") {
        req.user.walletBalance.floating =
          (req.user.walletBalance.floating || 0) + splitResult.academyShare;
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
          teacherShare: splitResult.teacherShare,
          academyShare: splitResult.academyShare,
          teacherName: teacher?.name || "Not assigned",
          stream: splitResult.transactionStream,
          revenueSource: splitResult.revenueSource,
          eteaBonus: splitResult.createTeacherLedger
            ? splitResult.teacherLedgerAmount
            : 0,
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
