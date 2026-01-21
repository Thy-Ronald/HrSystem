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
    console.log('\n=== Starting expiration check ===');
    const expiringContracts = getContractsExpiringInDays(7);

    if (expiringContracts.length === 0) {
      console.log('No contracts expiring in 7 days.');
      console.log('=== Expiration check completed ===\n');
      return { found: 0, sent: 0 };
    }

    console.log(`Found ${expiringContracts.length} contract(s) expiring in 7 days:`);
    expiringContracts.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.employeeName} - Expires: ${c.expirationDate}`);
    });

    let sentCount = 0;
    for (const contract of expiringContracts) {
      const result = await sendContractExpirationNotification(contract);
      if (result) sentCount++;
    }

    console.log(`=== Expiration check completed: ${sentCount}/${expiringContracts.length} emails sent ===\n`);
    return { found: expiringContracts.length, sent: sentCount };
  } catch (error) {
    console.error('Error checking expiring contracts:', error);
    throw error;
  }
}

module.exports = {
  checkAndNotifyExpiringContracts,
  getContractsExpiringInDays,
};
