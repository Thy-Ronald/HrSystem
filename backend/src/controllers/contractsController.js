const {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
  getContractsExpiringInDays,
} = require('../models/contractStore');
const { checkAndNotifyExpiringContracts } = require('../services/notificationService');
const { sendContractExpirationNotification } = require('../services/emailService');

/**
 * Standard JSON response format
 */
function sendSuccess(res, data, statusCode = 200, message = null) {
  const response = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  return res.status(statusCode).json(response);
}

/**
 * POST /api/contracts
 * Create a new contract
 */
async function createContractHandler(req, res, next) {
  try {
    const contract = await createContract(req.body);

    // Check if this contract expires in 7 days and send notification immediately
    if (contract.expirationDate) {
      try {
        const expirationDate = new Date(contract.expirationDate);
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 7);

        // Normalize dates to compare only dates (ignore time)
        expirationDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        if (expirationDate.getTime() === targetDate.getTime()) {
          console.log(`\n✓ New contract expires in exactly 7 days. Sending notification...`);
          await sendContractExpirationNotification(contract);
        }
      } catch (error) {
        // Don't fail contract creation if notification fails
        console.error('Failed to send expiration notification for new contract:', error);
      }
    }

    return sendSuccess(res, contract, 201, 'Contract created successfully');
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}

/**
 * GET /api/contracts
 * Get all contracts
 */
async function getAllContractsHandler(_req, res, next) {
  try {
    const contracts = await getAllContracts();
    return sendSuccess(res, contracts, 200);
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}

/**
 * GET /api/contracts/:id
 * Get a contract by ID
 */
async function getContractByIdHandler(req, res, next) {
  try {
    const contract = await getContractById(req.params.id);

    if (!contract) {
      const error = new Error(`Contract not found with ID ${req.params.id}`);
      error.status = 404;
      return next(error);
    }

    return sendSuccess(res, contract, 200);
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}

/**
 * PUT /api/contracts/:id
 * Update a contract by ID
 */
async function updateContractHandler(req, res, next) {
  try {
    const contract = await updateContract(req.params.id, req.body);

    if (!contract) {
      const error = new Error(`Contract not found with ID ${req.params.id}`);
      error.status = 404;
      return next(error);
    }

    return sendSuccess(res, contract, 200, 'Contract updated successfully');
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}

/**
 * DELETE /api/contracts/:id
 * Delete a contract by ID
 */
async function deleteContractHandler(req, res, next) {
  try {
    const deleted = await deleteContract(req.params.id);

    if (!deleted) {
      const error = new Error(`Contract not found with ID ${req.params.id}`);
      error.status = 404;
      return next(error);
    }

    return sendSuccess(res, null, 200, 'Contract deleted successfully');
  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
}

/**
 * POST /api/contracts/test-expiration-notifications
 * Test expiration notifications (legacy endpoint)
 */
async function testExpirationNotifications(_req, res, next) {
  try {
    const result = await checkAndNotifyExpiringContracts();
    return sendSuccess(res, {
      found: result.found || 0,
      sent: result.sent || 0,
    }, 200, 'Expiration check completed. Check logs for details.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/contracts/test-email
 * Test direct email (legacy endpoint)
 */
async function testDirectEmail(_req, res, next) {
  try {
    console.log('\n=== Testing direct email send ===');
    const testContract = {
      name: 'TEST EMPLOYEE',
      position: 'Test Position',
      termMonths: 12,
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    const result = await sendContractExpirationNotification(testContract);
    return sendSuccess(res, {
      success: result,
    }, 200, result
      ? 'Test email sent successfully! Check your inbox.'
      : 'Failed to send email. Check backend logs for details.');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/contracts/expiring
 * Get contracts expiring within 7 days
 */
async function getExpiringContractsHandler(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 7;
    const contracts = await getContractsExpiringInDays(days);
    return sendSuccess(res, contracts, 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createContract: createContractHandler,
  getAllContracts: getAllContractsHandler,
  getContractById: getContractByIdHandler,
  updateContract: updateContractHandler,
  deleteContract: deleteContractHandler,
  getExpiringContracts: getExpiringContractsHandler,
  testExpirationNotifications,
  testDirectEmail,
  // Legacy exports for backward compatibility
  getContracts: getAllContractsHandler,
};
