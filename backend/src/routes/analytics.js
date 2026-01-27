const express = require('express');
const {
  handleAnalyticsOverview,
  handleDailyActivityTrends,
  handleTopContributors,
  handleLanguageDistribution,
} = require('../controllers/analyticsController');

const router = express.Router();

// GET /api/analytics/overview?filter=this-month
router.get('/overview', handleAnalyticsOverview);

// GET /api/analytics/trends?filter=this-month
router.get('/trends', handleDailyActivityTrends);

// GET /api/analytics/top-contributors?limit=10&filter=this-month
router.get('/top-contributors', handleTopContributors);

// GET /api/analytics/languages?filter=all
router.get('/languages', handleLanguageDistribution);

module.exports = router;
