const { addContract, listContracts } = require('../models/contractStore');
const { checkAndNotifyExpiringContracts, getContractsExpiringInDays } = require('../services/notificationService');
const { sendContractExpirationNotification } = require('../services/emailService');

async function createContract(req, res) {
  const contract = addContract(req.body);
  
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
