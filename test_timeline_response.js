const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

async function testTimeline() {
    try {
        const repo = 'timeriver/sacsys009';
        const filter = 'this-month';
        const response = await axios.get(`http://localhost:5000/api/github/timeline?repo=${repo}&filter=${filter}`);

        console.log('Success:', response.data.success);
        if (response.data.data && response.data.data.length > 0) {
            const firstUser = response.data.data[0];
            console.log('User Login:', firstUser.user?.login);
            console.log('User Avatar:', firstUser.user?.avatarUrl);
            console.log('User Avatar (snake):', firstUser.user?.avatar_url);
        } else {
            console.log('No data returned');
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

testTimeline();
