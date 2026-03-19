const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getConfig, updateConfig, getSessionPrice } = require("../controllers/configController");
const User = require("../models/User");
const Configuration = require("../models/Configuration");
const Teacher = require("../models/Teacher");

router.use(protect);
router.route("/").get(getConfig).post(updateConfig);
router.route("/session-price/:sessionId").get(getSessionPrice);

// @route   GET /api/config/partners
// @desc    Get partner/owner users with names, subjects, contact info (auto-detected from User collection)
//          Also auto-cleans stale entries from config that no longer exist in the DB
//          DEDUPLICATES: Only ONE OWNER allowed, merges duplicate entries
//          GHOST FILTER: PARTNER users MUST have a valid teacherId (no orphaned accounts)
// @access  Protected
router.get("/partners", async (req, res) => {
  try {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Auto-detect all LIVING OWNER + PARTNER users from DB
    // CRITICAL: PARTNER users MUST have a teacherId to be considered valid
    // OWNER can exist without teacherId (Super Admin), but only ONE owner allowed
    // ═══════════════════════════════════════════════════════════════
    const allUsers = await User.find({ role: { $in: ["OWNER", "PARTNER"] } })
      .select("fullName role teacherId phone profileImage isActive")
      .sort({ role: 1, fullName: 1 }); // OWNER first, then PARTNERs alphabetically
    console.log(
      "🔎 /config/partners query results:",
      allUsers.map((u) => ({
        id: u._id,
        fullName: u.fullName,
        role: u.role,
        teacherId: u.teacherId,
        isActive: u.isActive,
      })),
    );

    // GHOST FILTER: Only include valid users
    // - OWNER: Can exist without teacherId (they're the Super Admin)
    // - PARTNER: MUST have a valid teacherId (no orphaned partner accounts!)
    const users = allUsers.filter(u => {
      if (!u.isActive) {
        console.log(`🚫 INACTIVE: Skipping "${u.fullName}" (${u.role})`);
        return false;
      }
      if (u.role === "OWNER") {
        return true; // OWNER is always valid
      }
      if (u.role === "PARTNER") {
        // PARTNER must have a teacherId to be valid
        if (!u.teacherId) {
          console.log(`👻 GHOST DETECTED: Skipping orphaned PARTNER "${u.fullName}" (no teacherId)`);
          return false;
        }
        return true;
      }
      return true;
    });

    // ═══════════════════════════════════════════════════════════════
    // STEP 1.5: DEDUPLICATE OWNER ENTRIES - Only ONE OWNER allowed!
    // Priority: Keep the OWNER with a teacherId (linked to Teacher profile)
    // ═══════════════════════════════════════════════════════════════
    const owners = users.filter(u => u.role === "OWNER");
    const partners = users.filter(u => u.role === "PARTNER");

    let deduplicatedUsers = [...partners];
    let deduplicationOccurred = false;

    if (owners.length > 1) {
      console.log(`⚠️ Found ${owners.length} OWNER entries - deduplicating...`);

      // Prefer the owner WITH a teacherId (linked to Teacher profile = "full identity")
      const linkedOwner = owners.find(o => o.teacherId);
      const unlinkedOwners = owners.filter(o => !o.teacherId);

      if (linkedOwner) {
        // Keep the linked owner, mark others as inactive
        deduplicatedUsers.unshift(linkedOwner);
        console.log(`✅ Keeping linked OWNER: ${linkedOwner.fullName} (teacherId: ${linkedOwner.teacherId})`);

        for (const unlinked of unlinkedOwners) {
          // If names are similar, merge them (same person)
          const linkedNameParts = (linkedOwner.fullName || "").toLowerCase().split(/\s+/);
          const unlinkedNameParts = (unlinked.fullName || "").toLowerCase().split(/\s+/);
          const isSamePerson = linkedNameParts.some(part =>
            unlinkedNameParts.some(uPart => uPart.includes(part) || part.includes(uPart))
          );

          if (isSamePerson) {
            console.log(`🧹 Skipping duplicate OWNER (same person): ${unlinked.fullName}`);
            deduplicationOccurred = true;
          } else {
            // Different person - downgrade to PARTNER or keep as separate entry
            console.log(`⚠️ Multiple different OWNERs found: ${unlinked.fullName} - keeping as separate entry`);
            deduplicatedUsers.push(unlinked);
          }
        }
      } else if (owners.length > 0) {
        // No linked owner, just keep the first one
        deduplicatedUsers.unshift(owners[0]);
        for (let i = 1; i < owners.length; i++) {
          console.log(`🧹 Skipping duplicate OWNER: ${owners[i].fullName}`);
          deduplicationOccurred = true;
        }
      }
    } else if (owners.length === 1) {
      deduplicatedUsers.unshift(owners[0]);
    }

    const finalPartners = [];
    const liveUserIds = new Set(); // Track which user IDs actually exist

    for (const user of deduplicatedUsers) {
      let subject = null;
      let joiningDate = null;
      let compensation = null;
      let status = "active";

      // ═══════════════════════════════════════════════════════════════
      // CRITICAL: Query Teachers collection as SINGLE SOURCE OF TRUTH
      // Only show users whose Teacher record has status: 'Active'
      // ═══════════════════════════════════════════════════════════════
      if (user.teacherId) {
        const teacher = await Teacher.findById(user.teacherId).select("subject joiningDate compensation status");

        // Skip if teacher doesn't exist or is not Active
        if (!teacher) {
          console.log(`👻 GHOST DETECTED: User "${user.fullName}" has teacherId but Teacher not found`);
          continue;
        }

        const teacherStatus = (teacher.status || "active").toLowerCase();
        if (teacherStatus !== "active") {
          console.log(`🚫 FILTERED: Skipping "${user.fullName}" - Teacher status is "${teacherStatus}" (not Active)`);
          continue;
        }

        subject = teacher.subject || null;
        joiningDate = teacher.joiningDate || null;
        compensation = teacher.compensation || null;
        status = teacher.status || "active";
      } else if (user.role === "OWNER") {
        // OWNER without teacherId is allowed (Super Admin)
        console.log(`✅ Including OWNER without Teacher record: ${user.fullName}`);
      } else {
        // Non-OWNER without teacherId should have been filtered earlier
        console.log(`👻 GHOST DETECTED: Non-OWNER user "${user.fullName}" without teacherId`);
        continue;
      }

      liveUserIds.add(user._id.toString());

      finalPartners.push({
        userId: user._id.toString(),
        fullName: user.fullName,
        role: user.role,
        subject,
        phone: user.phone || null,
        profileImage: user.profileImage || null,
        isActive: user.isActive,
        joiningDate,
        compensation,
        status,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Get current config and PURGE stale entries
    // ═══════════════════════════════════════════════════════════════
    const config = await Configuration.findOne();
    let configNeedsUpdate = false;

    // Clean expenseShares - remove any userId that no longer exists
    let cleanedExpenseShares = (config?.expenseShares || []).filter(s => {
      const exists = s.userId && liveUserIds.has(s.userId.toString());
      if (!exists && s.userId) {
        console.log(`🧹 Purging stale expense share entry: ${s.fullName} (${s.userId})`);
        configNeedsUpdate = true;
      }
      return exists;
    });

    // Clean academyShareSplit - remove any userId that no longer exists
    let cleanedAcademyShares = (config?.academyShareSplit || []).filter(s => {
      const exists = s.userId && liveUserIds.has(s.userId.toString());
      if (!exists && s.userId) {
        console.log(`🧹 Purging stale academy share entry: ${s.fullName} (${s.userId})`);
        configNeedsUpdate = true;
      }
      return exists;
    });

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Sync live users with saved shares
    // ═══════════════════════════════════════════════════════════════
    // Build synced expense shares (only live users)
    const syncedExpenseShares = finalPartners.map(p => {
      const saved = cleanedExpenseShares.find(s => s.userId?.toString() === p.userId);
      return {
        userId: p.userId,
        fullName: p.fullName,
        percentage: saved ? saved.percentage : 0,
      };
    });

    // Build synced academy shares (only live users)
    const syncedAcademyShares = finalPartners.map(p => {
      const saved = cleanedAcademyShares.find(s => s.userId?.toString() === p.userId);
      return {
        userId: p.userId,
        fullName: p.fullName,
        role: p.role,
        percentage: saved ? saved.percentage : 0,
      };
    });

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Auto-redistribute if totals don't add up
    // ═══════════════════════════════════════════════════════════════
    const expenseTotal = syncedExpenseShares.reduce((sum, s) => sum + s.percentage, 0);
    if (expenseTotal !== 100 && syncedExpenseShares.length > 0) {
      const equalShare = Math.floor(100 / syncedExpenseShares.length);
      const remainder = 100 - equalShare * syncedExpenseShares.length;
      syncedExpenseShares.forEach((s, i) => {
        s.percentage = equalShare + (i === 0 ? remainder : 0);
      });
      configNeedsUpdate = true;
      console.log(`📊 Auto-redistributed expense shares equally among ${syncedExpenseShares.length} partners`);
    }

    const academyTotal = syncedAcademyShares.reduce((sum, s) => sum + s.percentage, 0);
    if (academyTotal !== 100 && syncedAcademyShares.length > 0) {
      const equalShare = Math.floor(100 / syncedAcademyShares.length);
      const remainder = 100 - equalShare * syncedAcademyShares.length;
      syncedAcademyShares.forEach((s, i) => {
        s.percentage = equalShare + (i === 0 ? remainder : 0);
      });
      configNeedsUpdate = true;
      console.log(`📊 Auto-redistributed academy shares equally among ${syncedAcademyShares.length} partners`);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Persist cleaned data back to config if changes were made
    // ═══════════════════════════════════════════════════════════════
    if ((configNeedsUpdate || deduplicationOccurred) && config) {
      await Configuration.findByIdAndUpdate(config._id, {
        expenseShares: syncedExpenseShares,
        academyShareSplit: syncedAcademyShares,
      });
      console.log(`✅ Config auto-cleaned and updated with ${finalPartners.length} live partners`);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Return the LIVE, SYNCED data
    // ═══════════════════════════════════════════════════════════════
    res.json({
      success: true,
      data: finalPartners,
      currentShares: syncedExpenseShares,
      currentAcademyShares: syncedAcademyShares,
      liveCount: finalPartners.length,
      wasAutoClean: configNeedsUpdate || deduplicationOccurred,
    });
  } catch (error) {
    console.error("Fetch partners error:", error);
    res.status(500).json({ success: false, message: "Error fetching partners", error: error.message });
  }
});

module.exports = router;
