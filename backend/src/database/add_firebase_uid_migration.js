/**
 * Migration: Add firebase_uid column to users table
 * Run once: node src/database/add_firebase_uid_migration.js
 */

require('dotenv').config();
const { query } = require('../config/database');

async function migrate() {
  try {
    // Check if column already exists
    const existing = await query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'users'
         AND COLUMN_NAME  = 'firebase_uid'`
    );

    if (existing.length > 0) {
      console.log('✅ firebase_uid column already exists — skipping.');
      return;
    }

    await query(
      `ALTER TABLE users
       ADD COLUMN firebase_uid VARCHAR(128) NULL UNIQUE AFTER avatar_url`
    );

    console.log('✅ Migration complete: firebase_uid column added to users table.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrate();
