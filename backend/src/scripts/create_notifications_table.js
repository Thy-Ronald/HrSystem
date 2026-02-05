const { query } = require('../config/database');

async function createNotificationsTable() {
    try {
        console.log('Creating notifications table...');

        const sql = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        data JSON,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

        await query(sql);

        const indexQuery = `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`;
        // MySQL 5.7+ supports IF NOT EXISTS for indexes? standard mysql syntax often doesn't. 
        // Let's just create it and ignore error if exists, or check first.
        // For simplicity, let's just create the table first. Index usually created with table?
        // In MySQL, creating index on existing column is separate.

        // Let's refine the query to include index in CREATE TABLE if possible, or run separate.
        // Separate is safer if table exists.

        try {
            await query(`CREATE INDEX idx_notifications_user_id ON notifications(user_id)`);
        } catch (err) {
            // Ignore if index already exists
            if (err.code !== 'ER_DUP_KEYNAME') {
                console.log('Index creation note:', err.message);
            }
        }

        console.log('✅ Notifications table created successfully.');
    } catch (error) {
        console.error('❌ Error creating notifications table:', error);
    } finally {
        process.exit();
    }
}

createNotificationsTable();
