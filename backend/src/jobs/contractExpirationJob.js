const cron = require('node-cron');
const { checkAndNotifyExpiringContracts } = require('../services/notificationService');

let job = null;

function startContractExpirationJob() {
  if (job) {
    console.log('Contract expiration job already running.');
    return;
  }

  job = cron.schedule('0 9 * * *', async () => {
    console.log('Running contract expiration check...');
    await checkAndNotifyExpiringContracts();
  });

  console.log('Contract expiration notification job started. Running daily at 9:00 AM.');
}

function stopContractExpirationJob() {
  if (job) {
    job.stop();
    job = null;
    console.log('Contract expiration job stopped.');
  }
}

module.exports = {
  startContractExpirationJob,
  stopContractExpirationJob,
};
