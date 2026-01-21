const { addContract, listContracts } = require('../models/contractStore');
const { checkAndNotifyExpiringContracts } = require('../services/notificationService');
const { sendContractExpirationNotification } = require('../services/emailService');

function createContract(req, res) {
  const contract = addContract(req.body);
  res.status(201).json(contract);
}

function getContracts(_req, res) {
  res.json(listContracts());
}

async function testExpirationNotifications(_req, res) {
  try {
    const result = await checkAndNotifyExpiringContracts();
    res.json({ 
      message: 'Expiration check completed. Check logs for details.',
      found: result.found || 0,
      sent: result.sent || 0,
    });
  } catch (error) {
    console.error('Test expiration error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function testDirectEmail(_req, res) {
  try {
    console.log('\n=== Testing direct email send ===');
    const testContract = {
      employeeName: 'TEST EMPLOYEE',
      position: 'Test Position',
      contractType: 'Test Contract',
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    
    const result = await sendContractExpirationNotification(testContract);
    res.json({ 
      success: result,
      message: result 
        ? 'Test email sent successfully! Check your inbox.' 
        : 'Failed to send email. Check backend logs for details.',
    });
  } catch (error) {
    console.error('Direct email test error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.text || error.status,
    });
  }
}

module.exports = { createContract, getContracts, testExpirationNotifications, testDirectEmail };
