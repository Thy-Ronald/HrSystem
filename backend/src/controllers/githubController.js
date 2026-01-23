const { getGithubProfileWithRepos, getIssuesByUserForPeriod, getAccessibleRepositories } = require('../services/githubService');

async function handleGithubLookup(req, res, next) {
  try {
    const username = req.params.username;
    const data = await getGithubProfileWithRepos(username);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function handleGetRepositories(req, res, next) {
  try {
    const data = await getAccessibleRepositories();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function handleIssuesByPeriod(req, res, next) {
  try {
    const { repo, filter = 'today' } = req.query;
    
    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }
    
    const validFilters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    if (!validFilters.includes(filter)) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}`);
      error.status = 400;
      throw error;
    }
    
    const data = await getIssuesByUserForPeriod(repo, filter);
    res.json({
      success: true,
      data,
      repo,
      filter,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { handleGithubLookup, handleIssuesByPeriod, handleGetRepositories };
