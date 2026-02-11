const { query } = require('../config/database');

/**
 * Migration: Add user_id to tracked_repositories table
 * 
 * This migration modifies the tracked_repositories table to support
 * per-user repository tracking.
 */
async function up() {
    console.log('--- Migration: Updating tracked_repositories table for per-user tracking ---');

    // 1. Clear existing data and add user_id column
    await query(`
        DELETE FROM tracked_repositories
    `);
    await query(`
        ALTER TABLE tracked_repositories 
        ADD COLUMN user_id INT NOT NULL AFTER id,
        DROP INDEX idx_full_name,
        DROP INDEX full_name
    `);
    console.log('✓ Cleared existing data, added user_id column and dropped old unique index');

    // 2. Add foreign key and composite unique index
    await query(`
        ALTER TABLE tracked_repositories
        ADD INDEX idx_user_id (user_id),
        ADD CONSTRAINT fk_user_repo FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        ADD UNIQUE INDEX idx_user_full_name (user_id, full_name)
    `);
    console.log('✓ Added foreign key and composite unique index (user_id, full_name)');
}

/**
 * Rollback migration
 */
async function down() {
    console.log('--- Rollback: Reverting tracked_repositories to global tracking ---');

    await query(`
        ALTER TABLE tracked_repositories
        DROP FOREIGN KEY fk_user_repo,
        DROP INDEX idx_user_full_name,
        DROP INDEX idx_user_id,
        DROP COLUMN user_id,
        ADD UNIQUE INDEX full_name (full_name)
    `);
    console.log('✓ Reverted tracked_repositories table');
}

// Run migration if called directly
if (require.main === module) {
    up()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { up, down };
