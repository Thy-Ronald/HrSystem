const { githubClient, withAuth } = require('./githubClients');
const {
    getCachedGitHubResponse,
    setCachedGitHubResponse,
} = require('../../utils/githubCache');

const REPO_CACHE_TTL = 300000; // 5 minutes for repos

/**
 * Check if repository exists and get basic info
 */
async function getRepoInfo(repoFullName) {
    try {
        const response = await githubClient.get(`/repos/${repoFullName}`, {
            headers: withAuth(),
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
        throw error;
    }
}

/**
 * Fetch all repositories accessible via the GitHub token
 */
async function getAccessibleRepositories() {
    const cacheKey = 'accessible_repos_filtered';
    const cached = await getCachedGitHubResponse(cacheKey);

    // Check if valid and within TTL (manually for repos)
    if (cached && (Date.now() - new Date(cached.timestamp || 0).getTime() < REPO_CACHE_TTL)) {
        return cached.data;
    }

    const allowedRepos = [
        { owner: 'timeriver', name: 'cnd_chat', fullName: 'timeriver/cnd_chat' },
        { owner: 'timeriver', name: 'sacsys009', fullName: 'timeriver/sacsys009' },
    ];

    try {
        const repos = [];
        for (const repoInfo of allowedRepos) {
            const repo = await getRepoInfo(repoInfo.fullName);
            if (repo) {
                repos.push({
                    owner: repo.owner.login,
                    name: repo.name,
                    fullName: repo.full_name,
                });
            }
        }

        await setCachedGitHubResponse(cacheKey, repos);
        return repos;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            const err = new Error('GitHub authentication failed. Check your GITHUB_TOKEN.');
            err.status = 401;
            throw err;
        }
        throw error;
    }
}

/**
 * Fetch user profile and their repositories
 */
async function getGithubProfileWithRepos(username) {
    if (!username) {
        const error = new Error('Username is required');
        error.status = 400;
        throw error;
    }

    try {
        const [profileRes, reposRes] = await Promise.all([
            githubClient.get(`/users/${username}`, { headers: withAuth() }),
            githubClient.get(`/users/${username}/repos`, {
                headers: withAuth(),
                params: { per_page: 100, sort: 'updated' },
            }),
        ]);

        const profile = profileRes.data;
        const repos = reposRes.data;

        const languageUsage = repos.reduce((acc, repo) => {
            const lang = repo.language;
            if (!lang) return acc;
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
        }, {});

        return {
            profile: {
                login: profile.login,
                name: profile.name,
                company: profile.company,
                avatarUrl: profile.avatar_url,
                bio: profile.bio,
                followers: profile.followers,
                following: profile.following,
                publicRepos: profile.public_repos,
                location: profile.location,
                blog: profile.blog,
            },
            repos: repos.map((repo) => ({
                id: repo.id,
                name: repo.name,
                description: repo.description,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                updatedAt: repo.updated_at,
                htmlUrl: repo.html_url,
            })),
            languageUsage,
        };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            const err = new Error('GitHub user not found');
            err.status = 404;
            throw err;
        }
        if (error.response && error.response.status === 403) {
            const err = new Error('GitHub API rate limit exceeded');
            err.status = 429;
            throw err;
        }
        throw error;
    }
}

module.exports = {
    getAccessibleRepositories,
    getGithubProfileWithRepos,
    getRepoInfo
};
