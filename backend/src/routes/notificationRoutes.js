const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { httpAuth, requireRole } = require('../middlewares/monitoringAuth');

router.get('/', httpAuth, requireRole(['admin']), notificationController.getUnifiedNotifications);
router.put('/:id/read', httpAuth, requireRole(['admin']), notificationController.markAsRead);
router.delete('/all', httpAuth, requireRole(['admin']), notificationController.deleteAll);

module.exports = router;
