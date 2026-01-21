const Student = require("../models/Student");
const Class = require("../models/Class");
const Session = require("../models/Session");

/**
 * Public Registration Controller
 *
 * Handles public student registration (no login required)
 * and pending approval management.
 */

/**
 * Generate a purely numeric Student ID for barcode scanner compatibility
 * Format: 260001, 260002, 260003, ...
 * Starts at 260001 if no students exist
 */
const generateNumericStudentId = async () => {
  // Find the highest existing numeric ID
  const lastStudent = await Student.findOne({
    barcodeId: { $exists: true, $ne: null, $regex: /^\d+$/ },
  })
    .sort({ barcodeId: -1 })
    .select("barcodeId")
    .lean();

  if (lastStudent && lastStudent.barcodeId) {
    const lastId = parseInt(lastStudent.barcodeId, 10);
    if (!isNaN(lastId)) {
      return String(lastId + 1);
    }
  }

  // Start at 260001 if no numeric IDs exist
  return "260001";
};

// @desc    Public student registration
// @route   POST /api/public/register
// @access  Public (No Login Required)
exports.publicRegister = async (req, res) => {
  try {
    const {
      studentName,
      fatherName,
      cnic,
      parentCell,
      studentCell,
      email,
      address,
      class: classId,
      group,
      subjects,
    } = req.body;

    // Validation (group is now optional)
    if (!studentName || !fatherName || !parentCell || !classId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: studentName, fatherName, parentCell, class",
      });
    }

    // Check for duplicate registration by phone
    const existingStudent = await Student.findOne({
      parentCell,
      studentStatus: { $in: ["Active", "Pending"] },
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "A registration with this phone number already exists",
        existingStudentId: existingStudent.studentId,
      });
    }

    // Find the class by ID (frontend sends _id)
    const classDoc = await Class.findById(classId).lean();
    let totalFee = 0;
    let classRef = null;
    let className = "";
    let subjectsWithFees = [];

    if (!classDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid class selection",
      });
    }

    classRef = classDoc._id;
    className = classDoc.classTitle || classDoc.name || "Unassigned";

    if (classDoc) {
      // Calculate total fee from selected subjects
      if (subjects && subjects.length > 0) {
        subjectsWithFees = subjects.map((subName) => {
          const classSubject = classDoc.subjects?.find(
            (s) => (typeof s === "string" ? s : s.name) === subName,
          );
          const fee = classSubject?.fee || classDoc.baseFee || 0;
          return { name: subName, fee };
        });
        totalFee = subjectsWithFees.reduce((sum, s) => sum + s.fee, 0);
      } else {
        // Use base fee if no subjects selected
        totalFee = classDoc.baseFee || 0;
      }
    }

    // Get active session
    const activeSession = await Session.findOne({ isActive: true }).lean();

    // Create student with Pending status (NO PASSWORD YET - Generated on approval)
    const student = await Student.create({
      studentName,
      fatherName,
      cnic,
      parentCell,
      studentCell,
      email,
      address,
      class: className,
      group: group || "General", // Default to "General" if not provided
      subjects: subjectsWithFees,
      totalFee,
      paidAmount: 0,
      feeStatus: "pending",
      studentStatus: "Pending", // Key: Pending approval
      status: "inactive", // Not active until approved
      password: undefined, // NO PASSWORD - Admin generates on approval
      classRef,
      sessionRef: activeSession?._id,
    });

    console.log(
      `📝 New public registration: ${studentName} (Pending approval)`,
    );

    return res.status(201).json({
      success: true,
      message:
        "Application submitted successfully! Please visit the administration office for verification.",
      data: {
        applicationId: student.studentId,
        studentName: student.studentName,
        class: student.class,
        status: student.studentStatus,
        submittedAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error in publicRegister:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// @desc    Get all pending registrations
// @route   GET /api/public/pending
// @access  Protected (OWNER, OPERATOR)
exports.getPendingRegistrations = async (req, res) => {
  try {
    const pendingStudents = await Student.find({ studentStatus: "Pending" })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: pendingStudents.length,
      data: pendingStudents,
    });
  } catch (error) {
    console.error("❌ Error in getPendingRegistrations:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching pending registrations",
      error: error.message,
    });
  }
};

// @desc    Approve a pending registration
// @route   POST /api/public/approve/:id
// @access  Protected (OWNER, OPERATOR)
exports.approveRegistration = async (req, res) => {
  try {
    const { classId } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.studentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Student is already ${student.studentStatus}`,
      });
    }

    // If classId provided, update the student's class assignment
    if (classId) {
      const classDoc = await require("../models/Class").findById(classId);
      if (classDoc) {
        student.classRef = classDoc._id;
        student.class = classDoc.classTitle || classDoc.name;
      }
    }

    // Generate numeric barcode ID (for barcode scanner compatibility)
    const numericId = await generateNumericStudentId();
    student.barcodeId = numericId;
    student.studentId = numericId; // Also set studentId to numeric for consistency

    // Generate a default password (last 4 digits of phone + first 4 of name)
    const phoneDigits = student.parentCell.replace(/\D/g, "").slice(-4);
    const namePart = student.studentName
      .replace(/\s/g, "")
      .toLowerCase()
      .slice(0, 4);
    const defaultPassword = `${namePart}${phoneDigits}`;

    // Update student
    student.studentStatus = "Active";
    student.status = "active";
    student.password = defaultPassword;
    student.plainPassword = defaultPassword; // Store readable version for Front Desk display

    await student.save();

    console.log(
      `✅ Approved: ${student.studentName} (Barcode: ${student.barcodeId})`,
    );

    // Log credentials for admin (NOT sent to student yet)
    console.log(`🔑 [CREDENTIALS GENERATED]`);
    console.log(`   Student: ${student.studentName}`);
    console.log(`   Login ID: ${student.barcodeId}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`   ⚠️  Admin must share these credentials with the student`);

    return res.status(200).json({
      success: true,
      message: `✅ ${student.studentName} approved successfully!`,
      data: {
        studentId: student.studentId,
        barcodeId: student.barcodeId,
        studentName: student.studentName,
        fatherName: student.fatherName,
        parentCell: student.parentCell,
        status: student.studentStatus,
        credentials: {
          username: student.barcodeId,
          password: defaultPassword,
          note: "ADMIN: Share these credentials with the student",
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in approveRegistration:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during approval",
      error: error.message,
    });
  }
};

// @desc    Reject a pending registration
// @route   DELETE /api/public/reject/:id
// @access  Protected (OWNER, OPERATOR)
exports.rejectRegistration = async (req, res) => {
  try {
    const { reason } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.studentStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject - student is ${student.studentStatus}`,
      });
    }

    const studentName = student.studentName;
    await Student.deleteOne({ _id: req.params.id });

    console.log(
      `❌ Rejected: ${studentName} (Reason: ${reason || "Not specified"})`,
    );

    return res.status(200).json({
      success: true,
      message: `Registration for ${studentName} has been rejected`,
      reason: reason || "Not specified",
    });
  } catch (error) {
    console.error("❌ Error in rejectRegistration:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during rejection",
      error: error.message,
    });
  }
};

// @desc    Get pending count (for sidebar badge)
// @route   GET /api/public/pending-count
// @access  Protected
exports.getPendingCount = async (req, res) => {
  try {
    const count = await Student.countDocuments({ studentStatus: "Pending" });
    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      count: 0,
    });
  }
};

// @desc    Get next available numeric Student ID
// @route   GET /api/public/next-id
// @access  Protected (OWNER, OPERATOR)
exports.getNextStudentId = async (req, res) => {
  try {
    const nextId = await generateNumericStudentId();
    return res.status(200).json({
      success: true,
      nextId,
    });
  } catch (error) {
    console.error("❌ Error getting next ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating next ID",
      nextId: "260001", // Fallback
    });
  }
};

// @desc    Update student credentials (ID and/or Password)
// @route   PATCH /api/public/update-credentials/:id
// @access  Protected (OWNER, OPERATOR)
exports.updateStudentCredentials = async (req, res) => {
  try {
    const { studentId, password } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Validate numeric ID if provided
    if (studentId) {
      if (!/^\d+$/.test(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Student ID must be numeric only",
        });
      }

      // Check if ID already exists
      const existingStudent = await Student.findOne({
        $or: [{ studentId }, { barcodeId: studentId }],
        _id: { $ne: student._id },
      });

      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: "This Student ID is already in use",
        });
      }

      student.studentId = studentId;
      student.barcodeId = studentId;
    }

    // Update password if provided
    if (password) {
      student.password = password; // Will be hashed by pre-save hook
      student.plainPassword = password; // Store readable version for Front Desk display
    }

    await student.save();

    // Fetch the updated student without password for response
    const updatedStudent = await Student.findById(student._id).lean();

    console.log(`✏️ Updated credentials for: ${student.studentName}`);

    return res.status(200).json({
      success: true,
      message: "Credentials updated successfully",
      data: updatedStudent,
      // Also include plain password for display (only this one time)
      newPassword: password || null,
    });
  } catch (error) {
    console.error("❌ Error updating credentials:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating credentials",
      error: error.message,
    });
  }
};
