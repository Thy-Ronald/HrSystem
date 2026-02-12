const { query } = require('../config/database');

/**
 * Get a setting by key
 * @param {string} key - Setting key
 * @returns {Promise<string|null>} Setting value
 */
async function getSetting(key) {
    try {
        const results = await query(
            'SELECT setting_value FROM system_settings WHERE setting_key = ?',
            [key]
        );
        return results.length > 0 ? results[0].setting_value : null;
    } catch (error) {
        console.error(`Error fetching setting ${key}:`, error);
        throw error;
    }
}

/**
 * Update or create a setting
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @param {string} description - Optional description
 */
async function setSetting(key, value, description = null) {
    try {
        await query(
            `INSERT INTO system_settings (setting_key, setting_value, description)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             setting_value = VALUES(setting_value),
             description = COALESCE(VALUES(description), description)`,
            [key, value, description]
        );
    } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        throw error;
    }
}

module.exports = {
    getSetting,
    setSetting
};
