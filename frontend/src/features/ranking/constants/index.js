/**
 * Ranking Feature Constants
 * Centralized configuration for the ranking system
 */

// Cache versioning - increment when data structure changes
export const CURRENT_CACHE_VERSION = 7;

// LocalStorage keys
export const STORAGE_KEYS = {
  ACTIVE_FILTER: 'ranking_activeFilter',
  VIEW_MODE: 'ranking_viewMode',
  RANKING_DATA: 'ranking_data',
  SELECTED_REPO: 'ranking_selectedRepo',
  CACHE: 'ranking_cache',
  CACHE_VERSION: 'ranking_cacheVersion',
};

// Filter options
export const QUICK_FILTERS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this-week',
  LAST_WEEK: 'last-week',
  THIS_MONTH: 'this-month',
};

export const FILTER_LABELS = {
  [QUICK_FILTERS.TODAY]: 'Today',
  [QUICK_FILTERS.YESTERDAY]: 'Yesterday',
  [QUICK_FILTERS.THIS_WEEK]: 'This Week',
  [QUICK_FILTERS.LAST_WEEK]: 'Last Week',
  [QUICK_FILTERS.THIS_MONTH]: 'This Month',
};

// View modes
export const VIEW_MODES = {
  RANK: 'rank',
  GRAPH: 'graph',
};

// Table columns configuration
export const TABLE_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'assignedCards', label: 'Assigned Cards' },
  { key: 'assignedP', label: 'Assigned P' },
  { key: 'inProgressCards', label: 'In Progress Cards' },
  { key: 'doneCards', label: 'Done Cards' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'devDeployed', label: 'Dev Deployed' },
  { key: 'devChecked', label: 'Dev Checked' },
];
