/**
 * Migration: Add body column to github_issues_cache table
 * 
 * Adds the 'body' column to store issue descriptions for P value extraction.
 * 
 * Run: node src/database/add_body_column_migration.js
 */

const { query, testConnection, closePool } = require('../config/database');

async function runMigration() {
  console.log('🚀 Starting migration to add body column...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to database. Please check your configuration.');
    process.exit(1);
  }

  try {
    // Check if column already exists
    const checkColumnSql = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'github_issues_cache'
        AND COLUMN_NAME = 'body'
    `;

    const results = await query(checkColumnSql);
    
    if (results.length > 0 && results[0].count > 0) {
      console.log('⚠️  Column "body" already exists in github_issues_cache table (skipped)');
    } else {
      console.log('⏳ Adding "body" column to github_issues_cache table...');
      
      const addColumnSql = `
        ALTER TABLE github_issues_cache
        ADD COLUMN body TEXT COMMENT 'Issue body/description text'
        AFTER title
      `;
      
      await query(addColumnSql);
      console.log('✅ Column "body" added successfully');
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run migration
runMigration();
