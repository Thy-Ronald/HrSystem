const express = require('express');
const { handleGithubLookup, handleIssuesByPeriod, handleGetRepositories, handleCacheCheck, handleRepoChanges, handleCommitsByPeriod, handleLanguagesByPeriod, handleGetTimeline } = require('../controllers/githubController');

const router = express.Router();

// GET /api/github/repos - Get all accessible repositories
router.get('/repos', handleGetRepositories);

// GET /api/github/issues?repo=owner/name&filter=today|yesterday|this-week|last-week|this-month
router.get('/issues', handleIssuesByPeriod);

// GET /api/github/commits?repo=owner/name&filter=today|yesterday|this-week|last-week|this-month
router.get('/commits', handleCommitsByPeriod);

// GET /api/github/languages?repo=owner/name&filter=today|yesterday|this-week|last-week|this-month
router.get('/languages', handleLanguagesByPeriod);

// GET /api/github/cache-check?repo=owner/name&filter=today - Lightweight cache status check
router.get('/cache-check', handleCacheCheck);

// GET /api/github/has-changes?repo=owner/name - Check if repo has changes using ETag (FREE - 304 doesn't count!)
router.get('/has-changes', handleRepoChanges);

// GET /api/github/timeline?repo=owner/name&filter=today|yesterday|this-week|last-week|this-month
router.get('/timeline', handleGetTimeline);

router.get('/:username', handleGithubLookup);

module.exports = router;

