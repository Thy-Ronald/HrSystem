// Quick test script for contract expiration notifications
// Run with: node test-expiration.js

const axios = require('axios');

const API_BASE = 'http://localhost:4000';

async function testExpiration() {
  try {
    // Calculate date 7 days from now
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);
    const expirationDateStr = expirationDate.toISOString().split('T')[0];

    console.log('Creating test contract with expiration date:', expirationDateStr);

    // Create a test contract
    const contract = {
      employeeName: 'TEST EMPLOYEE',
      position: 'Test Position',
      employmentDate: new Date().toISOString().split('T')[0],
      assessmentDate: new Date().toISOString().split('T')[0],
      contractType: 'Test Contract',
      term: '1 year',
      expirationDate: expirationDateStr,
      basicSalary: '50000',
      totalSalary: '50000',
    };

    const createRes = await axios.post(`${API_BASE}/api/contracts`, contract);
    console.log('✓ Contract created:', createRes.data.id);

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Trigger expiration check
    console.log('\nTriggering expiration check...');
    const testRes = await axios.post(`${API_BASE}/api/contracts/test-expiration-notifications`);
    console.log('✓ Test completed:', testRes.data.message);
    console.log('\nCheck your email inbox at:', process.env.ADMIN_EMAIL || 'ronaldmoran930@gmail.com');
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

testExpiration();
