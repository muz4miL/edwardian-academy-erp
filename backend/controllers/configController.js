const Configuration = require("../models/Configuration");

exports.getConfig = async (req, res) => {
  if (req.user.role !== "OWNER")
    return res.status(403).json({ success: false, message: "Owner only" });
  try {
    let config =
      (await Configuration.findOne()) || (await Configuration.create({}));
    res.status(200).json({ success: true, data: config });
  } catch (err) {
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
