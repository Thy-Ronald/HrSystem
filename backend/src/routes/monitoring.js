/**
 * Monitoring Routes
 * REST API endpoints for monitoring feature
 */

const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');
const monitoringController = require('../controllers/monitoringController');
const monitoringRequestModel = require('../models/monitoringRequestModel');
const { httpAuth, requireRole } = require('../middlewares/monitoringAuth');
const { sessionCreationLimiter } = require('../middlewares/rateLimiter');

/**
 * GET /api/monitoring/sessions
 * Get all active monitoring sessions (admin only)
 */
router.get('/sessions', httpAuth, requireRole(['admin']), async (req, res) => {
  try {
    const adminId = req.user.userId;
    const allSessions = monitoringService.getAllSessions();

    // Fetch all requests for this admin (approved + recently-rejected/disconnected)
    const myRequests = await monitoringRequestModel.getRequestsByAdmin(adminId);

    // Build a map of employeeId -> request status so we can annotate sessions
    const employeeRequestMap = new Map();
    myRequests
      .filter(r => r.status === 'approved' || r.status === 'rejected')
      .forEach(r => employeeRequestMap.set(String(r.target_user_id), r.status));

    // Show sessions for any employee where this admin has an approved OR rejected request
    // (rejected = employee disconnected, but session card should remain visible until admin removes it)
    const filteredSessions = allSessions
      .filter(s => employeeRequestMap.has(String(s.employeeId)))
      .map(s => ({
        ...s,
        // If DB request is 'rejected' and employee socket is gone, mark as disconnected
        disconnectReason: employeeRequestMap.get(String(s.employeeId)) === 'rejected'
          ? (s.disconnectReason || 'offline')
          : s.disconnectReason,
      }));

    res.json({ success: true, data: filteredSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active sessions' });
  }
});

/**
 * DELETE /api/monitoring/sessions/:sessionId
 * Stop/Terminate a monitoring session (admin only)
 */
router.delete('/sessions/:sessionId', httpAuth, requireRole(['admin']), monitoringController.stopSession);

module.exports = router;
