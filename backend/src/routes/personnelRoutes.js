const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');

// POST /api/personnel - Create a new personnel record
router.post('/', personnelController.createPersonnelRecord);

// GET /api/personnel/search - Search personnel
router.get('/search', personnelController.searchPersonnel);

// GET /api/personnel - Get all personnel records
router.get('/', personnelController.getAllPersonnelRecords);

// PUT /api/personnel/:id - Update a personnel record
router.put('/:id', personnelController.updatePersonnelRecord);

// DELETE /api/personnel/:id - Delete a personnel record
router.delete('/:id', personnelController.deletePersonnelRecord);

module.exports = router;
