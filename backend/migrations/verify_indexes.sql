-- Verification Script: Check if all indexes and tables exist

-- 1. Show all indexes on github_issues_cache table
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'hr_system'
  AND TABLE_NAME = 'github_issues_cache'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 2. Check if github_user_issue_stats table exists
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'hr_system'
  AND TABLE_NAME = 'github_user_issue_stats';

-- 3. Show structure of stats table
DESCRIBE github_user_issue_stats;
