const express = require('express');
const { getSetting, updateSetting } = require('../controllers/settingsController');
const { httpAuth, requireRole } = require('../middlewares/monitoringAuth');

const router = express.Router();

// All settings operations require admin role
router.use(httpAuth);
router.use(requireRole(['admin']));

// GET /api/settings/:key
router.get('/:key', getSetting);

// POST /api/settings
router.post('/', updateSetting);

module.exports = router;
