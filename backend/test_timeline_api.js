const { getIssueTimeline } = require('./src/services/githubService');
require('dotenv').config();

async function test() {
    try {
        const repo = 'timeriver/cnd_chat';
        const filter = 'this-month';
        console.log(`Testing getIssueTimeline for ${repo} (${filter})...`);
        const data = await getIssueTimeline(repo, filter);
        console.log('User data count:', data.length);
        if (data && data.length > 0) {
            const user = data[0];
            console.log(`Username: ${user.user.login}`);
            console.log(`Issue count: ${user.issues.length}`);
            const firstIssue = user.issues[0];
            console.log(`First Issue: #${firstIssue.number} - ${firstIssue.title}`);
            console.log(`P-Value: ${firstIssue.pValue}`);
            const totalP = user.issues.reduce((acc, i) => acc + i.pValue, 0);
            console.log(`Total P: ${totalP}`);
        }
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
