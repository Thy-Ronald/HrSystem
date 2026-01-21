const { listContracts } = require('../models/contractStore');
const { sendContractExpirationNotification } = require('./emailService');

function getContractsExpiringInDays(days = 7) {
  const contracts = listContracts();
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + days);

  const expiringContracts = contracts.filter((contract) => {
    if (!contract.expirationDate) return false;

    const expirationDate = new Date(contract.expirationDate);
    expirationDate.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);

    return expirationDate.getTime() === targetStart.getTime();
  });

  return expiringContracts;
}

async function checkAndNotifyExpiringContracts() {
  try {
    const expiringContracts = getContractsExpiringInDays(7);

    if (expiringContracts.length === 0) {
      console.log('No contracts expiring in 7 days.');
      return;
    }

    console.log(`Found ${expiringContracts.length} contract(s) expiring in 7 days.`);

    for (const contract of expiringContracts) {
      await sendContractExpirationNotification(contract);
    }
  } catch (error) {
    console.error('Error checking expiring contracts:', error);
  }
}

module.exports = {
  checkAndNotifyExpiringContracts,
  getContractsExpiringInDays,
};
