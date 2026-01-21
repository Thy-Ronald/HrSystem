const emailjs = require('@emailjs/nodejs');

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@company.com';

function initializeEmailJS() {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn(
      'EmailJS configuration missing. Contract expiration notifications will be disabled.'
    );
    return false;
  }
  return true;
}

async function sendContractExpirationNotification(contract) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS not configured. Skipping notification.');
    return false;
  }

  try {
    const templateParams = {
      to_email: ADMIN_EMAIL,
      employee_name: contract.employeeName || 'Unknown',
      position: contract.position || 'N/A',
      contract_type: contract.contractType || 'N/A',
      expiration_date: contract.expirationDate || 'N/A',
      days_until_expiration: '7',
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      {
        publicKey: EMAILJS_PUBLIC_KEY,
      }
    );

    console.log(`Contract expiration notification sent for: ${contract.employeeName}`);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}

module.exports = {
  initializeEmailJS,
  sendContractExpirationNotification,
};
