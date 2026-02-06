const { query } = require('../config/database');

async function createRequest(adminId, targetUserId) {
    const sql = `
        INSERT INTO monitoring_requests (admin_id, target_user_id, status)
        VALUES (?, ?, 'pending')
    `;
    try {
        const result = await query(sql, [adminId, targetUserId]);
        return { id: result.insertId, admin_id: adminId, target_user_id: targetUserId, status: 'pending' };
    } catch (error) {
        console.error('Error creating monitoring request:', error);
        throw error;
    }
}

async function getRequestsForUser(userId) {
    const sql = `
        SELECT 
            mr.id, 
            mr.admin_id, 
            mr.status, 
            mr.created_at,
            u.name as admin_name,
            u.email as admin_email
        FROM monitoring_requests mr
        JOIN users u ON mr.admin_id = u.id
        WHERE mr.target_user_id = ? AND mr.status IN ('pending', 'approved')
        ORDER BY mr.created_at DESC
    `;
    try {
        const requests = await query(sql, [userId]);
        return requests;
    } catch (error) {
        console.error('Error getting monitoring requests:', error);
        throw error;
    }
}

async function updateRequestStatus(requestId, status) {
    const sql = `
        UPDATE monitoring_requests 
        SET status = ? 
        WHERE id = ?
    `;
    try {
        await query(sql, [status, requestId]);
        return { id: requestId, status };
    } catch (error) {
        console.error('Error updating monitoring request status:', error);
        throw error;
    }
}

// Check if a pending request already exists
async function findPendingRequest(adminId, targetUserId) {
    const sql = `
        SELECT id FROM monitoring_requests 
        WHERE admin_id = ? AND target_user_id = ? AND status = 'pending'
    `;
    try {
        const result = await query(sql, [adminId, targetUserId]);
        return result[0];
    } catch (error) {
        throw error;
    }
}

async function getById(id) {
    const sql = `SELECT * FROM monitoring_requests WHERE id = ?`;
    try {
        const result = await query(sql, [id]);
        return result[0];
    } catch (error) {
        console.error('Error getting request by ID:', error);
        throw error;
    }
}

module.exports = {
    createRequest,
    getRequestsForUser,
    updateRequestStatus,
    findPendingRequest,
    getById,
    getRequestsByAdmin
};

async function getRequestsByAdmin(adminId) {
    const sql = `
        SELECT 
            mr.id, 
            mr.target_user_id, 
            mr.status, 
            mr.created_at,
            u.name as employee_name,
            u.email as employee_email
        FROM monitoring_requests mr
        JOIN users u ON mr.target_user_id = u.id
        WHERE mr.admin_id = ? AND mr.status IN ('pending', 'approved')
        ORDER BY mr.created_at DESC
    `;
    try {
        const requests = await query(sql, [adminId]);
        return requests;
    } catch (error) {
        console.error('Error getting requests by admin:', error);
        throw error;
    }
}
