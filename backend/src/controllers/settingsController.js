const settingsService = require('../services/settingsService');
const axios = require('axios');

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

        if (key === 'github_token' && value) {
            try {
                // Verify token with GitHub API
                await axios.get('https://api.github.com/user', {
                    headers: {
                        'Authorization': `Bearer ${value.trim()}`,
                        'Accept': 'application/vnd.github+json'
                    }
                });
            } catch (error) {
                const status = error.response?.status || 500;
                const message = status === 401
                    ? 'Invalid or expired GitHub token. Please check and try again.'
                    : `GitHub API error: ${error.message}`;

                return res.status(status === 401 ? 401 : 400).json({
                    success: false,
                    error: 'Token Verification Failed',
                    message
                });
            }
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
