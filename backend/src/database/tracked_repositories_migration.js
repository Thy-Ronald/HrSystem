const { query } = require('../config/database');

/**
 * Migration: Create tracked_repositories table
 * 
 * This table stores the repositories that have been added by the admin/user
 * in the Settings page. These repositories will be displayed across:
 * - GitHub Analytics
 * - Staff Ranking
 * - Repository Table in Settings
 */
async function up() {
    console.log('--- Migration: Creating tracked_repositories table ---');

    // 1. Create the table
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS tracked_repositories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL UNIQUE COMMENT 'Repository full name (owner/repo)',
            name VARCHAR(100) NOT NULL COMMENT 'Repository name',
            owner VARCHAR(100) NOT NULL COMMENT 'Repository owner',
            description TEXT COMMENT 'Optional repository description',
            stars INT DEFAULT 0 COMMENT 'Star count',
            avatar_url VARCHAR(500) COMMENT 'Owner avatar URL',
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_full_name (full_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await query(createTableSql);
    console.log('✓ Table tracked_repositories created successfully');

    // 2. Seed with default repositories
    const seedSql = `
        INSERT IGNORE INTO tracked_repositories (full_name, name, owner)
        VALUES 
            ('timeriver/cnd_chat', 'cnd_chat', 'timeriver'),
            ('timeriver/sacsys009', 'sacsys009', 'timeriver'),
            ('timeriver/learnings', 'learnings', 'timeriver')
    `;

    await query(seedSql);
    console.log('✓ Seeded tracked_repositories with defaults');
}

/**
 * Rollback migration
 */
async function down() {
    console.log('--- Rollback: Dropping tracked_repositories table ---');
    await query('DROP TABLE IF EXISTS tracked_repositories');
    console.log('✓ Table tracked_repositories dropped');
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
