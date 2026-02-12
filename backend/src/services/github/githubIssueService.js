const { githubGraphQLClient, withAuth } = require('./githubClients');
const {
    generateCacheKey,
    getCachedGitHubResponse,
    setCachedGitHubResponse,
} = require('../../utils/githubCache');
const {
    getDateRange,
    extractPValue,
    mapLabelToStatus,
    STATUS_PRIORITY_ORDER,
    extractEvidence
} = require('./githubUtils');
const { coalesce } = require('../../utils/requestCoalescing');

/**
 * Get cache TTL based on filter — past dates never change so cache for 24hr.
 * Today's data changes, so cache for 30 min.
 */
function getCacheTtl(filter) {
    if (filter === 'today') return 1800;      // 30 min
    if (filter === 'yesterday') return 86400; // 24hr (yesterday is done)
    if (filter === 'this-week') return 1800;  // 30 min (includes today)
    return 86400; // last-week, this-month, etc. — historical, cache 24hr
}

/**
 * Fetch issues from a repository assigned within date range
 */
async function getIssuesByUserForPeriod(repoFullName, filter = 'today', forceRefresh = false) {
    const cacheKey = generateCacheKey('issues', repoFullName, filter);

    if (!forceRefresh) {
        const cached = await getCachedGitHubResponse(cacheKey);
        if (cached && cached.data) {
            return cached.data;
        }
    } else {
        console.log(`[IssueCache] Force refresh requested for ${repoFullName} (${filter})`);
    }

    // Coalesce: if 10 users request the same data concurrently,
    // only 1 GitHub API call is made. Others wait for the same promise.
    return coalesce(cacheKey, () => _fetchIssuesByUserForPeriod(repoFullName, filter, cacheKey));
}

async function _fetchIssuesByUserForPeriod(repoFullName, filter, cacheKey) {
    const [owner, repo] = repoFullName.split('/');

    const { startDate, endDate } = getDateRange(filter);
    const cutoffDate = new Date(startDate);
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const userStats = new Map();
    const initUserStats = () => ({
        assigned: 0,
        assignedP: 0,
        inProgress: 0,
        done: 0,
        reviewed: 0,
        devDeployed: 0,
        devChecked: 0,
    });

    const statusLabelsMap = {
        devChecked: ['5:dev checked'],
        devDeployed: ['4:dev deployed'],
        reviewed: ['2.5 review'],
        done: ['3:local done'],
        inProgress: ['2:in progress'],
        timeUp: ['time up'],
    };

    const getStatusFromLabels = (labels) => {
        if (!labels || !Array.isArray(labels)) return 'Assigned';
        const labelNames = labels
            .filter(l => l && l.name)
            .map((l) => l.name.toLowerCase());

        for (const name of labelNames) {
            if (statusLabelsMap.devChecked.includes(name)) return 'Dev Checked';
            if (statusLabelsMap.devDeployed.includes(name)) return 'Dev Deployed';
            if (statusLabelsMap.reviewed.includes(name)) return 'Review';
            if (statusLabelsMap.done.includes(name)) return 'Local Done';
            if (statusLabelsMap.timeUp.includes(name)) return 'Time Up';
            if (statusLabelsMap.inProgress.includes(name)) return 'In Progress';
        }
        return 'Assigned';
    };

    try {
        let hasNextPage = true;
        let cursor = null;
        let pageCount = 0;
        const maxPages = 10;

        while (hasNextPage && pageCount < maxPages) {
            pageCount++;
            const query = `
                query GetIssues($owner: String!, $repo: String!, $cursor: String) {
                    repository(owner: $owner, name: $repo) {
                        issues(first: 100, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
                            pageInfo { hasNextPage, endCursor }
                            nodes {
                                id, number, state, updatedAt, title, body
                                labels(first: 10) { nodes { name } }
                                assignees(first: 10) { nodes { login } }
                                timelineItems(first: 20, itemTypes: [ASSIGNED_EVENT]) {
                                    nodes {
                                        ... on AssignedEvent {
                                            createdAt
                                            assignee { ... on User { login } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            const authHeaders = await withAuth();
            const response = await githubGraphQLClient.post('', { query, variables: { owner, repo, cursor } }, { headers: authHeaders });
            if (response.data.errors) throw new Error(response.data.errors[0]?.message || 'GraphQL query failed');

            const issues = response.data.data?.repository?.issues?.nodes || [];
            const pageInfo = response.data.data?.repository?.issues?.pageInfo;
            let shouldContinue = true;

            for (const issue of issues) {
                if (new Date(issue.updatedAt) < cutoffDate) {
                    shouldContinue = false;
                    break;
                }

                const currentAssignees = new Set((issue.assignees?.nodes || []).map((a) => a.login));
                if (currentAssignees.size > 0) {
                    const status = getStatusFromLabels(issue.labels?.nodes || []);
                    const userLastAssignment = new Map();
                    for (const event of issue.timelineItems?.nodes || []) {
                        if (event.assignee?.login && event.createdAt) {
                            const eventDate = new Date(event.createdAt);
                            const username = event.assignee.login;
                            if (!userLastAssignment.has(username) || userLastAssignment.get(username) < eventDate) {
                                userLastAssignment.set(username, eventDate);
                            }
                        }
                    }

                    for (const [username, assignmentDate] of userLastAssignment.entries()) {
                        const isInRange = assignmentDate >= startDate && assignmentDate <= endDate;
                        const isAssignee = currentAssignees.has(username);

                        if (!isInRange && isAssignee) {
                            // console.log(`[IssueCache] Issue #${issue.number} for ${username} outside range (${assignmentDate.toISOString()} vs ${startDate.toISOString()})`);
                        }

                        if (isInRange && isAssignee) {
                            if (!userStats.has(username)) userStats.set(username, initUserStats());
                            const stats = userStats.get(username);

                            // Map canonical status to property names
                            if (status === 'Dev Checked') stats.devChecked++;
                            else if (status === 'Dev Deployed') stats.devDeployed++;
                            else if (status === 'Local Done') stats.done++;
                            else if (status === 'Review') stats.reviewed++;
                            else if (status === 'In Progress') stats.inProgress++;
                            else stats.assigned++;

                            let pVal = extractPValue(issue.title) + extractPValue(issue.body);
                            (issue.labels?.nodes || []).forEach(l => pVal += extractPValue(l.name));
                            stats.assignedP += pVal;
                        }
                    }
                }
            }
            if (!shouldContinue) hasNextPage = false;
            else {
                hasNextPage = pageInfo?.hasNextPage || false;
                cursor = pageInfo?.endCursor || null;
            }
        }

        const result = Array.from(userStats.entries())
            .map(([username, stats]) => ({
                username,
                assigned: stats.assigned,
                assignedP: stats.assignedP,
                inProgress: stats.inProgress,
                done: stats.done,
                reviewed: stats.reviewed,
                devDeployed: stats.devDeployed,
                devChecked: stats.devChecked,
                total: stats.assigned + stats.inProgress + stats.done + stats.reviewed + stats.devDeployed + stats.devChecked,
            }))
            .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

        await setCachedGitHubResponse(cacheKey, result, null, getCacheTtl(filter));
        return result;
    } catch (error) {
        throw error;
    }
}

/**
 * Fetch detailed timeline for issues
 */
async function getIssueTimeline(repoFullName, filter = 'this-month', date = null) {
    const cacheKey = generateCacheKey('timeline', repoFullName, filter, date);
    const cached = await getCachedGitHubResponse(cacheKey);
    if (cached && cached.data) return cached.data;

    // Coalesce concurrent requests for the same timeline data
    return coalesce(cacheKey, () => _fetchIssueTimeline(repoFullName, filter, date, cacheKey));
}

async function _fetchIssueTimeline(repoFullName, filter, date, cacheKey) {
    const [owner, repo] = repoFullName.split('/');

    let startDate, endDate;
    if (date) {
        startDate = new Date(date); startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date); endDate.setHours(23, 59, 59, 999);
    } else {
        const range = getDateRange(filter);
        startDate = range.startDate; endDate = range.endDate;
    }

    const cutoffDate = new Date(startDate);
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    try {
        let hasNextPage = true;
        let cursor = null;
        let allIssues = [];
        let pageCount = 0;
        const maxPages = 15;

        while (hasNextPage && pageCount < maxPages) {
            pageCount++;
            const query = `
                query GetIssueTimeline($owner: String!, $repo: String!, $cursor: String) {
                    repository(owner: $owner, name: $repo) {
                        issues(first: 50, after: $cursor, states: [OPEN], orderBy: { field: UPDATED_AT, direction: DESC }) {
                            pageInfo { hasNextPage, endCursor }
                            nodes {
                                id, number, title, url, body, state, updatedAt, createdAt
                                author { login, avatarUrl }
                                assignees(first: 5) { nodes { login, name, avatarUrl } }
                                labels(first: 20) { nodes { name, color } }
                                comments(last: 10) {
                                    nodes {
                                        body
                                        author { login }
                                        createdAt
                                    }
                                }
                                timelineItems(last: 200, itemTypes: [LABELED_EVENT, UNLABELED_EVENT, ASSIGNED_EVENT]) {
                                    nodes {
                                        __typename
                                        ... on LabeledEvent { createdAt, label { name, color } }
                                        ... on UnlabeledEvent { createdAt, label { name, color } }
                                        ... on AssignedEvent { createdAt, assignee { ... on User { login, avatarUrl } } }
                                    }
                                }
                            }
                        }
                    }
                }
            `;
            const authHeaders = await withAuth();
            const response = await githubGraphQLClient.post('', { query, variables: { owner, repo, cursor } }, { headers: authHeaders });
            if (response.data.errors) throw new Error(response.data.errors[0]?.message || 'GraphQL query failed');

            const issues = response.data.data?.repository?.issues?.nodes || [];
            const pageInfo = response.data.data?.repository?.issues?.pageInfo;
            let shouldContinue = true;

            for (const issue of issues) {
                if (new Date(issue.updatedAt) < cutoffDate && issue.state === 'CLOSED') {
                    shouldContinue = false;
                }

                let basePValue = extractPValue(issue.title) + extractPValue(issue.body);
                (issue.labels?.nodes || []).forEach(label => basePValue += extractPValue(label.name));

                const events = (issue.timelineItems?.nodes || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                const userLastAssignment = new Map();
                events.forEach(event => {
                    if (event.__typename === 'AssignedEvent' && event.assignee?.login && event.createdAt) {
                        const eventDate = new Date(event.createdAt);
                        const username = event.assignee.login;
                        if (!userLastAssignment.has(username) || userLastAssignment.get(username) < eventDate) {
                            userLastAssignment.set(username, eventDate);
                        }
                    }
                });

                const currentAssignees = new Set((issue.assignees?.nodes || []).map(a => a.login));
                for (const [username, assignmentDate] of userLastAssignment.entries()) {
                    if (currentAssignees.has(username) && assignmentDate >= startDate && assignmentDate <= endDate) {
                        const assigneeNode = issue.assignees?.nodes?.find(n => n.login === username);
                        if (!assigneeNode) continue;
                        const statusHistory = [];
                        let currentStatus = 'Assigned';
                        let statusStartTime = new Date(issue.createdAt);

                        events.forEach(event => {
                            const eventDate = new Date(event.createdAt);
                            if (event.__typename === 'LabeledEvent' && event.label) {
                                const newStatus = mapLabelToStatus(event.label.name);
                                if (newStatus && newStatus !== currentStatus) {
                                    statusHistory.push({ status: currentStatus, startDate: statusStartTime, endDate: eventDate, durationMs: eventDate - statusStartTime });
                                    currentStatus = newStatus; statusStartTime = eventDate;
                                }
                            } else if (event.__typename === 'UnlabeledEvent' && event.label) {
                                if (mapLabelToStatus(event.label.name) === currentStatus) {
                                    statusHistory.push({ status: currentStatus, startDate: statusStartTime, endDate: eventDate, durationMs: eventDate - statusStartTime });
                                    currentStatus = 'Assigned'; statusStartTime = eventDate;
                                }
                            }
                        });

                        const currentLabels = (issue.labels?.nodes || []).map(l => l.name);
                        const highestLabelStatus = STATUS_PRIORITY_ORDER.find(status => currentLabels.some(labelName => mapLabelToStatus(labelName) === status));
                        if (highestLabelStatus && highestLabelStatus !== currentStatus) {
                            const transitionTime = new Date(issue.updatedAt);
                            if (transitionTime > statusStartTime) {
                                statusHistory.push({ status: currentStatus, startDate: statusStartTime, endDate: transitionTime, durationMs: transitionTime - statusStartTime });
                                currentStatus = highestLabelStatus; statusStartTime = transitionTime;
                            }
                        }

                        const isTerminal = ['Local Done', 'Dev Deployed', 'Dev Checked', 'Time Up'].includes(currentStatus);
                        const endTime = (issue.state === 'CLOSED' || isTerminal) ? statusStartTime : new Date();
                        statusHistory.push({ status: currentStatus, startDate: statusStartTime, endDate: endTime, durationMs: Math.max(0, endTime - statusStartTime) });

                        // Extract evidence from issue body and comments
                        const evidence = extractEvidence(issue.body, issue.comments?.nodes || []);

                        allIssues.push({ id: `${issue.id}_${username}`, number: issue.number, title: issue.title, url: issue.url, state: issue.state, pValue: basePValue, createdAt: issue.createdAt, updatedAt: issue.updatedAt, author: issue.author, assignee: assigneeNode, statusHistory, currentStatus, evidence });
                    }
                }
            }
            if (!shouldContinue || !pageInfo?.hasNextPage) hasNextPage = false;
            else cursor = pageInfo.endCursor;
        }

        const issuesByUser = {};
        allIssues.forEach(issue => {
            if (!issue.assignee || !issue.assignee.login) return;
            const username = issue.assignee.login;
            if (!issuesByUser[username]) issuesByUser[username] = { user: issue.assignee, issues: [], totalP: 0 };
            issuesByUser[username].issues.push(issue);
            if (issue.state === 'OPEN' && !(['Local Done', 'Dev Deployed', 'Dev Checked', 'Time Up'].includes(issue.currentStatus))) {
                issuesByUser[username].totalP += (issue.pValue || 0);
            }
        });

        const result = Object.values(issuesByUser);
        await setCachedGitHubResponse(cacheKey, result, null, getCacheTtl(filter || 'today'));
        return result;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    getIssuesByUserForPeriod,
    getIssueTimeline
};
