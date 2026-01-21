const express = require('express');
const router = express.Router();

const {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
  testExpirationNotifications,
  testDirectEmail,
} = require('../controllers/contractsController');

const {
  validateCreateContract,
  validateUpdateContract,
  validateId,
} = require('../middlewares/validation');

/**
 * REST API Routes for Contracts
 * 
 * POST   /api/contracts              - Create a new contract
 * GET    /api/contracts              - Get all contracts
 * GET    /api/contracts/:id          - Get a contract by ID
 * PUT    /api/contracts/:id          - Update a contract by ID
 * DELETE /api/contracts/:id          - Delete a contract by ID
 */

// Create contract
router.post('/', validateCreateContract, createContract);

// Get all contracts
router.get('/', getAllContracts);

// Get contract by ID
router.get('/:id', validateId, getContractById);

// Update contract
router.put('/:id', validateId, validateUpdateContract, updateContract);

// Delete contract
router.delete('/:id', validateId, deleteContract);

// Legacy test endpoints (keep for backward compatibility)
router.post('/test-expiration-notifications', testExpirationNotifications);
router.post('/test-email', testDirectEmail);

module.exports = router;
