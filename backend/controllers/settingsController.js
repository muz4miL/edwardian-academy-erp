const Settings = require('../models/Settings');

/**
 * @route   GET /api/config
 * @desc    Get global settings (creates default if none exists)
 * @access  Public
 */
exports.getSettings = async (req, res) => {
    try {
        // Try to find the first (and only) settings document
        let settings = await Settings.findOne();

        // If no settings exist, create one with defaults
        if (!settings) {
            settings = new Settings();
            await settings.save();
            console.log('✅ Created default settings document');
        }

        res.status(200).json({
            success: true,
            data: settings,
        });
    } catch (error) {
        console.error('❌ Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message,
        });
    }
};

/**
 * @route   POST /api/config
 * @desc    Update global settings
 * @access  Public
 */
exports.updateSettings = async (req, res) => {
    try {
        // Find the first settings document
        let settings = await Settings.findOne();

        // If no settings exist, create one
        if (!settings) {
            settings = new Settings(req.body);
            await settings.save();
            console.log('✅ Created new settings document');
        } else {
            // Update existing settings with new data
            Object.assign(settings, req.body);
            await settings.save();
            console.log('✅ Updated settings document');
        }

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings,
        });
    } catch (error) {
        console.error('❌ Error updating settings:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message,
        });
    }
};
