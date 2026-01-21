const emailjs = require('@emailjs/nodejs');

function getEmailJSConfig() {
  return {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    templateId: process.env.EMAILJS_TEMPLATE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    adminEmail: process.env.ADMIN_EMAIL || 'admin@company.com',
  };
}

function initializeEmailJS() {
  const config = getEmailJSConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    console.warn(
      'EmailJS configuration missing. Contract expiration notifications will be disabled.'
    );
    console.warn('Required: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY');
    console.warn('Current values:', {
      serviceId: config.serviceId ? '✓' : '✗',
      templateId: config.templateId ? '✓' : '✗',
      publicKey: config.publicKey ? '✓' : '✗',
      adminEmail: config.adminEmail,
    });
    return false;
  }
  console.log('EmailJS configured successfully.');
  return true;
}

async function sendContractExpirationNotification(contract) {
  const config = getEmailJSConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    console.warn('EmailJS not configured. Skipping notification.');
    return false;
  }

  try {
    const employeeName = contract.employeeName || 'Unknown';
    const position = contract.position || 'N/A';
    const contractType = contract.contractType || 'N/A';
    const expirationDate = contract.expirationDate || 'N/A';

    // Format subject line
    const subject = `Contract Expiration Alert: ${employeeName} - ${contractType}`;

    // Format message body
    const message = `
Contract Expiration Notification

Employee Name: ${employeeName}
Position: ${position}
Contract Type: ${contractType}
Expiration Date: ${expirationDate}
Days Until Expiration: 7

Please review and take necessary action before the contract expires.
    `.trim();

    const templateParams = {
      to_email: config.adminEmail,
      subject: subject,
      message: message,
      // Also include individual fields in case template uses them
      employee_name: employeeName,
      position: position,
      contract_type: contractType,
      expiration_date: expirationDate,
      days_until_expiration: '7',
    };

    await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      {
        publicKey: config.publicKey,
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
