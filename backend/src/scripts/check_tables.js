const { query } = require('../config/database');

async function checkTables() {
    try {
        console.log('Checking tables in database...');
        const result = await query('SHOW TABLES');
        console.log('Tables:', result);

        // Check specific table
        try {
            await query('SELECT 1 FROM notifications LIMIT 1');
            console.log('✅ notifications table exists and is readable');
        } catch (e) {
            console.log('❌ notifications table SELECT failed:', e.message);
        }

    } catch (error) {
        console.error('❌ Error showing tables:', error);
    } finally {
        process.exit();
    }
}

checkTables();
