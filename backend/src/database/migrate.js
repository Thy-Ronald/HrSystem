const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Database migration script
 * Run this once to set up the database schema
 */
async function migrate() {
  let connection;
  
  try {
    // Connect without specifying database first (to create it if needed)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('Connected to MySQL server');

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    console.log('✓ Database schema created successfully');
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
  migrate()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
