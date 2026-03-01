/**
 * Employee Tracking Routes
 * REST API endpoints for the Live Team Overview (Project B admin dashboard).
 * All endpoints are admin-only.
 */

const express = require('express');
const router = express.Router();
const { httpAuth, requireRole } = require('../middlewares/monitoringAuth');
const {
  getEmployees,
  getAllPresence,
  getUserActivity,
} = require('../controllers/employeeTrackingController');

/** GET /api/employee-tracking/employees — list all employees */
router.get('/employees', httpAuth, requireRole(['admin']), getEmployees);

/** GET /api/employee-tracking/presence — all employees with current presence */
router.get('/presence', httpAuth, requireRole(['admin']), getAllPresence);

/** GET /api/employee-tracking/activity/:uid?date=YYYY-MM-DD — daily activity */
router.get('/activity/:uid', httpAuth, requireRole(['admin']), getUserActivity);

module.exports = router;
