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

    // Enrich with computed financial fields for reports & dashboard
    const enriched = teachers.map((t) => {
      const obj = t.toObject();
      const pending = obj.balance?.pending || 0;
      const totalPaid = obj.totalPaid || 0;
      // totalCredited = all credits ever given (outstanding + already paid out)
      obj.walletBalance = pending;
      obj.totalCredited = pending + totalPaid;
      obj.totalDebited = totalPaid;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
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

    const {
      name,
      phone,
      subject,
      joiningDate,
      compensation,
      profileImage,
      role: requestedRole,
      email,
      username: requestedUsername,
    } = req.body;

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
      compensationData.perStudentAmount = null;
    } else if (compensationData.type === "fixed") {
      compensationData.fixedSalary =
        compensation?.fixedSalary ?? settings.defaultBaseSalary;
      // Explicitly set unused fields to null
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.baseSalary = null;
      compensationData.profitShare = null;
      compensationData.perStudentAmount = null;
    } else if (compensationData.type === "hybrid") {
      // Hybrid mode doesn't have defaults in settings, must be provided
      compensationData.baseSalary = compensation?.baseSalary;
      compensationData.profitShare = compensation?.profitShare;
      // Explicitly set unused fields to null
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.fixedSalary = null;
      compensationData.perStudentAmount = null;
    } else if (compensationData.type === "perStudent") {
      compensationData.perStudentAmount = compensation?.perStudentAmount;
      // Explicitly set unused fields to null
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.fixedSalary = null;
      compensationData.baseSalary = null;
      compensationData.profitShare = null;
    }

    console.log(
      "Processed Compensation Data:",
      JSON.stringify(compensationData, null, 2),
    );

    // ========================================
    // AUTO-GENERATE LOGIN CREDENTIALS
    // ========================================

    const normalizedEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : null;
    const normalizedUsername =
      typeof requestedUsername === "string" && requestedUsername.trim()
        ? requestedUsername.trim().toLowerCase()
        : null;

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
    const teacherRole = ["OWNER", "PARTNER", "STAFF", "TEACHER"].includes(requestedRole)
      ? requestedRole
      : "TEACHER";
    let userRole = teacherRole;

    // ========================================
    // PREVENT DUPLICATE OWNER CREATION
    // Only ONE OWNER can exist in the system
    // ========================================
    let existingOwner = null;
    if (userRole === "OWNER") {
      existingOwner = await User.findOne({ role: "OWNER", isActive: true });
      if (existingOwner) {
        console.log("⚠️ OWNER already exists:", existingOwner.fullName);
        console.log("🔗 Will attempt to link this teacher to existing OWNER instead of creating new one");
      }
    }

    const buildPermissions = (role) => {
      if (role === "PARTNER") {
        return ["dashboard", "admissions", "students", "lectures", "finance"];
      }
      if (role === "OWNER") {
        return ["dashboard", "admissions", "students", "teachers", "finance", "classes", "timetable", "sessions", "configuration", "users", "website", "payroll", "settlement", "gatekeeper", "frontdesk", "inquiries", "reports", "lectures"];
      }
      return ["dashboard", "lectures"];
    };
    const permissionsMatch = (current = [], next = []) => {
      if (current.length !== next.length) return false;
      const set = new Set(current);
      return next.every((perm) => set.has(perm));
    };

    let userPermissions = buildPermissions(userRole);

    // ========================================
    // SMART USER LINKING - Prevent Duplicates!
    // For OWNER/PARTNER roles, try to find existing user first
    // ========================================
    let user = null;
    let existingUserLinked = false;
    const ownerMatchFilters = [];
    if (normalizedUsername) {
      ownerMatchFilters.push({ username: normalizedUsername });
    }
    if (normalizedEmail) {
      ownerMatchFilters.push({ email: normalizedEmail });
    }
    if (!normalizedUsername && baseUsername) {
      ownerMatchFilters.push({ username: baseUsername });
    }

    // Special handling: If someone requested OWNER role, try username/email match first
    if (userRole === "OWNER" && ownerMatchFilters.length > 0) {
      const matchedOwner = await User.findOne({
        role: "OWNER",
        $or: ownerMatchFilters,
      });
      if (matchedOwner) {
        if (matchedOwner.teacherId) {
          console.log(`⚠️ Matched OWNER already linked: ${matchedOwner.fullName}`);
        } else {
          user = matchedOwner;
          existingUserLinked = true;
          console.log("🔗 Linking teacher to OWNER (username/email match):", matchedOwner.fullName);
        }
      }
    }

    // Fallback: Link to existing OWNER without a teacherId
    if (!user && userRole === "OWNER" && existingOwner && !existingOwner.teacherId) {
      user = existingOwner;
      existingUserLinked = true;
      console.log("🔗 Linking teacher to existing OWNER:", existingOwner.fullName);
    } else if (!user && userRole === "OWNER" && existingOwner && existingOwner.teacherId) {
      console.log(`⚠️ OWNER already linked to Teacher: ${existingOwner.fullName}`);
    }

    if (!user && (userRole === "OWNER" || userRole === "PARTNER")) {
      // Try to find an existing user with the same role that doesn't have a teacherId yet
      // or matches by name (case-insensitive)
      const nameParts = name.toLowerCase().split(/\s+/);

      // First, try exact role match with similar name
      const existingUsers = await User.find({
        role: userRole,
        $or: [
          { teacherId: { $exists: false } },
          { teacherId: null }
        ]
      }).lean();

      // Find best match by name similarity
      for (const existingUser of existingUsers) {
        const existingNameParts = (existingUser.fullName || "").toLowerCase().split(/\s+/);
        const hasCommonPart = nameParts.some(part =>
          existingNameParts.some(ePart => ePart.includes(part) || part.includes(ePart))
        );

        if (hasCommonPart) {
          user = await User.findById(existingUser._id);
          existingUserLinked = true;
          console.log("🔗 Found existing user to link:", existingUser.fullName, existingUser.role);
          break;
        }
      }

      // If no match by name, try to find ANY unlinked user with same role
      if (!user) {
        user = await User.findOne({
          role: userRole,
          $or: [
            { teacherId: { $exists: false } },
            { teacherId: null }
          ]
        });
        if (user) {
          existingUserLinked = true;
          console.log("🔗 Linking to existing unlinked user:", user.fullName, user.role);
        }
      }
    }

    // Only create new user if no existing user was found to link
    if (!user) {
      // Create User account for Teacher login
      user = new User({
        userId,
        username,
        password: plainPassword, // Will be hashed by pre-save hook
        fullName: name,
        role: userRole,
        permissions: userPermissions,
        phone,
        email: normalizedEmail || undefined,
        profileImage: profileImage || null,
        isActive: true,
      });

      await user.save();
      console.log("✅ Created NEW User account for teacher:", username);
    } else {
      // Update existing user with missing fields or role corrections
      let shouldSaveUser = false;
      if (profileImage && !user.profileImage) {
        user.profileImage = profileImage;
        shouldSaveUser = true;
      }
      if (normalizedEmail && !user.email) {
        user.email = normalizedEmail;
        shouldSaveUser = true;
      }
      if (user.role !== userRole) {
        user.role = userRole;
        user.permissions = userPermissions;
        shouldSaveUser = true;
      } else {
        if (!permissionsMatch(user.permissions || [], userPermissions)) {
          user.permissions = userPermissions;
          shouldSaveUser = true;
        }
      }
      if (shouldSaveUser) {
        await user.save();
      }
      // Use existing user's credentials
      username = user.username;
      plainPassword = "(existing account - password unchanged)";
    }

    // Create new teacher document with link to User
    const teacher = new Teacher({
      name,
      phone,
      subject,
      joiningDate: joiningDate || Date.now(),
      compensation: compensationData,
      profileImage: profileImage || null,
      role: teacherRole,
      userId: user._id,
      username: username,
      plainPassword: plainPassword,
    });

    await teacher.save();

    // Update User with teacherId reference
    user.teacherId = teacher._id;
    await user.save();

    console.log("✅ Created new teacher:", teacher.name, existingUserLinked ? "(linked to existing user)" : "(new user account)");

    res.status(201).json({
      success: true,
      message: existingUserLinked
        ? `Teacher created and linked to existing ${userRole} account (${user.fullName})`
        : "Teacher created successfully with login credentials",
      data: teacher,
      linkedToExisting: existingUserLinked,
      linkedUser: existingUserLinked ? { id: user._id, fullName: user.fullName, role: user.role } : null,
      // Return credentials for display (THIS IS THE ONLY TIME THEY ARE SHOWN)
      credentials: {
        username: username,
        password: existingUserLinked ? "(use existing account password)" : plainPassword,
        note: existingUserLinked
          ? `This teacher is linked to existing ${userRole} account: ${user.fullName}. Use existing login credentials.`
          : "Save these credentials! The password cannot be retrieved later.",
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
 * @desc    Delete teacher and clean up User associations
 *          PARTNER users: DELETE their User record entirely (no orphaned partners!)
 *          OWNER users: Just unlink teacherId (they stay as Super Admin)
 * @access  Public
 */
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP: Handle associated User based on their role
    // PARTNER → DELETE their User account (prevents ghost partners)
    // OWNER → Just unlink teacherId (they stay as Super Admin)
    // ═══════════════════════════════════════════════════════════════
    if (teacher.userId) {
      const linkedUser = await User.findById(teacher.userId);
      if (linkedUser) {
        if (linkedUser.role === "PARTNER") {
          // PARTNER: Delete their User account entirely
          await User.findByIdAndDelete(linkedUser._id);
          console.log(`🗑️ DELETED PARTNER User account: ${linkedUser.fullName}`);
        } else if (linkedUser.role === "OWNER") {
          // OWNER: Just unlink teacherId (they stay as Super Admin)
          linkedUser.teacherId = null;
          await linkedUser.save();
          console.log(`🔗 Unlinked OWNER User ${linkedUser.fullName} from deleted Teacher ${teacher.name}`);
        } else {
          // Other roles: Just unlink
          linkedUser.teacherId = null;
          await linkedUser.save();
          console.log(`🔗 Unlinked User ${linkedUser.fullName} from deleted Teacher ${teacher.name}`);
        }
      }
    }

    // Also clean up any orphaned User references to this teacher
    // For PARTNER users without a teacher, DELETE them
    const orphanedPartners = await User.find({
      teacherId: teacher._id,
      role: "PARTNER"
    });
    for (const orphan of orphanedPartners) {
      await User.findByIdAndDelete(orphan._id);
      console.log(`🗑️ DELETED orphaned PARTNER: ${orphan.fullName}`);
    }

    // For non-PARTNER users, just unlink
    await User.updateMany(
      { teacherId: teacher._id, role: { $ne: "PARTNER" } },
      { $unset: { teacherId: "" } }
    );

    await Teacher.findByIdAndDelete(req.params.id);
    console.log("✅ Deleted teacher:", teacher.name);

    // ═══════════════════════════════════════════════════════════════
    // CRITICAL: Purge deleted Users from Configuration splits
    // This ensures 100% accounting accuracy by removing stale entries
    // ═══════════════════════════════════════════════════════════════
    const Configuration = require("../models/Configuration");
    const config = await Configuration.findOne();
    if (config) {
      let configNeedsUpdate = false;

      // Get all deleted user IDs (including the linked user if deleted)
      const deletedUserIds = new Set();
      if (teacher.userId) {
        const linkedUser = await User.findById(teacher.userId);
        if (!linkedUser) {
          deletedUserIds.add(teacher.userId.toString());
        }
      }
      for (const orphan of orphanedPartners) {
        deletedUserIds.add(orphan._id.toString());
      }

      // Purge from expenseShares
      if (config.expenseShares && config.expenseShares.length > 0) {
        const cleanedExpenseShares = config.expenseShares.filter(s => {
          const shouldKeep = !deletedUserIds.has(s.userId?.toString());
          if (!shouldKeep) {
            console.log(`🧹 Purging ${s.fullName} from expenseShares`);
            configNeedsUpdate = true;
          }
          return shouldKeep;
        });
        config.expenseShares = cleanedExpenseShares;
      }

      // Purge from academyShareSplit
      if (config.academyShareSplit && config.academyShareSplit.length > 0) {
        const cleanedAcademyShares = config.academyShareSplit.filter(s => {
          const shouldKeep = !deletedUserIds.has(s.userId?.toString());
          if (!shouldKeep) {
            console.log(`🧹 Purging ${s.fullName} from academyShareSplit`);
            configNeedsUpdate = true;
          }
          return shouldKeep;
        });
        config.academyShareSplit = cleanedAcademyShares;
      }

      if (configNeedsUpdate) {
        await config.save();
        console.log("✅ Configuration splits auto-cleaned after teacher deletion");
      }
    }

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
