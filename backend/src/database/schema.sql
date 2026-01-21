-- HR System Database Schema
-- MySQL 8+ compatible
-- Creates database and staff_contract table with proper constraints, defaults, and indexes

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS hr_system 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE hr_system;

-- Drop table if exists (for clean migration - comment out in production)
-- DROP TABLE IF EXISTS staff_contract;

-- Staff Contract table
CREATE TABLE IF NOT EXISTS staff_contract (
  -- Primary Key
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key, auto-increment',
  
  -- Required Fields
  name VARCHAR(255) NOT NULL COMMENT 'Employee full name',
  position VARCHAR(255) NOT NULL COMMENT 'Job title',
  assessment_date DATETIME NOT NULL COMMENT 'Assessment date',
  basic_salary INT NOT NULL DEFAULT 0 COMMENT 'Base salary',
  term_months INT NOT NULL DEFAULT 1 COMMENT 'Contract duration in months',
  
  -- Optional Fields
  allowance INT NULL DEFAULT NULL COMMENT 'Allowance',
  attendance_bonus FLOAT NULL DEFAULT NULL COMMENT 'Attendance bonus amount',
  full_attendance_bonus FLOAT NULL DEFAULT NULL COMMENT 'Perfect attendance bonus amount',
  signing_bonus VARCHAR(255) NULL DEFAULT NULL COMMENT 'Signing bonus notes or value',
  resignation_date DATETIME NULL DEFAULT NULL COMMENT 'Resignation date',
  
  -- Timestamps with auto-update
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp, auto-generated',
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp, auto-updated',
  
  -- Indexes for performance
  INDEX idx_name (name),
  INDEX idx_position (position),
  INDEX idx_assessment_date (assessment_date),
  INDEX idx_created_date (created_date),
  INDEX idx_resignation_date (resignation_date),
  INDEX idx_term_months (term_months),
  
  -- Constraints
  CONSTRAINT chk_basic_salary CHECK (basic_salary >= 0),
  CONSTRAINT chk_allowance CHECK (allowance IS NULL OR allowance >= 0),
  CONSTRAINT chk_attendance_bonus CHECK (attendance_bonus IS NULL OR attendance_bonus >= 0),
  CONSTRAINT chk_full_attendance_bonus CHECK (full_attendance_bonus IS NULL OR full_attendance_bonus >= 0),
  CONSTRAINT chk_term_months CHECK (term_months > 0),
  CONSTRAINT chk_resignation_date CHECK (resignation_date IS NULL OR resignation_date >= assessment_date)
) 
ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci
COMMENT='Stores employee contract information';

-- Verify table creation
SELECT 
  TABLE_NAME,
  ENGINE,
  TABLE_COLLATION,
  TABLE_COMMENT
FROM 
  information_schema.TABLES
WHERE 
  TABLE_SCHEMA = 'hr_system' 
  AND TABLE_NAME = 'staff_contract';
