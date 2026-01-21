const { getContractsExpiringInDays } = require('../models/contractStore');
const { sendContractExpirationNotification } = require('./emailService');

async function checkAndNotifyExpiringContracts() {
  try {
    console.log('\n=== Starting expiration check ===');
    const expiringContracts = await getContractsExpiringInDays(7);

    if (expiringContracts.length === 0) {
      console.log('No contracts expiring in 7 days.');
      console.log('=== Expiration check completed ===\n');
      return { found: 0, sent: 0 };
    }

    console.log(`Found ${expiringContracts.length} contract(s) expiring in 7 days:`);
    expiringContracts.forEach((c, i) => {
      const employeeName = c.name || c.employeeName || 'Unknown';
      const expirationDate = c.expirationDate || 'N/A';
      console.log(`  ${i + 1}. ${employeeName} - Expires: ${expirationDate}`);
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
};
