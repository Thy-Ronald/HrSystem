const { query } = require('../config/database');

const Notification = {
    create: async ({ user_id, type, title, message, data }) => {
        const sql = `
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
        const result = await query(sql, [user_id, type, title, message, JSON.stringify(data || {})]);
        return result.insertId;
    },

    getAllForUser: async (userId) => {
        const sql = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
        const rows = await query(sql, [userId]);
        return rows;
    },

    markAsRead: async (id) => {
        const sql = `UPDATE notifications SET is_read = TRUE WHERE id = ?`;
        await query(sql, [id]);
        return true;
    },

    markAllAsRead: async (userId) => {
        const sql = `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`;
        await query(sql, [userId]);
        return true;
    }
};

module.exports = Notification;
