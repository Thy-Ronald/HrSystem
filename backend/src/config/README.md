# Database Configuration

This module provides a MySQL connection layer with connection pooling and graceful error handling.

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hr_system
DB_PORT=3306
```

### Optional Variables

```env
DB_CONNECTION_LIMIT=10
DB_SSL=false
```

## Usage

### Basic Query

```javascript
const { query } = require('./config/database');

async function getUsers() {
  try {
    const results = await query('SELECT * FROM staff_contract');
    return results;
  } catch (error) {
    console.error('Query failed:', error.message);
    throw error;
  }
}
```

### Query with Parameters (Prepared Statements)

```javascript
const { query } = require('./config/database');

async function getUserById(id) {
  try {
    const results = await query(
      'SELECT * FROM staff_contract WHERE id = ?',
      [id]
    );
    return results[0];
  } catch (error) {
    console.error('Query failed:', error.message);
    throw error;
  }
}
```

### Transactions

```javascript
const { transaction } = require('./config/database');

async function createContractWithDetails(contractData, details) {
  try {
    const result = await transaction(async (connection) => {
      // Insert contract
      const [contractResult] = await connection.execute(
        'INSERT INTO staff_contract (...) VALUES (...)',
        [contractData]
      );
      
      // Insert details using the same connection
      await connection.execute(
        'INSERT INTO contract_details (...) VALUES (...)',
        [details, contractResult.insertId]
      );
      
      return contractResult.insertId;
    });
    
    return result;
  } catch (error) {
    console.error('Transaction failed:', error.message);
    throw error;
  }
}
```

### Test Connection

```javascript
const { testConnection } = require('./config/database');

async function checkDatabase() {
  const isConnected = await testConnection();
  if (isConnected) {
    console.log('Database is ready');
  } else {
    console.error('Database connection failed');
  }
}
```

### Get Connection (Advanced)

```javascript
const { getConnection } = require('./config/database');

async function customOperation() {
  const connection = await getConnection();
  try {
    // Use connection for custom operations
    await connection.query('SET SESSION ...');
    const [results] = await connection.execute('SELECT ...');
    return results;
  } finally {
    connection.release(); // Always release!
  }
}
```

### Graceful Shutdown

```javascript
const { closePool } = require('./config/database');

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
```

## Error Handling

The module handles errors gracefully:

- **Connection errors**: Logged with helpful messages
- **Query errors**: Wrapped with context
- **Missing config**: Warns but uses defaults
- **Pool errors**: Automatically handled and logged

## Features

- ✅ Connection pooling for performance
- ✅ Automatic connection management
- ✅ Prepared statements (SQL injection protection)
- ✅ Transaction support
- ✅ Graceful error handling
- ✅ Connection health monitoring
- ✅ UTF8MB4 character set support
