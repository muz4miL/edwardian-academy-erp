const Settings = require('../models/Settings');

/**
 * @route   GET /api/config
 * @desc    Get global settings (creates default if none exists)
 * @access  Protected (OWNER only for sensitive financial data)
 */
exports.getSettings = async (req, res) => {
    try {
        // Security: Only OWNER can access full configuration
        // (Basic auth check - middleware should handle this, but double-check here)
        if (req.user && req.user.role !== 'OWNER') {
            // Partners/Staff get limited config (no expense split)
            const settings = await Settings.findOne().select('-expenseSplit');
            return res.status(200).json({
                success: true,
                data: settings || {},
                limited: true,
            });
        }

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
 * @access  Protected (OWNER only)
 */
exports.updateSettings = async (req, res) => {
    try {
        // SECURITY: Only OWNER can update configuration
        if (!req.user || req.user.role !== 'OWNER') {
            return res.status(403).json({
                success: false,
                message: '🚫 Access Denied: Only the Owner can modify system configuration.',
            });
        }

        // VALIDATION: If expenseSplit is being updated, ensure it adds to 100%
        if (req.body.expenseSplit) {
            const { waqar, zahid, saud } = req.body.expenseSplit;
            const total = (Number(waqar) || 0) + (Number(zahid) || 0) + (Number(saud) || 0);
            
            if (total !== 100) {
                return res.status(400).json({
                    success: false,
                    message: `❌ Partnership split must equal 100%. Current total: ${total}%`,
                });
            }
        }

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
