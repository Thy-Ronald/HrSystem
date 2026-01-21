-- Migration script to add expiration_date column to existing staff_contract table
-- Run this in phpMyAdmin or MySQL client if you already have the table created

USE hr_system;

-- Add expiration_date column
-- Note: Remove this line if column already exists to avoid error
ALTER TABLE staff_contract 
ADD COLUMN expiration_date DATETIME NULL DEFAULT NULL 
COMMENT 'Contract expiration date (calculated from assessment_date + term_months if not provided)' 
AFTER signing_bonus;

-- Add index for expiration_date
CREATE INDEX idx_expiration_date ON staff_contract(expiration_date);

-- Add constraint for expiration_date
ALTER TABLE staff_contract
ADD CONSTRAINT chk_expiration_date 
CHECK (expiration_date IS NULL OR expiration_date >= assessment_date);

-- Calculate expiration_date for existing records (assessment_date + term_months)
UPDATE staff_contract
SET expiration_date = DATE_ADD(assessment_date, INTERVAL term_months MONTH)
WHERE expiration_date IS NULL;
