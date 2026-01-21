# Adding Expiration Date to Contracts

This guide explains how to add the `expiration_date` field to your existing database.

## What Changed

- Added `expiration_date` field to `staff_contract` table
- Expiration date is **automatically calculated** from `assessment_date + term_months` if not provided
- Can be manually set for custom expiration dates
- Displayed in the frontend contract list

## For New Databases

If you're setting up a fresh database, just run:

```bash
cd backend
npm run migrate
```

The schema already includes the `expiration_date` field.

## For Existing Databases

If you already have the `staff_contract` table, you need to add the column:

### Option 1: Run Migration Script (Recommended)

```bash
cd backend
mysql -u root -p < src/database/add_expiration_date.sql
```

Or in phpMyAdmin:
1. Select the `hr_system` database
2. Go to SQL tab
3. Copy and paste the contents of `backend/src/database/add_expiration_date.sql`
4. Execute

### Option 2: Manual SQL

Run this SQL in phpMyAdmin or MySQL client:

```sql
USE hr_system;

-- Add expiration_date column
ALTER TABLE staff_contract 
ADD COLUMN expiration_date DATETIME NULL DEFAULT NULL 
COMMENT 'Contract expiration date (calculated from assessment_date + term_months if not provided)' 
AFTER signing_bonus;

-- Add index
CREATE INDEX idx_expiration_date ON staff_contract(expiration_date);

-- Add constraint
ALTER TABLE staff_contract
ADD CONSTRAINT chk_expiration_date CHECK (expiration_date IS NULL OR expiration_date >= assessment_date);

-- Calculate expiration_date for existing records
UPDATE staff_contract
SET expiration_date = DATE_ADD(assessment_date, INTERVAL term_months MONTH)
WHERE expiration_date IS NULL;
```

## How It Works

### Automatic Calculation

When creating a contract **without** providing `expirationDate`:
- The system calculates: `assessment_date + term_months`
- Example: Assessment Date = 2024-01-15, Term = 12 months → Expiration = 2025-01-15

### Manual Override

You can also provide a custom expiration date:
```json
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": 50000,
  "termMonths": 12,
  "expirationDate": "2025-06-30T17:00:00"  // Custom expiration
}
```

### Updating Expiration

When updating `term_months`, expiration is automatically recalculated unless you also provide `expirationDate`.

## Frontend Display

The expiration date now appears in the contract list table:
- Shows formatted expiration date
- Displays "N/A" if expiration date is not set

## API Examples

### Create Contract (Auto-calculate expiration)

```bash
POST /api/contracts
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": 50000,
  "termMonths": 12
}
# Expiration will be automatically calculated
```

### Create Contract (Manual expiration)

```bash
POST /api/contracts
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": 50000,
  "termMonths": 12,
  "expirationDate": "2025-06-30T17:00:00"
}
```

### Update Expiration Date

```bash
PUT /api/contracts/1
{
  "expirationDate": "2025-12-31T17:00:00"
}
```

## Verification

After adding the column, verify it exists:

```sql
DESCRIBE staff_contract;
-- Should show expiration_date column

SELECT id, name, expiration_date FROM staff_contract LIMIT 5;
-- Should show expiration dates (calculated or set)
```

## Notes

- Expiration date is **optional** - contracts can exist without it
- If not provided, it's calculated from `assessment_date + term_months`
- The constraint ensures expiration_date >= assessment_date
- Index on `expiration_date` improves query performance for expiring contracts
