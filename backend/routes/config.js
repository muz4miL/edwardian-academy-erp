const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getConfig, updateConfig } = require("../controllers/configController");

router.use(protect);
router.route("/").get(getConfig).post(updateConfig);
module.exports = router;
