const emailjs = require('@emailjs/nodejs');

function getEmailJSConfig() {
  return {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    templateId: process.env.EMAILJS_TEMPLATE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY, // Required for server-side calls
    adminEmail: process.env.ADMIN_EMAIL || 'admin@company.com',
  };
}

function initializeEmailJS() {
  const config = getEmailJSConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey || !config.privateKey) {
    console.warn(
      'EmailJS configuration missing. Contract expiration notifications will be disabled.'
    );
    console.warn('Required: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY');
    console.warn('Note: BOTH Public Key and Private Key are required for server-side API calls');
    console.warn('Current values:', {
      serviceId: config.serviceId ? '✓' : '✗',
      templateId: config.templateId ? '✓' : '✗',
      publicKey: config.publicKey ? '✓' : '✗',
      privateKey: config.privateKey ? '✓' : '✗',
      adminEmail: config.adminEmail,
    });
    return false;
  }
  console.log('EmailJS configured successfully.');
  return true;
}

async function sendContractExpirationNotification(contract) {
  const config = getEmailJSConfig();
  if (!config.serviceId || !config.templateId || !config.publicKey || !config.privateKey) {
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

    console.log('Sending email notification...');
    console.log('Using Service ID:', config.serviceId);
    console.log('Using Template ID:', config.templateId);
    console.log('Template params:', JSON.stringify(templateParams, null, 2));

    // For server-side, BOTH publicKey and privateKey are required
    if (!config.publicKey) {
      throw new Error('EMAILJS_PUBLIC_KEY is required. Check your .env file.');
    }
    if (!config.privateKey) {
      throw new Error('EMAILJS_PRIVATE_KEY is required. Check your .env file.');
    }
    if (!config.templateId) {
      throw new Error('EMAILJS_TEMPLATE_ID is required. Check your .env file.');
    }

    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      {
        publicKey: config.publicKey,   // Required
        privateKey: config.privateKey, // Required for server-side calls
      }
    );

    console.log('✓ EmailJS response status:', response.status);
    console.log(`✓ Contract expiration notification sent for: ${contract.employeeName}`);
    console.log(`✓ Email sent to: ${config.adminEmail}`);
    return true;
  } catch (error) {
    console.error('✗ Failed to send email notification:');
    console.error('Error details:', {
      status: error.status,
      text: error.text,
      message: error.message,
    });
    
    if (error.status === 403 && error.text?.includes('non-browser')) {
      console.error('\n⚠️  IMPORTANT: Server-side API calls are disabled!');
      console.error('To fix this:');
      console.error('1. Go to EmailJS Dashboard → Account → Security');
      console.error('2. Enable "Allow server-side API calls" or "Allow non-browser applications"');
      console.error('3. Save settings and restart your backend server');
    }
    
    console.error('Full error:', error);
    return false;
  }
}

module.exports = {
  initializeEmailJS,
  sendContractExpirationNotification,
};
