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
// @desc    Get partner/owner users with names, subjects (auto-detected from User collection)
// @access  Protected
router.get("/partners", async (req, res) => {
  try {
    // Auto-detect all OWNER + PARTNER users
    const users = await User.find({ role: { $in: ["OWNER", "PARTNER"] }, isActive: true })
      .select("fullName role teacherId")
      .sort({ role: 1, fullName: 1 }); // OWNER first, then PARTNERs alphabetically

    const partners = [];
    for (const user of users) {
      let subject = null;
      if (user.teacherId) {
        const teacher = await Teacher.findById(user.teacherId).select("subject");
        subject = teacher?.subject || null;
      }

      partners.push({
        userId: user._id.toString(),
        fullName: user.fullName,
        role: user.role,
        subject,
      });
    }

    // Also return current expenseShares from config for pre-filling
    const config = await Configuration.findOne();
    const currentShares = config?.expenseShares || [];

    res.json({ success: true, data: partners, currentShares });
  } catch (error) {
    console.error("Fetch partners error:", error);
    res.status(500).json({ success: false, message: "Error fetching partners", error: error.message });
  }
});

module.exports = router;
