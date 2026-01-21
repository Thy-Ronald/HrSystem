const express = require('express');
const { handleGithubLookup } = require('../controllers/githubController');

const router = express.Router();

router.get('/:username', handleGithubLookup);

module.exports = router;

