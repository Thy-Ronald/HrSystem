/**
 * Ranking Feature Constants
 * Centralized configuration for the ranking system
 */

// LocalStorage keys (for UI preferences only, not backend data caching)
export const STORAGE_KEYS = {
  ACTIVE_FILTER: 'ranking_activeFilter',
  VIEW_MODE: 'ranking_viewMode',
  SELECTED_REPO: 'ranking_selectedRepo',
  SELECTED_REPOS: 'ranking_selectedRepos',
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

// Ranking types
export const RANKING_TYPES = {
  ISSUES: 'issues',
  COMMITS: 'commits',
};

export const RANKING_TYPE_LABELS = {
  [RANKING_TYPES.ISSUES]: 'Issues',
  [RANKING_TYPES.COMMITS]: 'Top Commits',
};

// Table columns configuration for issues
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

// Table columns configuration for commits
export const COMMITS_TABLE_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'commits', label: 'Commits' },
];
