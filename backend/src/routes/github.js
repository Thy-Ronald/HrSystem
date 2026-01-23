const express = require('express');
const { handleGithubLookup, handleIssuesByPeriod, handleGetRepositories } = require('../controllers/githubController');

const router = express.Router();

// GET /api/github/repos - Get all accessible repositories
router.get('/repos', handleGetRepositories);

// GET /api/github/issues?repo=owner/name&filter=today|yesterday|this-week|last-week|this-month
router.get('/issues', handleIssuesByPeriod);

router.get('/:username', handleGithubLookup);

module.exports = router;

