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

    if (!name || !phone || !subject) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, phone, subject",
      });
    }

    const teacherRole = (requestedRole || "TEACHER").toUpperCase();
    const allowedTeacherRoles = ["OWNER", "PARTNER", "TEACHER"];
    if (!allowedTeacherRoles.includes(teacherRole)) {
      return res.status(400).json({
        success: false,
        message: "Role must be one of: OWNER, PARTNER, TEACHER",
      });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    let compensationData = {
      type: compensation?.type || settings.defaultCompensationMode,
    };

    if (compensationData.type === "percentage") {
      compensationData.teacherShare =
        compensation?.teacherShare ?? settings.defaultTeacherShare;
      compensationData.academyShare =
        compensation?.academyShare ?? settings.defaultAcademyShare;
      compensationData.fixedSalary = null;
      compensationData.baseSalary = null;
      compensationData.profitShare = null;
      compensationData.perStudentAmount = null;
    } else if (compensationData.type === "fixed") {
      compensationData.fixedSalary =
        compensation?.fixedSalary ?? settings.defaultBaseSalary;
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.baseSalary = null;
      compensationData.profitShare = null;
      compensationData.perStudentAmount = null;
    } else if (compensationData.type === "hybrid") {
      compensationData.baseSalary = compensation?.baseSalary;
      compensationData.profitShare = compensation?.profitShare;
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.fixedSalary = null;
      compensationData.perStudentAmount = null;
    } else if (compensationData.type === "perStudent") {
      compensationData.perStudentAmount = compensation?.perStudentAmount;
      compensationData.teacherShare = null;
      compensationData.academyShare = null;
      compensationData.fixedSalary = null;
      compensationData.baseSalary = null;
      compensationData.profitShare = null;
    }

    const normalizedEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : null;
    const normalizedRequestedUsername =
      typeof requestedUsername === "string" && requestedUsername.trim()
        ? requestedUsername.trim().toLowerCase()
        : null;

    const generatedBaseUsername = name
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");
    const baseUsername =
      normalizedRequestedUsername || generatedBaseUsername || "teacher";

    let username = baseUsername;
    let usernameExists = await User.findOne({ username });
    let counter = 1;
    while (usernameExists) {
      username = `${baseUsername}${counter}`;
      usernameExists = await User.findOne({ username });
      counter++;
    }

    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let plainPassword = "";
    for (let i = 0; i < 8; i++) {
      plainPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const lastTchUser = await User.findOne(
      { userId: /^TCH\d+$/ },
      { userId: 1 },
    ).sort({ userId: -1 });
    let nextTchNum = 1;
    if (lastTchUser) {
      const lastNum = parseInt(lastTchUser.userId.replace("TCH", ""), 10);
      nextTchNum = lastNum + 1;
    }
    const userCount = await User.countDocuments();
    nextTchNum = Math.max(nextTchNum, userCount + 1);
    const userId = `TCH${String(nextTchNum).padStart(4, "0")}`;

    const userRole = teacherRole;
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

    const ensureValidOwnerTeacherLink = async (ownerUser) => {
      if (!ownerUser?.teacherId) {
        return { isLinked: false, linkedTeacher: null };
      }

      const linkedTeacher = ownerUser?.teacherId?.name
        ? ownerUser.teacherId
        : await Teacher.findById(ownerUser.teacherId).select("name");

      // Auto-heal stale references when teacher was deleted but owner.teacherId remained.
      if (!linkedTeacher) {
        ownerUser.teacherId = null;
        await ownerUser.save();
        return { isLinked: false, linkedTeacher: null };
      }

      return { isLinked: true, linkedTeacher };
    };

    const ownerAlreadyLinkedResponse = async (ownerUser) => {
      const { linkedTeacher } = await ensureValidOwnerTeacherLink(ownerUser);
      const linkedTeacherName = linkedTeacher?.name || "Unknown";
      return res.status(409).json({
        success: false,
        message: `An Owner is already linked to teacher ${linkedTeacherName}. Only one Owner allowed.`,
      });
    };

    const userPermissions = buildPermissions(userRole);

    let user = null;
    let existingUserLinked = false;

    if (userRole === "OWNER") {
      const ownerMatchFilters = [];
      if (normalizedRequestedUsername) {
        ownerMatchFilters.push({ username: normalizedRequestedUsername });
      }
      if (normalizedEmail) {
        ownerMatchFilters.push({ email: normalizedEmail });
      }

      if (ownerMatchFilters.length > 0) {
        const matchedOwner = await User.findOne({
          role: "OWNER",
          $or: ownerMatchFilters,
        });
        if (matchedOwner) {
          const linkState = await ensureValidOwnerTeacherLink(matchedOwner);
          if (linkState.isLinked) {
            return ownerAlreadyLinkedResponse(matchedOwner);
          }
          user = matchedOwner;
          existingUserLinked = true;
        }
      }

      if (!user) {
        const unlinkedOwner = await User.findOne({
          role: "OWNER",
          $or: [{ teacherId: { $exists: false } }, { teacherId: null }],
        });
        if (unlinkedOwner) {
          user = unlinkedOwner;
          existingUserLinked = true;
        }
      }

      if (!user) {
        const linkedOwner = await User.findOne({
          role: "OWNER",
          teacherId: { $exists: true, $ne: null },
        }).populate("teacherId", "name");
        if (linkedOwner) {
          const linkState = await ensureValidOwnerTeacherLink(linkedOwner);
          if (linkState.isLinked) {
            return ownerAlreadyLinkedResponse(linkedOwner);
          }
          user = linkedOwner;
          existingUserLinked = true;
        }
      }
    }

    if (!user && userRole === "PARTNER") {
      const partnerMatchFilters = [];
      if (normalizedRequestedUsername) {
        partnerMatchFilters.push({ username: normalizedRequestedUsername });
      }
      if (normalizedEmail) {
        partnerMatchFilters.push({ email: normalizedEmail });
      }

      if (partnerMatchFilters.length > 0) {
        const matchedPartner = await User.findOne({
          role: "PARTNER",
          $or: partnerMatchFilters,
        });
        if (matchedPartner) {
          if (matchedPartner.teacherId) {
            return res.status(409).json({
              success: false,
              message: `Existing PARTNER account (${matchedPartner.fullName}) is already linked to a different teacher.`,
            });
          }
          user = matchedPartner;
          existingUserLinked = true;
        }
      }

      if (!user) {
        const unlinkedPartner = await User.findOne({
          role: "PARTNER",
          $or: [{ teacherId: { $exists: false } }, { teacherId: null }],
        });
        if (unlinkedPartner) {
          user = unlinkedPartner;
          existingUserLinked = true;
        }
      }
    }

    if (!user) {
      user = new User({
        userId,
        username,
        password: plainPassword,
        fullName: name,
        role: userRole,
        permissions: userPermissions,
        phone,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        profileImage: profileImage || null,
        isActive: true,
      });

      await user.save();
    } else {
      let shouldSaveUser = false;
      if (user.role !== userRole) {
        return res.status(409).json({
          success: false,
          message: `Existing user role mismatch (${user.fullName} is ${user.role}).`,
        });
      }
      if (user.teacherId) {
        if (userRole === "OWNER") {
          const linkState = await ensureValidOwnerTeacherLink(user);
          if (linkState.isLinked) {
            return ownerAlreadyLinkedResponse(user);
          }
        } else {
          return res.status(409).json({
            success: false,
            message: `Existing ${userRole} account (${user.fullName}) is already linked to a different teacher.`,
          });
        }
      }
      if (profileImage && !user.profileImage) {
        user.profileImage = profileImage;
        shouldSaveUser = true;
      }
      if (normalizedEmail && !user.email) {
        user.email = normalizedEmail;
        shouldSaveUser = true;
      }
      if (!permissionsMatch(user.permissions || [], userPermissions)) {
        user.permissions = userPermissions;
        shouldSaveUser = true;
      }
      if (shouldSaveUser) {
        await user.save();
      }

      username = user.username;
      plainPassword = "(existing account - password unchanged)";
    }

    const teacher = new Teacher({
      name,
      phone,
      subject,
      joiningDate: joiningDate || Date.now(),
      compensation: compensationData,
      profileImage: profileImage || null,
      role: teacherRole,
      userId: user._id,
      username,
      plainPassword,
    });

    await teacher.save();

    user.teacherId = teacher._id;
    await user.save();

    res.status(201).json({
      success: true,
      message: existingUserLinked
        ? `Teacher created and linked to existing ${userRole} account (${user.fullName})`
        : "Teacher created successfully with login credentials",
      data: teacher,
      linkedToExisting: existingUserLinked,
      linkedUser: existingUserLinked
        ? { id: user._id, fullName: user.fullName, role: user.role }
        : null,
      credentials: {
        username,
        password: existingUserLinked
          ? "(use existing account password)"
          : plainPassword,
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
