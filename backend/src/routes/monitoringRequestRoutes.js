const express = require('express');
const router = express.Router();
const monitoringRequestController = require('../controllers/monitoringRequestController');
const { httpAuth } = require('../middlewares/monitoringAuth');

router.post('/', httpAuth, monitoringRequestController.createRequest);
router.get('/', httpAuth, monitoringRequestController.getMyRequests);
router.get('/sent', httpAuth, monitoringRequestController.getSentRequests);
router.put('/:id/respond', httpAuth, monitoringRequestController.respondToRequest);
router.delete('/:id', httpAuth, monitoringRequestController.cancelRequest);

module.exports = router;
