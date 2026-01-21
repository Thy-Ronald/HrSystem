const express = require('express');

const router = express.Router();

const { createContract, getContracts, testExpirationNotifications } = require('../controllers/contractsController');

router.post('/', createContract);
router.get('/', getContracts);
router.post('/test-expiration-notifications', testExpirationNotifications);

module.exports = router;

