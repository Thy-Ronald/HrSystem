const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function fixMigration() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hr_system',
        port: parseInt(process.env.DB_PORT || '3306', 10),
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to database');

        const sql = `
      CREATE TABLE IF NOT EXISTS monitoring_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT NOT NULL,
          target_user_id INT NOT NULL,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

        await connection.query(sql);
        console.log('Table monitoring_requests created successfully');
        await connection.end();
    } catch (err) {
        console.error('Error creating table:', err);
    }
}

fixMigration();
