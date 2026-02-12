const { query } = require('../config/database');

/**
 * Migration: Create system_settings table
 * This table stores configuration key-value pairs.
 */
async function up() {
    console.log('--- Migration: Creating system_settings table ---');

    const createTableSql = `
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT,
            description TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await query(createTableSql);
    console.log('✓ Table system_settings created successfully');

    // Seed with existing GITHUB_TOKEN if available (optional, but good for transition)
    if (process.env.GITHUB_TOKEN) {
        const seedSql = `
            INSERT IGNORE INTO system_settings (setting_key, setting_value, description)
            VALUES (?, ?, ?)
        `;
        await query(seedSql, ['github_token', process.env.GITHUB_TOKEN, 'GitHub Personal Access Token for API requests']);
        console.log('✓ Seeded system_settings with GITHUB_TOKEN from .env');
    }
}

async function down() {
    console.log('--- Rollback: Dropping system_settings table ---');
    await query('DROP TABLE IF EXISTS system_settings');
    console.log('✓ Table system_settings dropped');
}

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
