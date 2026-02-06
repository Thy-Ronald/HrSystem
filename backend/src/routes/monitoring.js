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

    // Filter sessions: Only show those where this admin has an 'approved' request
    const myRequests = await monitoringRequestModel.getRequestsByAdmin(adminId);
    const approvedEmployeeIds = new Set(
      myRequests
        .filter(r => r.status === 'approved')
        .map(r => String(r.target_user_id))
    );

    const filteredSessions = allSessions.filter(s =>
      approvedEmployeeIds.has(String(s.employeeId))
    );

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
