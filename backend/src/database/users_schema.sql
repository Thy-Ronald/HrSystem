-- Users table for authentication
-- MySQL 8+ compatible

USE hr_system;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key, auto-increment',
  
  -- Authentication fields
  email VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email (unique)',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Hashed password (bcrypt)',
  
  -- User info
  name VARCHAR(255) NOT NULL COMMENT 'User full name',
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee' COMMENT 'User role',
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts for authentication';
