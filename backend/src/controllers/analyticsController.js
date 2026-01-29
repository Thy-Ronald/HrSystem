const {
  getAnalyticsOverview,
  getDailyActivityTrends,
  getTopContributors,
  getLanguageDistribution,
} = require('../services/analyticsService');

async function handleAnalyticsOverview(req, res, next) {
  try {
    const { filter = 'this-month' } = req.query;
    const validFilters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    // Allow standard filters or custom month format (month-MM-YYYY)
    const isValidFilter = validFilters.includes(filter) || (filter && filter.startsWith('month-') && filter.match(/^month-\d{2}-\d{4}$/));
    if (!isValidFilter) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}, or a custom month format (month-MM-YYYY)`);
      error.status = 400;
      throw error;
    }

    const data = await getAnalyticsOverview(filter);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function handleDailyActivityTrends(req, res, next) {
  try {
    const { filter = 'this-month' } = req.query;
    const validFilters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    // Allow standard filters or custom month format (month-MM-YYYY)
    const isValidFilter = validFilters.includes(filter) || (filter && filter.startsWith('month-') && filter.match(/^month-\d{2}-\d{4}$/));
    if (!isValidFilter) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}, or a custom month format (month-MM-YYYY)`);
      error.status = 400;
      throw error;
    }

    const data = await getDailyActivityTrends(filter);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function handleTopContributors(req, res, next) {
  try {
    const { limit = 10, filter = 'this-month' } = req.query;
    const validFilters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    // Allow standard filters or custom month format (month-MM-YYYY)
    const isValidFilter = validFilters.includes(filter) || (filter && filter.startsWith('month-') && filter.match(/^month-\d{2}-\d{4}$/));
    if (!isValidFilter) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}, or a custom month format (month-MM-YYYY)`);
      error.status = 400;
      throw error;
    }

    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      const error = new Error('Limit must be between 1 and 50');
      error.status = 400;
      throw error;
    }

    const data = await getTopContributors(limitNum, filter);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function handleLanguageDistribution(req, res, next) {
  try {
    const { filter = 'all' } = req.query;
    const validFilters = ['all', 'today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    // Allow standard filters or custom month format (month-MM-YYYY)
    const isValidFilter = validFilters.includes(filter) || (filter && filter.startsWith('month-') && filter.match(/^month-\d{2}-\d{4}$/));
    if (!isValidFilter) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}, or a custom month format (month-MM-YYYY)`);
      error.status = 400;
      throw error;
    }

    const data = await getLanguageDistribution(filter);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleAnalyticsOverview,
  handleDailyActivityTrends,
  handleTopContributors,
  handleLanguageDistribution,
};
