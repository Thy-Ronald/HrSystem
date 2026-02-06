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

    getAllForUser: async (userId, limit = 50, offset = 0) => {
        const sql = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
        const rows = await query(sql, [userId, limit, offset]);
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
    },

    deleteAllForUser: async (userId) => {
        const sql = `DELETE FROM notifications WHERE user_id = ?`;
        await query(sql, [userId]);
        return true;
    },

    /**
     * Create a notification in DB and emit to all active user sockets (O(1) lookup)
     */
    createAndNotify: async (payload, io, userSockets) => {
        const { user_id, type, title, message, data } = payload;
        const id = await Notification.create({ user_id, type, title, message, data });

        if (io && userSockets) {
            const sockets = userSockets.get(String(user_id));
            if (sockets) {
                const notification = {
                    id,
                    type,
                    title,
                    message,
                    data,
                    created_at: new Date().toISOString(),
                    is_read: false
                };
                sockets.forEach(sid => io.to(sid).emit('notification:new', notification));
            }
        }
        return id;
    }
};

module.exports = Notification;
