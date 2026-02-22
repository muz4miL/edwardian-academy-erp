/**
 * User Management Controller
 * Allows OWNER to create staff accounts and control their permissions
 */

const User = require("../models/User");

// All possible permissions for the UI
const ALL_PERMISSIONS = [
  "dashboard",
  "admissions",
  "students",
  "teachers",
  "finance",
  "classes",
  "timetable",
  "sessions",
  "configuration",
  "users",
  "website",
  "payroll",
  "settlement",
  "gatekeeper",
  "frontdesk",
  "inquiries",
  "reports",
  "lectures",
];

// ========================================
// @desc    Get all users
// @route   GET /api/users
// @access  OWNER only
// ========================================
exports.getAllUsers = async (req, res) => {
  try {
    // Only OWNER can access user management
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can manage users.",
      });
    }

    const users = await User.find().select("-password").sort({ createdAt: -1 });

    // For TEACHER users, attach their plainPassword from Teacher model
    const Teacher = require("../models/Teacher");
    const usersData = await Promise.all(
      users.map(async (u) => {
        const userData = u.toObject();
        if (u.role === "TEACHER" && u.teacherId) {
          const teacher = await Teacher.findById(u.teacherId).select("plainPassword username");
          if (teacher) {
            userData.teacherPassword = teacher.plainPassword || null;
            userData.teacherUsername = teacher.username || null;
          }
        }
        return userData;
      })
    );

    res.status(200).json({
      success: true,
      count: usersData.length,
      data: usersData,
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Create a new user
// @route   POST /api/users
// @access  OWNER only
// ========================================
exports.createUser = async (req, res) => {
  try {
    // Only OWNER can create users
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can create users.",
      });
    }

    const { fullName, username, password, role, permissions, phone, email } =
      req.body;

    // Validation
    if (!fullName || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide fullName, username, password, and role",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Generate userId (e.g., USR-001, USR-002)
    const userCount = await User.countDocuments();
    const userId = `USR-${String(userCount + 1).padStart(3, "0")}`;

    // Filter permissions to only valid values
    let validPermissions = ["dashboard"]; // Always include dashboard
    if (permissions && Array.isArray(permissions)) {
      validPermissions = permissions.filter((p) => ALL_PERMISSIONS.includes(p));
      if (!validPermissions.includes("dashboard")) {
        validPermissions.unshift("dashboard");
      }
    }

    // Prevent non-OWNER from having 'users' or 'configuration' permissions
    if (role !== "OWNER") {
      validPermissions = validPermissions.filter(
        (p) => p !== "users" && p !== "configuration",
      );
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      userId,
      username: username.toLowerCase(),
      password,
      fullName,
      role,
      permissions: validPermissions,
      phone: phone || undefined,
      email: email || undefined,
      createdBy: req.user._id,
      canBeDeleted: role !== "OWNER", // Owners cannot be deleted
    });

    console.log(`✅ User created: ${user.fullName} (${user.role})`);

    res.status(201).json({
      success: true,
      message: `User "${user.fullName}" created successfully`,
      data: {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Update a user
// @route   PUT /api/users/:id
// @access  OWNER only
// ========================================
exports.updateUser = async (req, res) => {
  try {
    // Only OWNER can update users
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can update users.",
      });
    }

    const { id } = req.params;
    const { fullName, role, permissions, phone, email, isActive, password } =
      req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent changing own role (to prevent locking yourself out)
    if (
      user._id.toString() === req.user._id.toString() &&
      role &&
      role !== user.role
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    // Update fields
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;
    if (typeof isActive === "boolean") user.isActive = isActive;

    // Update permissions
    if (permissions && Array.isArray(permissions)) {
      let validPermissions = permissions.filter((p) =>
        ALL_PERMISSIONS.includes(p),
      );
      if (!validPermissions.includes("dashboard")) {
        validPermissions.unshift("dashboard");
      }
      // Restrict configuration and users for non-OWNER
      if (user.role !== "OWNER") {
        validPermissions = validPermissions.filter(
          (p) => p !== "users" && p !== "configuration",
        );
      }
      user.permissions = validPermissions;
    }

    // Update password if provided
    if (password && password.length >= 8) {
      user.password = password; // Will be hashed by pre-save hook

      // Sync plaintext password to Teacher model for admin display
      if (user.teacherId) {
        const Teacher = require("../models/Teacher");
        await Teacher.findByIdAndUpdate(user.teacherId, { plainPassword: password });
      }
    }

    await user.save();

    console.log(`✅ User updated: ${user.fullName}`);

    res.status(200).json({
      success: true,
      message: `User "${user.fullName}" updated successfully`,
      data: {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  OWNER only
// ========================================
exports.deleteUser = async (req, res) => {
  try {
    // Only OWNER can delete users
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can delete users.",
      });
    }

    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    // Prevent deleting protected users (like core owners)
    if (!user.canBeDeleted) {
      return res.status(400).json({
        success: false,
        message: "This user account is protected and cannot be deleted",
      });
    }

    await User.findByIdAndDelete(id);

    console.log(`✅ User deleted: ${user.fullName}`);

    res.status(200).json({
      success: true,
      message: `User "${user.fullName}" deleted successfully`,
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Get available permissions list
// @route   GET /api/users/permissions
// @access  OWNER only
// ========================================
exports.getPermissionsList = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Return permissions with labels for the UI
    const permissions = [
      {
        key: "dashboard",
        label: "Dashboard",
        description: "Main dashboard overview",
      },
      {
        key: "admissions",
        label: "Admissions",
        description: "New student admissions",
      },
      {
        key: "students",
        label: "Students",
        description: "View and manage students",
      },
      {
        key: "teachers",
        label: "Teachers",
        description: "View and manage teachers",
      },
      {
        key: "finance",
        label: "Finance",
        description: "Fee collection and finance",
      },
      { key: "classes", label: "Classes", description: "Class management" },
      { key: "timetable", label: "Timetable", description: "Class timetables" },
      { key: "sessions", label: "Sessions", description: "Academic sessions" },
      {
        key: "gatekeeper",
        label: "Gatekeeper",
        description: "Gate scanning access",
      },
      {
        key: "frontdesk",
        label: "Front Desk",
        description: "Admissions and inquiries hub",
      },
      {
        key: "inquiries",
        label: "Inquiries",
        description: "Lead management",
      },
      {
        key: "reports",
        label: "Reports",
        description: "Financial reports and settlement",
      },
      {
        key: "lectures",
        label: "Lectures",
        description: "Academic video portal",
      },
      {
        key: "configuration",
        label: "Configuration",
        description: "System settings (OWNER only)",
        ownerOnly: true,
      },
      {
        key: "users",
        label: "User Management",
        description: "Manage staff accounts (OWNER only)",
        ownerOnly: true,
      },
    ];

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get permissions",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-status
// @access  OWNER only
// ========================================
exports.toggleUserStatus = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent toggling own status
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User "${user.fullName}" is now ${user.isActive ? "active" : "inactive"}`,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle user status",
      error: error.message,
    });
  }
};
