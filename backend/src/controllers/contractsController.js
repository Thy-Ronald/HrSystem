const { addContract, listContracts } = require('../models/contractStore');
const { checkAndNotifyExpiringContracts } = require('../services/notificationService');

function createContract(req, res) {
  const contract = addContract(req.body);
  res.status(201).json(contract);
}

function getContracts(_req, res) {
  res.json(listContracts());
}

async function testExpirationNotifications(_req, res) {
  try {
    await checkAndNotifyExpiringContracts();
    res.json({ message: 'Expiration check completed. Check logs for details.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { createContract, getContracts, testExpirationNotifications };
