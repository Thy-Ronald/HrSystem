-- ============================================================================
-- Performance Optimization Migration
-- Adds indexes and stats table for faster queries
-- ============================================================================

-- Add indexes to github_issues_cache table
-- These dramatically improve query performance (10-100x faster)

-- Index for repo + date range queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_repo_assigned_date 
ON github_issues_cache(repo_full_name, last_assigned_at);

-- Index for repo + status queries
CREATE INDEX IF NOT EXISTS idx_repo_status 
ON github_issues_cache(repo_full_name, status);

-- Index for repo + state queries  
CREATE INDEX IF NOT EXISTS idx_repo_state 
ON github_issues_cache(repo_full_name, state);

-- Composite index for the most common query pattern
-- This covers queries that filter by repo, date, and status together
CREATE INDEX IF NOT EXISTS idx_repo_date_status 
ON github_issues_cache(repo_full_name, last_assigned_at, status);

-- Index for GitHub issue ID lookups (for updates)
CREATE INDEX IF NOT EXISTS idx_github_issue_id 
ON github_issues_cache(github_issue_id);

-- ============================================================================
-- Create pre-computed stats table for ultra-fast queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS github_user_issue_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_full_name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  filter_type ENUM('today', 'yesterday', 'this-week', 'last-week', 'this-month') NOT NULL,
  status ENUM('assigned', 'inProgress', 'done', 'reviewed', 'devDeployed', 'devChecked') NOT NULL,
  issue_count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicates
  UNIQUE KEY unique_stat (repo_full_name, username, filter_type, status),
  
  -- Indexes for fast lookups
  INDEX idx_repo_filter (repo_full_name, filter_type),
  INDEX idx_username (username),
  INDEX idx_repo_username (repo_full_name, username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Verify indexes were created
-- ============================================================================

-- Run this to check indexes:
-- SHOW INDEX FROM github_issues_cache;
-- SHOW INDEX FROM github_user_issue_stats;

-- ============================================================================
-- Performance Testing Queries
-- ============================================================================

-- Test query performance before/after:
-- EXPLAIN SELECT * FROM github_issues_cache 
-- WHERE repo_full_name = 'timeriver/cnd_chat' 
-- AND last_assigned_at >= '2026-01-26 00:00:00' 
-- AND last_assigned_at <= '2026-01-26 23:59:59';
