-- Migration to add GitHub OAuth support
USE hr_system;

ALTER TABLE users
ADD COLUMN github_id VARCHAR(255) NULL UNIQUE AFTER role,
ADD COLUMN avatar_url TEXT NULL AFTER github_id,
MODIFY COLUMN password_hash VARCHAR(255) NULL COMMENT 'Nullable for OAuth users';
