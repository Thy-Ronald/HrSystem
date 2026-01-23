-- GitHub Issues Cache Schema
-- MySQL 8+ compatible
-- Stores cached GitHub issues for incremental fetching

USE hr_system;

-- ============================================================================
-- Table: github_issues_cache
-- 
-- Stores individual GitHub issues with their current state.
-- This allows incremental updates using GitHub's `updated_since` parameter.
-- ============================================================================
CREATE TABLE IF NOT EXISTS github_issues_cache (
  -- Primary Key: Composite of repo + issue number for uniqueness
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Internal primary key',
  
  -- GitHub identifiers
  github_issue_id BIGINT NOT NULL COMMENT 'GitHub issue ID (global unique)',
  issue_number INT NOT NULL COMMENT 'Issue number within the repository',
  
  -- Repository information
  repo_full_name VARCHAR(255) NOT NULL COMMENT 'Full repository name (owner/repo)',
  repo_owner VARCHAR(100) NOT NULL COMMENT 'Repository owner (extracted for indexing)',
  
  -- Issue metadata
  title VARCHAR(500) NOT NULL COMMENT 'Issue title',
  state ENUM('open', 'closed') NOT NULL DEFAULT 'open' COMMENT 'Issue state',
  
  -- Assignees stored as JSON array of usernames
  assignees JSON COMMENT 'Array of assignee usernames: ["user1", "user2"]',
  
  -- Labels stored as JSON array
  labels JSON COMMENT 'Array of label objects: [{"name": "bug", "color": "red"}]',
  
  -- Status derived from labels (cached for performance)
  status ENUM('assigned', 'inProgress', 'done', 'reviewed', 'devDeployed', 'devChecked') 
    NOT NULL DEFAULT 'assigned' COMMENT 'Derived status from labels',
  
  -- Timestamps from GitHub
  github_created_at DATETIME NOT NULL COMMENT 'When issue was created on GitHub',
  github_updated_at DATETIME NOT NULL COMMENT 'When issue was last updated on GitHub',
  
  -- Assignment tracking (for date range filtering)
  last_assigned_at DATETIME COMMENT 'Most recent assignment event timestamp',
  last_assigned_user VARCHAR(100) COMMENT 'Username of most recently assigned user',
  
  -- Cache metadata
  cached_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When this record was cached',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last cache update',
  
  -- Indexes for fast lookups
  UNIQUE KEY uk_repo_issue (repo_full_name, issue_number),
  INDEX idx_github_issue_id (github_issue_id),
  INDEX idx_repo (repo_full_name),
  INDEX idx_repo_owner (repo_owner),
  INDEX idx_state (state),
  INDEX idx_status (status),
  INDEX idx_github_updated (github_updated_at),
  INDEX idx_last_assigned (last_assigned_at),
  INDEX idx_cached_at (cached_at),
  
  -- Full-text index for searching assignees
  INDEX idx_assignees ((CAST(assignees AS CHAR(500))))
  
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci
COMMENT='Cache for GitHub issues enabling incremental fetches';


-- ============================================================================
-- Table: github_cache_metadata
-- 
-- Tracks last fetch timestamp per repo (and optionally per user).
-- Used to calculate `updated_since` parameter for incremental updates.
-- ============================================================================
CREATE TABLE IF NOT EXISTS github_cache_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Cache scope (repo level or repo+user level)
  repo_full_name VARCHAR(255) NOT NULL COMMENT 'Repository full name',
  username VARCHAR(100) DEFAULT NULL COMMENT 'Optional: user-specific cache metadata',
  filter_type VARCHAR(50) DEFAULT 'all' COMMENT 'Filter type: all, today, this-week, etc.',
  
  -- Fetch tracking
  last_fetched_at DATETIME NOT NULL COMMENT 'Last successful fetch timestamp',
  last_full_refresh_at DATETIME COMMENT 'Last time a full (non-incremental) fetch was done',
  
  -- Statistics
  total_issues_cached INT DEFAULT 0 COMMENT 'Total issues in cache for this scope',
  last_issues_fetched INT DEFAULT 0 COMMENT 'Issues fetched in last incremental update',
  
  -- ETags for conditional requests (304 Not Modified)
  etag VARCHAR(255) COMMENT 'GitHub ETag for conditional requests',
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique constraint: one metadata row per repo (or repo+user)
  UNIQUE KEY uk_repo_user_filter (repo_full_name, username, filter_type),
  INDEX idx_last_fetched (last_fetched_at),
  INDEX idx_repo (repo_full_name)
  
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci
COMMENT='Metadata for tracking incremental cache updates';


-- ============================================================================
-- Table: github_user_issue_stats
-- 
-- Pre-aggregated stats per user/repo/period for fast API responses.
-- Updated when issues are cached/updated.
-- ============================================================================
CREATE TABLE IF NOT EXISTS github_user_issue_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Scope
  repo_full_name VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  period_type ENUM('today', 'yesterday', 'this-week', 'last-week', 'this-month') NOT NULL,
  period_start DATE NOT NULL COMMENT 'Start of the period',
  period_end DATE NOT NULL COMMENT 'End of the period',
  
  -- Aggregated stats by status
  assigned_count INT NOT NULL DEFAULT 0,
  in_progress_count INT NOT NULL DEFAULT 0,
  done_count INT NOT NULL DEFAULT 0,
  reviewed_count INT NOT NULL DEFAULT 0,
  dev_deployed_count INT NOT NULL DEFAULT 0,
  dev_checked_count INT NOT NULL DEFAULT 0,
  total_count INT GENERATED ALWAYS AS (
    assigned_count + in_progress_count + done_count + 
    reviewed_count + dev_deployed_count + dev_checked_count
  ) STORED,
  
  -- Cache metadata
  computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME COMMENT 'When this aggregation expires',
  
  -- Unique per repo/user/period
  UNIQUE KEY uk_stats (repo_full_name, username, period_type, period_start),
  INDEX idx_repo_period (repo_full_name, period_type),
  INDEX idx_username (username),
  INDEX idx_valid_until (valid_until)
  
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci
COMMENT='Pre-aggregated user issue statistics for fast API responses';
