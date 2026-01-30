/**
 * Monitoring Routes
 * REST API endpoints for monitoring feature
 */

const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');

/**
 * GET /api/monitoring/sessions
 * Get all active monitoring sessions (admin only)
 */
router.get('/sessions', (req, res) => {
  try {
    const sessions = monitoringService.getAllSessions();
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
