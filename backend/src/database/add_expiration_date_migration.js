const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Migration script to add expiration_date column
 * Run this if you already have the staff_contract table
 */
async function addExpirationDateColumn() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hr_system',
    });

    console.log('Connected to MySQL server');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'staff_contract' 
      AND COLUMN_NAME = 'expiration_date'
    `, [process.env.DB_NAME || 'hr_system']);

    if (columns.length > 0) {
      console.log('✓ expiration_date column already exists');
      return;
    }

    // Add expiration_date column
    await connection.query(`
      ALTER TABLE staff_contract 
      ADD COLUMN expiration_date DATETIME NULL DEFAULT NULL 
      COMMENT 'Contract expiration date (calculated from assessment_date + term_months if not provided)' 
      AFTER signing_bonus
    `);
    console.log('✓ Added expiration_date column');

    // Add index
    await connection.query(`
      CREATE INDEX idx_expiration_date ON staff_contract(expiration_date)
    `);
    console.log('✓ Added index on expiration_date');

    // Add constraint
    try {
      await connection.query(`
        ALTER TABLE staff_contract
        ADD CONSTRAINT chk_expiration_date 
        CHECK (expiration_date IS NULL OR expiration_date >= assessment_date)
      `);
      console.log('✓ Added constraint for expiration_date');
    } catch (error) {
      // Constraint might already exist or MySQL version doesn't support CHECK
      if (error.code !== 'ER_DUP_CONSTRAINT_NAME') {
        console.warn('⚠ Could not add constraint:', error.message);
      }
    }

    // Calculate expiration_date for existing records
    const [result] = await connection.query(`
      UPDATE staff_contract
      SET expiration_date = DATE_ADD(assessment_date, INTERVAL term_months MONTH)
      WHERE expiration_date IS NULL
    `);
    console.log(`✓ Calculated expiration dates for ${result.affectedRows} existing contracts`);

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  addExpirationDateColumn()
    .then(() => {
      console.log('\nMigration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nMigration error:', error);
      process.exit(1);
    });
}

module.exports = { addExpirationDateColumn };
