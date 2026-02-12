const settingsService = require('../services/settingsService');

/**
 * GET /api/settings/:key
 */
async function getSetting(req, res) {
    try {
        const { key } = req.params;
        const value = await settingsService.getSetting(key);

        res.json({
            success: true,
            data: value
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch setting',
            message: error.message
        });
    }
}

/**
 * POST /api/settings
 */
async function updateSetting(req, res) {
    try {
        const { key, value, description } = req.body;

        if (!key) {
            return res.status(400).json({
                success: false,
                error: 'Missing key'
            });
        }

        await settingsService.setSetting(key, value, description);

        res.json({
            success: true,
            message: `Setting ${key} updated successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update setting',
            message: error.message
        });
    }
}

module.exports = {
    getSetting,
    updateSetting
};
