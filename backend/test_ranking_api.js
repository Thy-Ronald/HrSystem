const { getIssuesByUserForPeriod } = require('./src/services/githubService');
require('dotenv').config();

async function test() {
    try {
        const repo = 'timeriver/cnd_chat';
        const filter = 'this-month';
        console.log(`Testing getIssuesByUserForPeriod for ${repo} (${filter})...`);
        const data = await getIssuesByUserForPeriod(repo, filter);
        console.log('Sample user data:');
        if (data && data.length > 0) {
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log('No data found.');
        }
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
