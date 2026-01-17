const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');

// @route   GET /api/config
// @desc    Get global academy settings
router.get('/', getSettings);

// @route   POST /api/config
// @desc    Update global academy settings
router.post('/', updateSettings);

module.exports = router;
