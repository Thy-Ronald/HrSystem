const axios = require('axios');

const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
  },
});

const withAuth = () => {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

module.exports = { getGithubProfileWithRepos };

