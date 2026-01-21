/**
 * Test script for email notification system
 * Run: node test-email.js
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

async function testDirectEmail() {
  console.log('\n=== Testing Direct Email Send ===\n');
  
  try {
    const response = await axios.post(`${API_BASE}/api/contracts/test-email`);
    console.log('✓ Response:', response.data);
    
    if (response.data.success) {
      console.log('\n✅ Email test PASSED!');
      console.log('Check your inbox at:', process.env.ADMIN_EMAIL || 'admin@company.com');
    } else {
      console.log('\n❌ Email test FAILED');
      console.log('Check EmailJS configuration in .env file');
    }
  } catch (error) {
    console.error('\n❌ Error testing email:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

async function testExpirationCheck() {
  console.log('\n=== Testing Expiration Check ===\n');
  
  try {
    const response = await axios.post(`${API_BASE}/api/contracts/test-expiration-notifications`);
    console.log('✓ Response:', response.data);
    
    if (response.data.success) {
      console.log('\n✅ Expiration check completed!');
      console.log(`Found: ${response.data.data.found} contracts`);
      console.log(`Emails sent: ${response.data.data.sent}`);
    }
  } catch (error) {
    console.error('\n❌ Error testing expiration check:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

async function runTests() {
  console.log('Email Notification System Test');
  console.log('================================\n');
  console.log(`API Base: ${API_BASE}\n`);
  
  await testDirectEmail();
  await testExpirationCheck();
  
  console.log('\n=== Test Complete ===\n');
}

runTests().catch(console.error);
