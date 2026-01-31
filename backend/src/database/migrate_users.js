/**
 * Migration script to create users table
 * Run with: node src/database/migrate_users.js
 */

const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrateUsers() {
  try {
    console.log('Starting users table migration...');

    // Read SQL schema
    const schemaPath = path.join(__dirname, 'users_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema - create table directly
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key, auto-increment',
        email VARCHAR(255) NOT NULL UNIQUE COMMENT 'User email (unique)',
        password_hash VARCHAR(255) NOT NULL COMMENT 'Hashed password (bcrypt)',
        name VARCHAR(255) NOT NULL COMMENT 'User full name',
        role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee' COMMENT 'User role',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts for authentication'
    `;

    await query(createTableSQL);
    console.log('✓ Users table created successfully!');

    console.log('✓ Users table migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_TABLE_EXISTS') {
      console.log('Note: Table already exists. This is OK if you want to keep existing data.');
      process.exit(0);
    }
    process.exit(1);
  }
}

migrateUsers();
