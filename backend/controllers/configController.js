const Configuration = require("../models/Configuration");

exports.getConfig = async (req, res) => {
  // Allow OWNER, OPERATOR, PARTNER, and TEACHER to access configuration
  const allowedRoles = ["OWNER", "OPERATOR", "PARTNER", "TEACHER"];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to authorized personnel",
    });
  }

  try {
    let config =
      (await Configuration.findOne()) || (await Configuration.create({}));

    // 🔍 DEBUG: Log what we're about to return
    console.log("🔍 === BACKEND CONFIG RESPONSE ===");
    console.log("Fetched config:", {
      _id: config._id,
      defaultSubjectFeesCount: config.defaultSubjectFees?.length || 0,
      defaultSubjectFees: config.defaultSubjectFees,
      allConfigKeys: Object.keys(config.toObject?.() || config),
    });
    console.log("==================================");

    res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error("❌ Error fetching config:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateConfig = async (req, res) => {
  if (req.user.role !== "OWNER")
    return res.status(403).json({ success: false });

  const { expenseSplit, defaultSubjectFees } = req.body;

  if (
    expenseSplit &&
    expenseSplit.waqar + expenseSplit.zahid + expenseSplit.saud !== 100
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Splits must total 100%" });
  }

  try {
    // 💾 DEBUG: Log incoming data
    console.log("💾 === UPDATING CONFIG ===");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Subject fees received:", {
      count: defaultSubjectFees?.length || 0,
      subjects: defaultSubjectFees,
    });

    const config = await Configuration.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });

    // ✅ DEBUG: Log saved data
    console.log("✅ Config saved successfully:");
    console.log("Saved config subject fees:", {
      count: config.defaultSubjectFees?.length || 0,
      subjects: config.defaultSubjectFees,
    });
    console.log("========================");

    res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error("❌ Error updating config:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
