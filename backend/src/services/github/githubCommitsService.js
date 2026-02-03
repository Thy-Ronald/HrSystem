const { githubClient, withAuth } = require('./githubClients');
const {
    generateCacheKey,
    getCachedGitHubResponse,
    setCachedGitHubResponse,
    getCachedETag,
    refreshCacheTTL
} = require('../../utils/githubCache');
const {
    getDateRange,
    getLanguageFromFile
} = require('./githubUtils');

const ALLOWED_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];

/**
 * Fetch commits from a repository grouped by user for a given period
 */
async function getCommitsByUserForPeriod(repoFullName, filter = 'today') {
    if (!ALLOWED_REPOS.includes(repoFullName)) {
        const error = new Error(`Commits can only be fetched for: ${ALLOWED_REPOS.join(', ')}`);
        error.status = 403;
        throw error;
    }

    const [owner, repo] = repoFullName.split('/');
    const cacheKey = generateCacheKey('commits', repoFullName, filter);
    const cached = await getCachedGitHubResponse(cacheKey);

    if (cached && cached.data) {
        return cached.data;
    }

    const { startDate, endDate } = getDateRange(filter);
    const cachedETag = await getCachedETag(cacheKey);
    const headers = withAuth();
    if (cachedETag) headers['If-None-Match'] = cachedETag;

    const userCommits = new Map();

    try {
        let hasNextPage = true;
        let page = 1;
        const maxPages = 10;
        let responseETag = null;

        while (hasNextPage && page <= maxPages) {
            const response = await githubClient.get(`/repos/${owner}/${repo}/commits`, {
                headers,
                params: {
                    since: startDate.toISOString(),
                    until: endDate.toISOString(),
                    per_page: 100,
                    page: page,
                },
                validateStatus: (status) => status === 200 || status === 304,
            });

            if (response.status === 304 && cached) {
                await refreshCacheTTL(cacheKey, cached.data, cachedETag);
                return cached.data;
            }

            responseETag = response.headers.etag || null;
            const commits = response.data;
            if (commits.length === 0) break;

            for (const commit of commits) {
                const author = commit.author || commit.committer;
                if (author && author.login) {
                    const username = author.login.toLowerCase().trim();
                    userCommits.set(username, (userCommits.get(username) || 0) + 1);
                }
            }

            const linkHeader = response.headers.link;
            hasNextPage = linkHeader && linkHeader.includes('rel="next"');
            page++;
        }

        const result = Array.from(userCommits.entries()).map(([username, commitCount]) => ({
            username,
            commits: commitCount,
            total: commitCount,
        })).sort((a, b) => b.commits - a.commits || a.username.localeCompare(b.username));

        await setCachedGitHubResponse(cacheKey, result, responseETag);
        return result;
    } catch (error) {
        if (error.response && error.response.status === 304 && cached) {
            await refreshCacheTTL(cacheKey, cached.data, cachedETag);
            return cached.data;
        }
        throw error;
    }
}

/**
 * Fetch languages used by each user from commits
 */
async function getLanguagesByUserForPeriod(repoFullName, filter = 'all') {
    if (!ALLOWED_REPOS.includes(repoFullName)) {
        const error = new Error(`Languages can only be fetched for: ${ALLOWED_REPOS.join(', ')}`);
        error.status = 403;
        throw error;
    }

    const [owner, repo] = repoFullName.split('/');
    const cacheKey = generateCacheKey('languages', repoFullName, filter);
    const cached = await getCachedGitHubResponse(cacheKey);

    if (cached && cached.data) {
        return cached.data;
    }

    const cachedETag = await getCachedETag(cacheKey);
    const headers = withAuth();
    if (cachedETag) headers['If-None-Match'] = cachedETag;

    const userLanguages = new Map();

    try {
        let hasNextPage = true;
        let page = 1;
        const maxPages = filter === 'all' ? 20 : 10;
        let responseETag = null;

        while (hasNextPage && page <= maxPages) {
            const commitParams = { per_page: 100, page: page };
            if (filter !== 'all') {
                const { startDate, endDate } = getDateRange(filter);
                commitParams.since = startDate.toISOString();
                commitParams.until = endDate.toISOString();
            }

            const response = await githubClient.get(`/repos/${owner}/${repo}/commits`, {
                headers,
                params: commitParams,
                validateStatus: (status) => status === 200 || status === 304,
            });

            if (response.status === 304 && cached) {
                await refreshCacheTTL(cacheKey, cached.data, cachedETag);
                return cached.data;
            }

            responseETag = response.headers.etag || null;
            const commits = response.data;
            if (commits.length === 0) break;

            const commitsToProcess = commits.slice(0, 50);
            for (const commit of commitsToProcess) {
                const author = commit.author || commit.committer;
                if (!author || !author.login) continue;

                const username = author.login.toLowerCase().trim();
                try {
                    const commitDetail = await githubClient.get(`/repos/${owner}/${repo}/commits/${commit.sha}`, { headers: withAuth() });
                    if (!userLanguages.has(username)) userLanguages.set(username, new Map());
                    const userLangMap = userLanguages.get(username);
                    (commitDetail.data.files || []).forEach(file => {
                        const lang = getLanguageFromFile(file.filename);
                        if (lang) userLangMap.set(lang, (userLangMap.get(lang) || 0) + 1);
                    });
                    await new Promise(r => setTimeout(r, 50));
                } catch (e) {
                    console.warn(`[Languages] Could not fetch commit ${commit.sha}:`, e.message);
                }
            }
            if (commitsToProcess.length < commits.length) hasNextPage = false;
            else {
                const linkHeader = response.headers.link;
                hasNextPage = linkHeader && linkHeader.includes('rel="next"');
                page++;
            }
        }

        const result = Array.from(userLanguages.entries()).map(([username, langMap]) => {
            const totalFiles = Array.from(langMap.values()).reduce((sum, count) => sum + count, 0);
            const sortedLangs = Array.from(langMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([lang, count]) => ({
                    language: lang,
                    count,
                    percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0
                }));
            return { username, topLanguages: sortedLangs, totalFiles };
        }).sort((a, b) => b.totalFiles - a.totalFiles || a.username.localeCompare(b.username));

        await setCachedGitHubResponse(cacheKey, result, responseETag);
        return result;
    } catch (error) {
        if (error.response && error.response.status === 304 && cached) {
            await refreshCacheTTL(cacheKey, cached.data, cachedETag);
            return cached.data;
        }
        throw error;
    }
}

module.exports = {
    getCommitsByUserForPeriod,
    getLanguagesByUserForPeriod
};
