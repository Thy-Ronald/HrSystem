const axios = require('axios');

const githubClient = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        Accept: 'application/vnd.github+json',
    },
});

const githubGraphQLClient = axios.create({
    baseURL: 'https://api.github.com/graphql',
    headers: {
        Accept: 'application/vnd.github+json',
    },
});

const withAuth = () => {
    const token = process.env.GITHUB_TOKEN;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

module.exports = {
    githubClient,
    githubGraphQLClient,
    withAuth
};
