const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getConfig, updateConfig, getSessionPrice } = require("../controllers/configController");

router.use(protect);
router.route("/").get(getConfig).post(updateConfig);
router.route("/session-price/:sessionId").get(getSessionPrice);

module.exports = router;
