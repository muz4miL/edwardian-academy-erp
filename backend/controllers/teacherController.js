const Teacher = require("../models/Teacher");
const Settings = require("../models/Settings");
const User = require("../models/User");

/**
 * @route   GET /api/teachers
 * @desc    Get all teachers
 * @access  Public
 */
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('userId', 'role').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    console.error("❌ Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teachers",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/teachers/:id
 * @desc    Get single teacher by ID with debtToOwner from User model
 * @access  Public
 */
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Convert to plain object to add extra fields
    const teacherData = teacher.toObject();

    // Try to find associated User record for debtToOwner
    // Match by name (partners like Dr. Zahid, Sir Saud)
    const partnerNames = ["waqar", "zahid", "saud"];
    const teacherNameLower = teacher.name?.toLowerCase() || "";
    const isPartner = partnerNames.some((name) =>
      teacherNameLower.includes(name),
    );

    if (isPartner) {
      // Find User with matching name
      const user = await User.findOne({
        fullName: { $regex: teacher.name, $options: "i" },
      }).select("debtToOwner walletBalance");

      if (user) {
        teacherData.debtToOwner = user.debtToOwner || 0;
        teacherData.walletBalance = user.walletBalance || 0;
      }
    }

    res.status(200).json({
      success: true,
      data: teacherData,
    });
  } catch (error) {
    console.error("❌ Error fetching teacher:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher",
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/teachers
 * @desc    Create new teacher with smart defaults from Settings + auto-generate login credentials
 * @access  Public
 */
exports.createTeacher = async (req, res) => {
  try {
    // 🔍 EXTREME DEBUGGING - Log incoming data
    console.log("=== CREATE TEACHER REQUEST ===");
    console.log("Request Headers:", req.headers["content-type"]);
    console.log(
      "Payload Size:",
      Buffer.byteLength(JSON.stringify(req.body)),
      "bytes",
    );
    console.log("Teacher Name:", req.body.name);
    console.log(
      "Profile Image Size:",
      req.body.profileImage ? Buffer.byteLength(req.body.profileImage) : "None",
      "bytes",
    );

    const { name, phone, subject, joiningDate, compensation, profileImage, role: requestedRole } =
      req.body;

    // Validate required fields
    if (!name || !phone || !subject) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, phone, subject",
      });
    }

    // Fetch global settings for smart defaults
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings();
      await settings.save();
    }

    // Prepare compensation object with smart defaults
    let compensationData = {
      type: compensation?.type || settings.defaultCompensationMode,
    };

    // Apply smart defaults based on compensation type
    if (compensationData.type === "percentage") {
      compensationData.teacherShare =
        compensation?.teacherShare ?? settings.defaultTeacherShare;
      compensationData.academyShare =
        compensation?.academyShare ?? settings.defaultAcademyShare;
      // Explicitly set unused fields to null
      compensationData.fixedSalary = null;
      compensationData.baseSalary = null;
      compensationData.profitShare = null;
    } else if (compensationData.type === "fixed") {
      compensationData.fixedSalary =
        compensation?.fixedSalary ?? settings.defaultBaseSalary;
      // Explicitly set unused fields to null
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.baseSalary = null;
      compensationData.profitShare = null;
    } else if (compensationData.type === "hybrid") {
      // Hybrid mode doesn't have defaults in settings, must be provided
      compensationData.baseSalary = compensation?.baseSalary;
      compensationData.profitShare = compensation?.profitShare;
      // Explicitly set unused fields to null
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.fixedSalary = null;
    }

    console.log(
      "Processed Compensation Data:",
      JSON.stringify(compensationData, null, 2),
    );

    // ========================================
    // AUTO-GENERATE LOGIN CREDENTIALS
    // ========================================

    // Generate username from name (e.g., "Ahmed Khan" → "ahmed_khan")
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z\s]/g, "") // Remove non-letters
      .trim()
      .replace(/\s+/g, "_"); // Replace spaces with underscores

    // Ensure unique username by checking for existing users
    let username = baseUsername;
    let usernameExists = await User.findOne({ username });
    let counter = 1;
    while (usernameExists) {
      username = `${baseUsername}${counter}`;
      usernameExists = await User.findOne({ username });
      counter++;
    }

    // Generate random 8-character password
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let plainPassword = "";
    for (let i = 0; i < 8; i++) {
      plainPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Generate unique userId for the User model
    // Find the highest existing TCH number to avoid collisions when users have been deleted
    const lastTchUser = await User.findOne(
      { userId: /^TCH\d+$/ },
      { userId: 1 },
    ).sort({ userId: -1 });
    let nextTchNum = 1;
    if (lastTchUser) {
      const lastNum = parseInt(lastTchUser.userId.replace("TCH", ""), 10);
      nextTchNum = lastNum + 1;
    }
    // Also check total count as a safety floor
    const userCount = await User.countDocuments();
    nextTchNum = Math.max(nextTchNum, userCount + 1);
    const userId = `TCH${String(nextTchNum).padStart(4, "0")}`;

    console.log("🔑 Generated credentials:", {
      username,
      userId,
      passwordLength: plainPassword.length,
    });

    // Determine role and permissions based on requested role
    const userRole = ["OWNER", "PARTNER", "STAFF", "TEACHER"].includes(requestedRole) ? requestedRole : "TEACHER";
    let userPermissions = ["dashboard", "lectures"];
    if (userRole === "PARTNER") {
      userPermissions = ["dashboard", "admissions", "students", "lectures", "finance"];
    } else if (userRole === "OWNER") {
      userPermissions = ["dashboard", "admissions", "students", "teachers", "finance", "classes", "timetable", "sessions", "configuration", "users", "website", "payroll", "settlement", "gatekeeper", "frontdesk", "inquiries", "reports", "lectures"];
    }

    // Create User account for Teacher login
    const user = new User({
      userId,
      username,
      password: plainPassword, // Will be hashed by pre-save hook
      fullName: name,
      role: userRole,
      permissions: userPermissions,
      phone,
      profileImage: profileImage || null,
      isActive: true,
    });

    await user.save();
    console.log("✅ Created User account for teacher:", username);

    // Create new teacher document with link to User
    const teacher = new Teacher({
      name,
      phone,
      subject,
      joiningDate: joiningDate || Date.now(),
      compensation: compensationData,
      profileImage: profileImage || null,
      userId: user._id,
      username: username,
      plainPassword: plainPassword,
    });

    await teacher.save();

    // Update User with teacherId reference
    user.teacherId = teacher._id;
    await user.save();

    console.log("✅ Created new teacher:", teacher.name);

    res.status(201).json({
      success: true,
      message: "Teacher created successfully with login credentials",
      data: teacher,
      // Return credentials for display (THIS IS THE ONLY TIME THEY ARE SHOWN)
      credentials: {
        username: username,
        password: plainPassword,
        note: "Save these credentials! The password cannot be retrieved later.",
      },
    });
  } catch (error) {
    console.error("❌ Error creating teacher:");
    console.error("Error Message:", error.message);
    console.error("Error Code:", error.code);
    console.error("Error Name:", error.name);
    if (error.errors) {
      console.error("Validation Errors:", error.errors);
    }
    console.error("Error Stack:", error.stack);

    // Return appropriate status code based on error type
    const statusCode = error.code === 11000 ? 409 : 400;
    const message =
      error.code === 11000
        ? "Duplicate field value. This teacher may already exist."
        : error.message || "Failed to create teacher";

    res.status(statusCode).json({
      success: false,
      message,
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/teachers/:id
 * @desc    Update teacher
 * @access  Public
 */
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return updated document
      runValidators: true, // Run schema validators
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    console.log("✅ Updated teacher:", teacher.name);

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: teacher,
    });
  } catch (error) {
    console.error("❌ Error updating teacher:", error);
    res.status(400).json({
      success: false,
      message: "Failed to update teacher",
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete teacher
 * @access  Public
 */
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    console.log("✅ Deleted teacher:", teacher.name);

    res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
      data: {},
    });
  } catch (error) {
    console.error("❌ Error deleting teacher:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete teacher",
      error: error.message,
    });
  }
};
