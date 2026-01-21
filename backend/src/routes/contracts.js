const express = require('express');

const router = express.Router();

const { createContract, getContracts } = require('../controllers/contractsController');

router.post('/', createContract);
router.get('/', getContracts);

module.exports = router;

