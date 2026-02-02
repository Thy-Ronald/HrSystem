const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');

// POST /api/personnel - Create a new personnel record
router.post('/', personnelController.createPersonnelRecord);

// GET /api/personnel - Get all personnel records
router.get('/', personnelController.getAllPersonnelRecords);

// PUT /api/personnel/:id - Update a personnel record
router.put('/:id', personnelController.updatePersonnelRecord);

module.exports = router;
