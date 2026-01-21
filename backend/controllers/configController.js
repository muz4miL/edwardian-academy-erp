const Configuration = require("../models/Configuration");

exports.getConfig = async (req, res) => {
  // Allow OWNER, OPERATOR, and PARTNER to access configuration
  const allowedRoles = ["OWNER", "OPERATOR", "PARTNER"];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to authorized personnel"
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
    });
    console.log("==================================");

    res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error("❌ Error fetching config:", err);
    res.status(500).json({ success: false });
  }
};

exports.updateConfig = async (req, res) => {
  if (req.user.role !== "OWNER")
    return res.status(403).json({ success: false });
  const { expenseSplit } = req.body;
  if (
    expenseSplit &&
    expenseSplit.waqar + expenseSplit.zahid + expenseSplit.saud !== 100
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Splits must total 100%" });
  }
  try {
    const config = await Configuration.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
