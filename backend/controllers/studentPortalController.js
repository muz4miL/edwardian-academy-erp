const Student = require("../models/Student");
const Video = require("../models/Video");
const Lecture = require("../models/Lecture");

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
        classRef: student.classRef,
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

    // Get videos from old Video model
    const videoQuery = {
      isPublished: true,
    };

    if (student.classRef) {
      videoQuery.classRef = student.classRef;
    } else {
      videoQuery.className = student.class;
    }

    // Optional subject filter
    if (req.query.subject) {
      videoQuery.subjectName = req.query.subject;
    }

    const videos = await Video.find(videoQuery)
      .sort({ sortOrder: 1, uploadedAt: -1 })
      .lean();

    // Also get lectures from new Lecture model (YouTube integration)
    let lectures = [];
    if (student.classRef) {
      const lectureQuery = {
        classRef: student.classRef,
        isLocked: false,
      };
      if (req.query.subject) {
        lectureQuery.subject = req.query.subject;
      }

      lectures = await Lecture.find(lectureQuery)
        .populate("teacherRef", "fullName")
        .sort({ order: 1, createdAt: -1 })
        .lean();
    }

    // Transform lectures to match video format
    const transformedLectures = lectures.map((lecture) => ({
      _id: lecture._id,
      title: lecture.title,
      description: lecture.description,
      url: lecture.youtubeUrl,
      thumbnail: `https://img.youtube.com/vi/${lecture.youtubeId}/mqdefault.jpg`,
      provider: "youtube",
      subjectName: lecture.subject,
      teacherName: lecture.teacherRef?.fullName,
      viewCount: lecture.viewCount || 0,
      isLecture: true, // Flag to identify new lecture system
    }));

    // Combine both sources
    const allVideos = [...videos, ...transformedLectures];

    // Group by subject
    const videosBySubject = {};
    allVideos.forEach((video) => {
      const subject = video.subjectName || "General";
      if (!videosBySubject[subject]) {
        videosBySubject[subject] = [];
      }
      videosBySubject[subject].push(video);
    });

    return res.status(200).json({
      success: true,
      count: allVideos.length,
      data: allVideos,
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
    const { id } = req.params;

    // Try Video model first, then Lecture model
    let updated = await Video.findByIdAndUpdate(id, {
      $inc: { viewCount: 1 },
    });

    if (!updated) {
      updated = await Lecture.findByIdAndUpdate(id, {
        $inc: { viewCount: 1 },
      });
    }

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

// @desc    Get student's class schedule/timetable
// @route   GET /api/student-portal/schedule
// @access  Protected (Student)
exports.getStudentSchedule = async (req, res) => {
  try {
    const Class = require("../models/Class");

    const student = await Student.findById(req.student._id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Find the class the student is enrolled in
    let classData = null;

    if (student.classRef) {
      classData = await Class.findById(student.classRef).lean();
    } else if (student.class) {
      // Fallback: Find by classTitle or gradeLevel
      classData = await Class.findOne({
        $or: [
          { classTitle: { $regex: student.class, $options: 'i' } },
          { gradeLevel: { $regex: student.class, $options: 'i' } }
        ],
        status: 'active'
      }).lean();
    }

    if (!classData) {
      return res.status(200).json({
        success: true,
        data: {
          schedule: [],
          className: student.class || "Not Enrolled",
          message: "No schedule found for your class"
        },
      });
    }

    // Format schedule for frontend calendar
    const schedule = (classData.days || []).map(day => ({
      day: day,
      dayFull: {
        'Mon': 'Monday',
        'Tue': 'Tuesday',
        'Wed': 'Wednesday',
        'Thu': 'Thursday',
        'Fri': 'Friday',
        'Sat': 'Saturday',
        'Sun': 'Sunday'
      }[day] || day,
      startTime: classData.startTime,
      endTime: classData.endTime,
      roomNumber: classData.roomNumber || 'TBD',
      subjects: classData.subjects?.map(s => s.name) || [],
      classTitle: classData.classTitle,
      group: classData.group,
      shift: classData.shift
    }));

    // Find next class
    const now = new Date();
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    let nextClass = null;
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentDayIndex = dayOrder.indexOf(currentDay);

    // Look for next class starting from today
    for (let i = 0; i < 7; i++) {
      const checkDayIndex = (currentDayIndex + i) % 7;
      const checkDay = dayOrder[checkDayIndex];

      if (classData.days?.includes(checkDay)) {
        // If it's today, check if the class hasn't started yet
        if (i === 0 && classData.startTime <= currentTime) {
          continue;
        }

        nextClass = {
          day: checkDay,
          dayFull: {
            'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
            'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
          }[checkDay],
          startTime: classData.startTime,
          endTime: classData.endTime,
          roomNumber: classData.roomNumber || 'TBD',
          isToday: i === 0,
          daysUntil: i
        };
        break;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        schedule,
        className: classData.classTitle || classData.displayName,
        group: classData.group,
        shift: classData.shift,
        roomNumber: classData.roomNumber,
        nextClass,
        subjects: classData.subjects
      },
    });
  } catch (error) {
    console.error("❌ Error in getStudentSchedule:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching schedule",
      error: error.message,
    });
  }
};
