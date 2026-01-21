const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * MySQL Connection Layer
 * Provides connection pooling with graceful error handling
 * 
 * Required environment variables:
 * - DB_HOST: Database host (default: localhost)
 * - DB_USER: Database username (default: root)
 * - DB_PASSWORD: Database password (default: empty)
 * - DB_NAME: Database name (default: hr_system)
 * - DB_PORT: Database port (default: 3306)
 */

// Validate required environment variables
function validateDatabaseConfig() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠ Warning: Missing database environment variables:', missing.join(', '));
    console.warn('⚠ Using default values. Please configure .env file for production.');
  }
}

// Initialize configuration validation
validateDatabaseConfig();

/**
 * Create connection pool with error handling
 */
let pool = null;

function createPool() {
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hr_system',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      
      // Connection pooling settings
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: 0,
      
      // Keep-alive settings
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      
      // Timeout settings
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 60000,
      
      // Character set
      charset: 'utf8mb4',
      
      // SSL (optional, for production)
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

    pool = mysql.createPool(config);

    // Handle pool errors gracefully
    pool.on('connection', (connection) => {
      console.log('✓ New database connection established');
      
      connection.on('error', (err) => {
        console.error('✗ Database connection error:', err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          console.warn('⚠ Connection lost. Pool will attempt to reconnect.');
        }
      });
    });

    pool.on('acquire', () => {
      // Connection acquired from pool (optional logging)
    });

    pool.on('release', () => {
      // Connection released back to pool (optional logging)
    });

    return pool;
  } catch (error) {
    console.error('✗ Failed to create database pool:', error.message);
    throw error;
  }
}

// Initialize pool
try {
  pool = createPool();
} catch (error) {
  console.error('✗ Database pool initialization failed:', error.message);
  // Pool will be null, but we'll handle this gracefully in functions
}

/**
 * Test database connection
 * Fails gracefully without throwing errors
 * @returns {Promise<boolean>} - Returns true if connection successful, false otherwise
 */
async function testConnection() {
  if (!pool) {
    console.error('✗ Database pool not initialized');
    return false;
  }

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✓ Database connection test successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection test failed:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('  → Check if MySQL server is running');
      console.error('  → Verify DB_HOST and DB_PORT in .env');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  → Check DB_USER and DB_PASSWORD in .env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('  → Database does not exist. Run migration: npm run migrate');
      console.error('  → Verify DB_NAME in .env');
    }
    
    return false;
  }
}

/**
 * Execute a query with automatic connection management
 * Fails gracefully with proper error handling
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters for prepared statements
 * @returns {Promise<any>} - Query results
 * @throws {Error} - Database error if query fails
 */
async function query(sql, params = []) {
  if (!pool) {
    throw new Error('Database pool not initialized. Check database configuration.');
  }

  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('✗ Database query error:', error.message);
    console.error('  Query:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
    
    // Re-throw with context
    const dbError = new Error(`Database query failed: ${error.message}`);
    dbError.code = error.code;
    dbError.sqlState = error.sqlState;
    throw dbError;
  }
}

/**
 * Execute a transaction
 * Automatically handles commit/rollback
 * @param {Function} callback - Async function that receives a connection
 * @returns {Promise<any>} - Transaction result
 * @throws {Error} - Database error if transaction fails
 */
async function transaction(callback) {
  if (!pool) {
    throw new Error('Database pool not initialized. Check database configuration.');
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('✗ Transaction rolled back:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get a connection from the pool
 * Remember to release it when done!
 * @returns {Promise<Connection>} - MySQL connection
 */
async function getConnection() {
  if (!pool) {
    throw new Error('Database pool not initialized. Check database configuration.');
  }

  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('✗ Failed to get database connection:', error.message);
    throw error;
  }
}

/**
 * Close all database connections gracefully
 * @returns {Promise<void>}
 */
async function closePool() {
  if (!pool) {
    console.warn('⚠ Database pool already closed or not initialized');
    return;
  }

  try {
    await pool.end();
    pool = null;
    console.log('✓ Database connection pool closed gracefully');
  } catch (error) {
    console.error('✗ Error closing database pool:', error.message);
    throw error;
  }
}

/**
 * Get pool statistics (for monitoring)
 * @returns {Object} - Pool statistics
 */
function getPoolStats() {
  if (!pool) {
    return { initialized: false };
  }

  return {
    initialized: true,
    config: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'hr_system',
      user: process.env.DB_USER || 'root',
    },
  };
}

module.exports = {
  pool: () => pool, // Return function to prevent external modification
  query,
  transaction,
  getConnection,
  testConnection,
  closePool,
  getPoolStats,
};
