const Student = require("../models/Student");
const Video = require("../models/Video");

/**
 * Student Portal Controller - LMS Module
 *
 * Handles student login and portal access.
 */

// @desc    Student login
// @route   POST /api/student-portal/login
// @access  Public
exports.studentLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username and password",
      });
    }

    // Find student by barcodeId or studentId (include password field)
    const student = await Student.findOne({
      $or: [
        { barcodeId: username },
        { studentId: username },
        { email: username.toLowerCase() },
      ],
    }).select("+password");

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Only Active students can log in
    if (student.studentStatus !== "Active") {
      return res.status(403).json({
        success: false,
        message:
          "Account is pending approval. Please visit the administration office to receive your credentials.",
      });
    }

    // Check password
    if (!student.password) {
      return res.status(401).json({
        success: false,
        message: "Password not set. Contact administration.",
      });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token for student session
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        id: student._id,
        role: "student",
        studentId: student.studentId,
        barcodeId: student.barcodeId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Set cookie
    res.cookie("studentToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(
      `🎓 Student login: ${student.studentName} (${student.barcodeId})`,
    );

    return res.status(200).json({
      success: true,
      message: `Welcome, ${student.studentName}!`,
      student: student.getStudentProfile(),
      token,
    });
  } catch (error) {
    console.error("❌ Error in studentLogin:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Get current student profile
// @route   GET /api/student-portal/me
// @access  Protected (Student)
exports.getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id)
      .populate("classRef", "name subjects")
      .populate("sessionRef", "name startDate endDate")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: student._id,
        studentId: student.studentId,
        barcodeId: student.barcodeId,
        name: student.studentName,
        fatherName: student.fatherName,
        class: student.class,
        group: student.group,
        subjects: student.subjects,
        photo: student.photo,
        email: student.email,
        feeStatus: student.feeStatus,
        totalFee: student.totalFee,
        paidAmount: student.paidAmount,
        balance: Math.max(0, student.totalFee - student.paidAmount),
        session: student.sessionRef,
        studentStatus: student.studentStatus,
      },
    });
  } catch (error) {
    console.error("❌ Error in getStudentProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile",
      error: error.message,
    });
  }
};

// @desc    Get videos for student's class
// @route   GET /api/student-portal/videos
// @access  Protected (Student)
exports.getStudentVideos = async (req, res) => {
  try {
    const student = await Student.findById(req.student._id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get videos for student's class
    const query = {
      isPublished: true,
    };

    if (student.classRef) {
      query.classRef = student.classRef;
    } else {
      query.className = student.class;
    }

    // Optional subject filter
    if (req.query.subject) {
      query.subjectName = req.query.subject;
    }

    const videos = await Video.find(query)
      .sort({ sortOrder: 1, uploadedAt: -1 })
      .lean();

    // Group by subject
    const videosBySubject = {};
    videos.forEach((video) => {
      const subject = video.subjectName || "General";
      if (!videosBySubject[subject]) {
        videosBySubject[subject] = [];
      }
      videosBySubject[subject].push(video);
    });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos,
      bySubject: videosBySubject,
    });
  } catch (error) {
    console.error("❌ Error in getStudentVideos:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching videos",
      error: error.message,
    });
  }
};

// @desc    Increment video view count
// @route   POST /api/student-portal/videos/:id/view
// @access  Protected (Student)
exports.recordVideoView = async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, {
      $inc: { viewCount: 1 },
    });

    return res.status(200).json({
      success: true,
      message: "View recorded",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error recording view",
    });
  }
};

// @desc    Student logout
// @route   POST /api/student-portal/logout
// @access  Protected (Student)
exports.studentLogout = async (req, res) => {
  res.cookie("studentToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
