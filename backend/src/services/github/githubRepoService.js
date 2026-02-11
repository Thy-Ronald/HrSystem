const { githubClient, withAuth } = require('./githubClients');
const { query } = require('../../config/database');
const {
    getCachedGitHubResponse,
    setCachedGitHubResponse,
    deleteCachedGitHubResponse
} = require('../../utils/githubCache');

const REPO_CACHE_TTL = 300000; // 5 minutes for repos

/**
 * Check if repository exists and get basic info (cached for 5 minutes)
 */
async function getRepoInfo(repoFullName) {
    const cacheKey = `repo_info:${repoFullName.replace('/', '_')}`;
    const cached = await getCachedGitHubResponse(cacheKey);
    if (cached && cached.data) return cached.data;

    try {
        const response = await githubClient.get(`/repos/${repoFullName}`, {
            headers: withAuth(),
        });
        // Cache for 5 minutes
        await setCachedGitHubResponse(cacheKey, response.data, null, 300);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
        throw error;
    }
}

/**
 * Fetch all repositories added via the Settings page for a specific user
 */
async function getAccessibleRepositories(userId = null) {
    const cacheKey = userId ? `accessible_repos_db_${userId}` : 'accessible_repos_db_all';
    const cached = await getCachedGitHubResponse(cacheKey);
    if (cached) {
        return cached.data;
    }

    try {
        // Fetch from tracked_repositories table
        let sql, params;
        if (userId) {
            sql = 'SELECT * FROM tracked_repositories WHERE user_id = ? ORDER BY added_at DESC';
            params = [userId];
        } else {
            // For background jobs, get unique repositories across all users
            sql = 'SELECT DISTINCT full_name, owner, name, description, stars, avatar_url FROM tracked_repositories ORDER BY added_at DESC';
            params = [];
        }

        const trackedRepos = await query(sql, params);

        const repos = trackedRepos.map(repo => ({
            owner: repo.owner,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            stars: repo.stars,
            avatarUrl: repo.avatar_url
        }));

        await setCachedGitHubResponse(cacheKey, repos);
        return repos;
    } catch (error) {
        console.error('[githubRepoService] getAccessibleRepositories DB error:', error.message);
        throw error;
    }
}

/**
 * Add a repository to tracked repositories for a specific user
 */
const addTrackedRepository = async (repoData, userId) => {
    try {
        const { fullName, name, owner, description, stars, avatarUrl } = repoData;

        // Clear previous tracked repositories FOR THIS USER only to enforce single repo mode per user if desired
        // Or keep multiple. The UI seems to imply one active repo being "changed".
        await query('DELETE FROM tracked_repositories WHERE user_id = ?', [userId]);

        const sql = `
            INSERT INTO tracked_repositories 
                (user_id, full_name, name, owner, description, stars, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        await query(sql, [
            userId,
            fullName,
            name,
            owner,
            description || '',
            stars || 0,
            avatarUrl || ''
        ]);

        // Invalidate cache for this user
        await deleteCachedGitHubResponse(`accessible_repos_db_${userId}`);

        return { success: true };
    } catch (error) {
        console.error('[githubRepoService] addTrackedRepository error:', error.message);
        throw error;
    }
}

/**
 * Remove a repository from tracked repositories for a specific user
 */
async function removeTrackedRepository(fullName, userId) {
    try {
        const sql = 'DELETE FROM tracked_repositories WHERE full_name = ? AND user_id = ?';
        await query(sql, [fullName, userId]);

        // Invalidate cache for this user
        await deleteCachedGitHubResponse(`accessible_repos_db_${userId}`);

        return { success: true };
    } catch (error) {
        console.error('[githubRepoService] removeTrackedRepository error:', error.message);
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

/**
 * Search repositories accessible by the token.
 * Caches the full /user/repos list for 2 minutes so subsequent
 * search keystrokes filter locally instead of hitting GitHub.
 */
async function searchRepositories(searchQuery) {
    if (!searchQuery || searchQuery.length < 2) return [];

    try {
        const cacheKey = 'search_repos_list';
        let allRepos;

        // Try to get cached repo list first
        const cached = await getCachedGitHubResponse(cacheKey);
        if (cached && cached.data) {
            allRepos = cached.data;
        } else {
            // Fetch from GitHub and cache for 2 minutes
            const response = await githubClient.get('/user/repos', {
                headers: withAuth(),
                params: {
                    sort: 'updated',
                    per_page: 100
                }
            });
            allRepos = response.data;
            await setCachedGitHubResponse(cacheKey, allRepos, null, 120);
        }

        // Filter locally based on the query
        const filtered = allRepos.filter(repo =>
            repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return filtered.slice(0, 10).map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            owner: repo.owner.login,
            avatarUrl: repo.owner.avatar_url
        }));
    } catch (error) {
        console.error('[githubRepoService] Search error:', error.message);
        return [];
    }
}

module.exports = {
    getAccessibleRepositories,
    getGithubProfileWithRepos,
    getRepoInfo,
    searchRepositories,
    addTrackedRepository,
    removeTrackedRepository
};
