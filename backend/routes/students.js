const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const { protect } = require("../middleware/authMiddleware");
const { handlePhotoUpload } = require("../middleware/upload");
const {
  collectFee,
  getFeeHistory,
  trackPrint,
  findByToken,
} = require("../controllers/studentController");

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
    const { class: className, group, status, search, sessionRef } = req.query;

    // Build query object
    let query = {};

    if (className && className !== "all") {
      // Support partial class name matching (e.g., "9th" matches "9th Grade - Medical")
      query.class = { $regex: className, $options: "i" };
    }

    if (group && group !== "all") {
      query.group = group;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: "i" } },
        { fatherName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    // TASK 4: Peshawar Session Filter
    if (sessionRef && sessionRef !== "all") {
      query.sessionRef = sessionRef;
    }

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
// @desc    Create a new student
// @access  Public
router.post("/", async (req, res) => {
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

    // ✨ TASK 3: CONTROLLER SAFETY - Never let frontend send studentId
    // Delete it from the request to let the pre-save hook handle it
    if (sanitizedData.studentId !== undefined) {
      delete sanitizedData.studentId;
      console.log("🔧 Removed studentId from request (will be auto-generated)");
    }

    // ✨ SYSTEM BRIDGE: Auto-generate login credentials for direct admissions
    // Password formula: first 4 chars of name (lowercase) + last 4 digits of phone
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

    // Default to Active status for direct admissions (not pending approval)
    if (!sanitizedData.studentStatus) {
      sanitizedData.studentStatus = "Active";
    }

    console.log("\n✅ Sanitized Data:", JSON.stringify(sanitizedData, null, 2));

    const newStudent = new Student(sanitizedData);
    console.log("✅ Student instance created, attempting to save...");

    const savedStudent = await newStudent.save();
    console.log(
      "✅ Student saved successfully with ID:",
      savedStudent.studentId,
    );
    console.log("✅ Fee Status:", savedStudent.feeStatus);

    // Include credentials in response for admin display
    const responseData = savedStudent.toObject();
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

    // Never allow frontend to override studentId
    delete updateData.studentId;
    delete updateData._id;

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
// @desc    Delete a student
// @access  Public
router.delete("/:id", async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);

    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully",
      data: deletedStudent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting student",
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
