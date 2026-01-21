const { getGithubProfileWithRepos } = require('../services/githubService');

async function handleGithubLookup(req, res, next) {
  try {
    const username = req.params.username;
    const data = await getGithubProfileWithRepos(username);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { handleGithubLookup };
