const Configuration = require("../models/Configuration");

exports.getConfig = async (req, res) => {
  // Allow OWNER, OPERATOR, PARTNER, and TEACHER to access configuration
  const allowedRoles = ["OWNER", "OPERATOR", "PARTNER", "TEACHER", "STAFF"];
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
      sessionPricesCount: config.sessionPrices?.length || 0,
      sessionPrices: config.sessionPrices,
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

  const { expenseSplit, defaultSubjectFees, tuitionPoolSplit, eteaPoolSplit, sessionPrices } =
    req.body;

  if (
    expenseSplit &&
    expenseSplit.waqar + expenseSplit.zahid + expenseSplit.saud !== 100
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Expense splits must total 100%" });
  }

  // Waqar's Protocol: Validate Tuition Pool Split (50/30/20)
  if (
    tuitionPoolSplit &&
    tuitionPoolSplit.waqar + tuitionPoolSplit.zahid + tuitionPoolSplit.saud !==
    100
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Tuition pool splits must total 100%" });
  }

  // Waqar's Protocol: Validate ETEA Pool Split (40/30/30)
  if (
    eteaPoolSplit &&
    eteaPoolSplit.waqar + eteaPoolSplit.zahid + eteaPoolSplit.saud !== 100
  ) {
    return res
      .status(400)
      .json({ success: false, message: "ETEA pool splits must total 100%" });
  }

  try {
    // 💾 DEBUG: Log incoming data
    console.log("💾 === UPDATING CONFIG ===");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Subject fees received:", {
      count: defaultSubjectFees?.length || 0,
      subjects: defaultSubjectFees,
    });
    console.log("Session prices received:", {
      count: sessionPrices?.length || 0,
      sessions: sessionPrices,
    });

    const config = await Configuration.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
    });

    // ✅ DEBUG: Log saved data
    console.log("✅ Config saved successfully:");
    console.log("Saved config:", {
      subjectFeesCount: config.defaultSubjectFees?.length || 0,
      sessionPricesCount: config.sessionPrices?.length || 0,
    });
    console.log("========================");

    res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error("❌ Error updating config:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================
// SESSION PRICE LOOKUP (Waqar Protocol v2)
// ========================================
// Returns the fee for a specific session
exports.getSessionPrice = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const config = await Configuration.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Configuration not found",
      });
    }

    // Find the session price
    const sessionPrice = config.sessionPrices?.find(
      (sp) => sp.sessionId?.toString() === sessionId
    );

    if (!sessionPrice) {
      console.log(`📊 No session price found for sessionId: ${sessionId}`);
      return res.status(200).json({
        success: true,
        data: {
          sessionId,
          price: 0,
          found: false,
          message: "No price configured for this session",
        },
      });
    }

    console.log(`✅ Session price found:`, {
      sessionId,
      sessionName: sessionPrice.sessionName,
      price: sessionPrice.price,
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        sessionName: sessionPrice.sessionName,
        price: sessionPrice.price,
        found: true,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching session price:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
