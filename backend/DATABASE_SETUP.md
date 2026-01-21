# Database Setup Guide

This guide will help you set up MySQL 8+ for the HR System backend.

## Prerequisites

- MySQL 8+ installed and running
- Node.js and npm installed

## Step 1: Install Dependencies

The MySQL driver (`mysql2`) is already included in `package.json`. If you haven't installed dependencies yet:

```bash
npm install
```

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update the database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_password
   DB_NAME=hr_system
   DB_CONNECTION_LIMIT=10
   DB_SSL=false
   ```

## Step 3: Create Database Schema

Run the migration script to create the database and tables:

```bash
npm run migrate
```

Or directly:
```bash
node src/database/migrate.js
```

This will:
- Create the `hr_system` database if it doesn't exist
- Create the `staff_contract` table with all necessary columns, indexes, and constraints

## Step 4: Verify Connection

Start the server:

```bash
npm start
# or for development
npm run dev
```

The server will test the database connection on startup. Check the console output for connection status.

You can also test the connection via the health endpoint:
```bash
curl http://localhost:4000/api/health
```

## Database Schema

### Staff Contract Table

The `staff_contract` table stores employee contract information with the following structure:

- **id**: INT, Auto-increment primary key
- **name**: VARCHAR(255), required - Employee full name
- **position**: VARCHAR(255), required - Job title
- **assessment_date**: DATETIME, required - Assessment date
- **basic_salary**: INT, required - Base salary
- **allowance**: INT, nullable - Allowance
- **attendance_bonus**: FLOAT, nullable - Attendance bonus
- **full_attendance_bonus**: FLOAT, nullable - Perfect attendance bonus
- **signing_bonus**: VARCHAR(255), nullable - Signing bonus notes or value
- **term_months**: INT, required - Contract duration in months
- **resignation_date**: DATETIME, nullable - Resignation date
- **created_date**: DATETIME, required - Auto-generated timestamp
- **updated_date**: DATETIME, required - Auto-updated timestamp

### Indexes

- `idx_name`: For efficient employee name searches
- `idx_assessment_date`: For assessment date queries
- `idx_created_date`: For sorting by creation date
- `idx_resignation_date`: For filtering by resignation status

### Constraints

- `chk_basic_salary`: Ensures basic_salary >= 0
- `chk_allowance`: Ensures allowance is NULL or >= 0
- `chk_term_months`: Ensures term_months > 0

### Notes

- Contract expiration is calculated as `assessment_date + term_months`
- The `signing_bonus` field stores text/notes rather than a numeric value
- Bonus fields (`attendance_bonus`, `full_attendance_bonus`) store actual amounts, not percentages

## Security Features

1. **Prepared Statements**: All queries use parameterized prepared statements to prevent SQL injection
2. **Input Validation**: All inputs are validated and sanitized before database insertion
3. **Connection Pooling**: Uses connection pooling for efficient resource management
4. **Error Handling**: Comprehensive error handling with proper error messages

## Architecture

The database integration follows clean architecture principles:

- **Config Layer** (`src/config/database.js`): Database connection and pooling configuration
- **Model Layer** (`src/models/contractStore.js`): Data access layer with SQL queries
- **Utils Layer** (`src/utils/sqlValidation.js`): Input validation and sanitization
- **Controller Layer** (`src/controllers/contractsController.js`): Request handling and business logic

## Troubleshooting

### Connection Refused
- Ensure MySQL is running: `mysql -u root -p`
- Check that the port (default 3306) is correct
- Verify firewall settings

### Access Denied
- Verify username and password in `.env`
- Check MySQL user permissions: `SHOW GRANTS FOR 'root'@'localhost';`

### Database Doesn't Exist
- Run the migration script: `npm run migrate`
- Or manually create: `CREATE DATABASE hr_system;`

### Table Already Exists
- The migration script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- If you need to reset, drop the table: `DROP TABLE staff_contract;` then run migration again

## Production Considerations

1. **SSL**: Set `DB_SSL=true` in production and configure proper SSL certificates
2. **Connection Limits**: Adjust `DB_CONNECTION_LIMIT` based on your server capacity
3. **Backups**: Set up regular database backups
4. **Monitoring**: Monitor connection pool usage and query performance
5. **Credentials**: Use environment-specific `.env` files, never commit `.env` to version control
