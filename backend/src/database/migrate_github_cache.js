/**
 * Migration: GitHub Issues Cache Tables
 * 
 * Creates tables for incremental caching of GitHub issues:
 * - github_issues_cache: Stores individual issues
 * - github_cache_metadata: Tracks last_fetched_at per repo/user
 * - github_user_issue_stats: Pre-aggregated stats for fast API responses
 * 
 * Run: node src/database/migrate_github_cache.js
 */

const { query, testConnection, closePool } = require('../config/database');

// SQL statements for creating tables
const CREATE_ISSUES_CACHE = `
CREATE TABLE IF NOT EXISTS github_issues_cache (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Internal primary key',
  github_issue_id BIGINT NOT NULL COMMENT 'GitHub issue ID (global unique)',
  issue_number INT NOT NULL COMMENT 'Issue number within the repository',
  repo_full_name VARCHAR(255) NOT NULL COMMENT 'Full repository name (owner/repo)',
  repo_owner VARCHAR(100) NOT NULL COMMENT 'Repository owner (extracted for indexing)',
  title VARCHAR(500) NOT NULL COMMENT 'Issue title',
  state ENUM('open', 'closed') NOT NULL DEFAULT 'open' COMMENT 'Issue state',
  assignees JSON COMMENT 'Array of assignee usernames',
  labels JSON COMMENT 'Array of label objects',
  status ENUM('assigned', 'inProgress', 'done', 'reviewed', 'devDeployed', 'devChecked') 
    NOT NULL DEFAULT 'assigned' COMMENT 'Derived status from labels',
  github_created_at DATETIME NOT NULL COMMENT 'When issue was created on GitHub',
  github_updated_at DATETIME NOT NULL COMMENT 'When issue was last updated on GitHub',
  last_assigned_at DATETIME COMMENT 'Most recent assignment event timestamp',
  last_assigned_user VARCHAR(100) COMMENT 'Username of most recently assigned user',
  cached_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When this record was cached',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last cache update',
  UNIQUE KEY uk_repo_issue (repo_full_name, issue_number),
  INDEX idx_github_issue_id (github_issue_id),
  INDEX idx_repo (repo_full_name),
  INDEX idx_repo_owner (repo_owner),
  INDEX idx_state (state),
  INDEX idx_status (status),
  INDEX idx_github_updated (github_updated_at),
  INDEX idx_last_assigned (last_assigned_at),
  INDEX idx_cached_at (cached_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cache for GitHub issues enabling incremental fetches'
`;

const CREATE_CACHE_METADATA = `
CREATE TABLE IF NOT EXISTS github_cache_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_full_name VARCHAR(255) NOT NULL COMMENT 'Repository full name',
  username VARCHAR(100) DEFAULT NULL COMMENT 'Optional: user-specific cache metadata',
  filter_type VARCHAR(50) DEFAULT 'all' COMMENT 'Filter type: all, today, this-week, etc.',
  last_fetched_at DATETIME NOT NULL COMMENT 'Last successful fetch timestamp',
  last_full_refresh_at DATETIME COMMENT 'Last time a full (non-incremental) fetch was done',
  total_issues_cached INT DEFAULT 0 COMMENT 'Total issues in cache for this scope',
  last_issues_fetched INT DEFAULT 0 COMMENT 'Issues fetched in last incremental update',
  etag VARCHAR(255) COMMENT 'GitHub ETag for conditional requests',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_repo_user_filter (repo_full_name, username, filter_type),
  INDEX idx_last_fetched (last_fetched_at),
  INDEX idx_repo (repo_full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Metadata for tracking incremental cache updates'
`;

const CREATE_USER_STATS = `
CREATE TABLE IF NOT EXISTS github_user_issue_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_full_name VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  period_type ENUM('today', 'yesterday', 'this-week', 'last-week', 'this-month') NOT NULL,
  period_start DATE NOT NULL COMMENT 'Start of the period',
  period_end DATE NOT NULL COMMENT 'End of the period',
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
  computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME COMMENT 'When this aggregation expires',
  UNIQUE KEY uk_stats (repo_full_name, username, period_type, period_start),
  INDEX idx_repo_period (repo_full_name, period_type),
  INDEX idx_username (username),
  INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pre-aggregated user issue statistics for fast API responses'
`;

async function runMigration() {
  console.log('🚀 Starting GitHub cache tables migration...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to database. Please check your configuration.');
    process.exit(1);
  }

  const tables = [
    { name: 'github_issues_cache', sql: CREATE_ISSUES_CACHE },
    { name: 'github_cache_metadata', sql: CREATE_CACHE_METADATA },
    { name: 'github_user_issue_stats', sql: CREATE_USER_STATS },
  ];

  try {
    for (const table of tables) {
      try {
        console.log(`⏳ Creating table: ${table.name}...`);
        await query(table.sql);
        console.log(`✅ ${table.name} - Created successfully`);
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`⚠️  ${table.name} - Already exists (skipped)`);
        } else {
          console.error(`❌ ${table.name} - Error: ${err.message}`);
          throw err;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('   - github_issues_cache (individual issues)');
    console.log('   - github_cache_metadata (fetch timestamps)');
    console.log('   - github_user_issue_stats (aggregated stats)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run migration
runMigration();
