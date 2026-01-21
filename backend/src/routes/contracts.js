const express = require('express');

const router = express.Router();

const { createContract, getContracts, testExpirationNotifications, testDirectEmail } = require('../controllers/contractsController');

router.post('/', createContract);
router.get('/', getContracts);
router.post('/test-expiration-notifications', testExpirationNotifications);
router.post('/test-email', testDirectEmail);

module.exports = router;

