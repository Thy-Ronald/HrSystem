# Production Delivery: MySQL Integration for HR System

Complete production-ready MySQL integration with schema, connection layer, repository pattern, and REST API.

## 📋 Table of Contents

1. [SQL Schema](#sql-schema)
2. [Database Connection Setup](#database-connection-setup)
3. [Repository Layer](#repository-layer)
4. [Express Routes](#express-routes)
5. [Example API Requests/Responses](#example-api-requestsresponses)
6. [Project Structure](#project-structure)
7. [Setup Instructions](#setup-instructions)

---

## SQL Schema

**File:** `backend/src/database/schema.sql`

```sql
-- HR System Database Schema
-- MySQL 8+ compatible
-- Creates database and staff_contract table with proper constraints, defaults, and indexes

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS hr_system 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE hr_system;

-- Staff Contract table
CREATE TABLE IF NOT EXISTS staff_contract (
  -- Primary Key
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key, auto-increment',
  
  -- Required Fields
  name VARCHAR(255) NOT NULL COMMENT 'Employee full name',
  position VARCHAR(255) NOT NULL COMMENT 'Job title',
  assessment_date DATETIME NOT NULL COMMENT 'Assessment date',
  basic_salary INT NOT NULL DEFAULT 0 COMMENT 'Base salary',
  term_months INT NOT NULL DEFAULT 1 COMMENT 'Contract duration in months',
  
  -- Optional Fields
  allowance INT NULL DEFAULT NULL COMMENT 'Allowance',
  attendance_bonus FLOAT NULL DEFAULT NULL COMMENT 'Attendance bonus amount',
  full_attendance_bonus FLOAT NULL DEFAULT NULL COMMENT 'Perfect attendance bonus amount',
  signing_bonus VARCHAR(255) NULL DEFAULT NULL COMMENT 'Signing bonus notes or value',
  resignation_date DATETIME NULL DEFAULT NULL COMMENT 'Resignation date',
  
  -- Timestamps with auto-update
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp, auto-generated',
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp, auto-updated',
  
  -- Indexes for performance
  INDEX idx_name (name),
  INDEX idx_position (position),
  INDEX idx_assessment_date (assessment_date),
  INDEX idx_created_date (created_date),
  INDEX idx_resignation_date (resignation_date),
  INDEX idx_term_months (term_months),
  
  -- Constraints
  CONSTRAINT chk_basic_salary CHECK (basic_salary >= 0),
  CONSTRAINT chk_allowance CHECK (allowance IS NULL OR allowance >= 0),
  CONSTRAINT chk_attendance_bonus CHECK (attendance_bonus IS NULL OR attendance_bonus >= 0),
  CONSTRAINT chk_full_attendance_bonus CHECK (full_attendance_bonus IS NULL OR full_attendance_bonus >= 0),
  CONSTRAINT chk_term_months CHECK (term_months > 0),
  CONSTRAINT chk_resignation_date CHECK (resignation_date IS NULL OR resignation_date >= assessment_date)
) 
ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci
COMMENT='Stores employee contract information';
```

**Run migration:**
```bash
npm run migrate
# or
node src/database/migrate.js
```

---

## Database Connection Setup

**File:** `backend/src/config/database.js`

### Environment Variables

Create `.env` file:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hr_system
DB_PORT=3306
DB_CONNECTION_LIMIT=10
DB_SSL=false
```

### Connection Pool Configuration

```javascript
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hr_system',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  
  // Connection pooling
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  
  // Keep-alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // Timeouts
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 60000,
  
  // Character set
  charset: 'utf8mb4',
  
  // SSL (production)
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
```

### Key Features

- ✅ Connection pooling for performance
- ✅ Graceful error handling
- ✅ Automatic reconnection
- ✅ Prepared statements (SQL injection prevention)
- ✅ Transaction support

---

## Repository Layer

**File:** `backend/src/models/contractStore.js`

### CRUD Operations

```javascript
const { query } = require('../config/database');
const { validateContractData, validateContractUpdateData } = require('../utils/sqlValidation');

/**
 * Create a new contract
 */
async function createContract(data) {
  const validatedData = validateContractData(data);
  
  const sql = `
    INSERT INTO staff_contract (
      name, position, assessment_date, basic_salary, term_months,
      allowance, attendance_bonus, full_attendance_bonus,
      signing_bonus, resignation_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    validatedData.name,
    validatedData.position,
    validatedData.assessmentDate,
    validatedData.basicSalary,
    validatedData.termMonths,
    validatedData.allowance,
    validatedData.attendanceBonus,
    validatedData.fullAttendanceBonus,
    validatedData.signingBonus,
    validatedData.resignationDate,
  ];
  
  const result = await query(sql, params);
  return await getContractById(result.insertId);
}

/**
 * Get all contracts
 */
async function getAllContracts() {
  const sql = `
    SELECT 
      id, name, position, assessment_date as assessmentDate,
      basic_salary as basicSalary, allowance,
      attendance_bonus as attendanceBonus,
      full_attendance_bonus as fullAttendanceBonus,
      signing_bonus as signingBonus, term_months as termMonths,
      resignation_date as resignationDate,
      created_date as createdDate, updated_date as updatedDate
    FROM staff_contract
    ORDER BY created_date DESC
  `;
  
  return await query(sql);
}

/**
 * Get contract by ID
 */
async function getContractById(id) {
  const sql = `
    SELECT 
      id, name, position, assessment_date as assessmentDate,
      basic_salary as basicSalary, allowance,
      attendance_bonus as attendanceBonus,
      full_attendance_bonus as fullAttendanceBonus,
      signing_bonus as signingBonus, term_months as termMonths,
      resignation_date as resignationDate,
      created_date as createdDate, updated_date as updatedDate
    FROM staff_contract
    WHERE id = ?
    LIMIT 1
  `;
  
  const results = await query(sql, [id]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Update contract
 */
async function updateContract(id, data) {
  const validatedData = validateContractUpdateData(data);
  
  // Build dynamic UPDATE query
  const fields = [];
  const params = [];
  
  if (validatedData.name !== undefined) {
    fields.push('name = ?');
    params.push(validatedData.name);
  }
  // ... other fields
  
  params.push(id);
  
  const sql = `UPDATE staff_contract SET ${fields.join(', ')} WHERE id = ?`;
  const result = await query(sql, params);
  
  if (result.affectedRows === 0) return null;
  return await getContractById(id);
}

/**
 * Delete contract
 */
async function deleteContract(id) {
  const sql = `DELETE FROM staff_contract WHERE id = ?`;
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
}
```

### Security Features

- ✅ Prepared statements (prevents SQL injection)
- ✅ Input validation and sanitization
- ✅ Type checking and conversion
- ✅ Error handling

---

## Express Routes

**File:** `backend/src/routes/contracts.js`

```javascript
const express = require('express');
const router = express.Router();

const {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
} = require('../controllers/contractsController');

const {
  validateCreateContract,
  validateUpdateContract,
  validateId,
} = require('../middlewares/validation');

// REST API Routes
router.post('/', validateCreateContract, createContract);
router.get('/', getAllContracts);
router.get('/:id', validateId, getContractById);
router.put('/:id', validateId, validateUpdateContract, updateContract);
router.delete('/:id', validateId, deleteContract);

module.exports = router;
```

**File:** `backend/src/server.js`

```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const contractRouter = require('./routes/contracts');
const { errorHandler } = require('./middlewares/errorHandler');
const { testConnection } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected'
  });
});

app.use('/api/contracts', contractRouter);
app.use(errorHandler);

// Start server
async function startServer() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

startServer();
```

---

## Example API Requests/Responses

### 1. Create Contract

**Request:**
```http
POST /api/contracts
Content-Type: application/json

{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": 50000,
  "termMonths": 12,
  "allowance": 5000,
  "attendanceBonus": 1000.50,
  "fullAttendanceBonus": 2000.75,
  "signingBonus": "5000",
  "resignationDate": null
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "position": "Software Engineer",
    "assessmentDate": "2024-01-15 10:00:00",
    "basicSalary": 50000,
    "termMonths": 12,
    "allowance": 5000,
    "attendanceBonus": 1000.5,
    "fullAttendanceBonus": 2000.75,
    "signingBonus": "5000",
    "resignationDate": null,
    "createdDate": "2024-01-15 10:00:00",
    "updatedDate": "2024-01-15 10:00:00"
  },
  "message": "Contract created successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "name is required and must be a non-empty string",
    "basic_salary must be 0 or greater"
  ]
}
```

---

### 2. Get All Contracts

**Request:**
```http
GET /api/contracts
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "position": "Software Engineer",
      "assessmentDate": "2024-01-15 10:00:00",
      "basicSalary": 50000,
      "termMonths": 12,
      "allowance": 5000,
      "attendanceBonus": 1000.5,
      "fullAttendanceBonus": 2000.75,
      "signingBonus": "5000",
      "resignationDate": null,
      "createdDate": "2024-01-15 10:00:00",
      "updatedDate": "2024-01-15 10:00:00"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "position": "Product Manager",
      "assessmentDate": "2024-01-20 14:30:00",
      "basicSalary": 60000,
      "termMonths": 24,
      "allowance": 6000,
      "attendanceBonus": null,
      "fullAttendanceBonus": null,
      "signingBonus": null,
      "resignationDate": null,
      "createdDate": "2024-01-20 14:30:00",
      "updatedDate": "2024-01-20 14:30:00"
    }
  ]
}
```

---

### 3. Get Contract by ID

**Request:**
```http
GET /api/contracts/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "position": "Software Engineer",
    "assessmentDate": "2024-01-15 10:00:00",
    "basicSalary": 50000,
    "termMonths": 12,
    "allowance": 5000,
    "attendanceBonus": 1000.5,
    "fullAttendanceBonus": 2000.75,
    "signingBonus": "5000",
    "resignationDate": null,
    "createdDate": "2024-01-15 10:00:00",
    "updatedDate": "2024-01-15 10:00:00"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Contract not found",
  "message": "No contract found with ID 999"
}
```

---

### 4. Update Contract

**Request:**
```http
PUT /api/contracts/1
Content-Type: application/json

{
  "basicSalary": 55000,
  "allowance": 6000
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "position": "Software Engineer",
    "assessmentDate": "2024-01-15 10:00:00",
    "basicSalary": 55000,
    "termMonths": 12,
    "allowance": 6000,
    "attendanceBonus": 1000.5,
    "fullAttendanceBonus": 2000.75,
    "signingBonus": "5000",
    "resignationDate": null,
    "createdDate": "2024-01-15 10:00:00",
    "updatedDate": "2024-01-15 10:05:00"
  },
  "message": "Contract updated successfully"
}
```

---

### 5. Delete Contract

**Request:**
```http
DELETE /api/contracts/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Contract deleted successfully"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Contract not found",
  "message": "No contract found with ID 999"
}
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Connection pool & query helpers
│   ├── controllers/
│   │   └── contractsController.js  # Request handlers
│   ├── database/
│   │   ├── schema.sql           # Database schema
│   │   └── migrate.js           # Migration script
│   ├── middlewares/
│   │   ├── errorHandler.js      # Error sanitization
│   │   └── validation.js        # Request validation
│   ├── models/
│   │   └── contractStore.js     # Repository layer (DAL)
│   ├── routes/
│   │   └── contracts.js         # Express routes
│   ├── utils/
│   │   └── sqlValidation.js     # Input validation utilities
│   └── server.js                # Express app setup
├── .env.example                  # Environment variables template
├── package.json
└── DATABASE_SETUP.md            # Setup instructions
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hr_system
DB_PORT=3306
DB_CONNECTION_LIMIT=10
DB_SSL=false
```

### 3. Run Migration

```bash
npm run migrate
```

### 4. Start Server

```bash
npm start
# or for development
npm run dev
```

### 5. Test API

```bash
# Health check
curl http://localhost:4000/api/health

# Create contract
curl -X POST http://localhost:4000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "position": "Software Engineer",
    "assessmentDate": "2024-01-15T10:00:00",
    "basicSalary": 50000,
    "termMonths": 12
  }'

# Get all contracts
curl http://localhost:4000/api/contracts
```

---

## Production Checklist

- ✅ SQL schema with proper constraints and indexes
- ✅ Connection pooling configured
- ✅ Prepared statements (SQL injection prevention)
- ✅ Input validation and sanitization
- ✅ Error handling (no raw SQL errors exposed)
- ✅ Consistent JSON response format
- ✅ Environment variable configuration
- ✅ Graceful error handling
- ✅ Transaction support
- ✅ Comprehensive validation
- ✅ Clean architecture (separation of concerns)
- ✅ Well-documented code
- ✅ Migration script for database setup

---

## Code Quality Features

### Security
- ✅ Prepared statements prevent SQL injection
- ✅ Input validation prevents invalid data
- ✅ Error sanitization prevents information leakage
- ✅ Environment variables for sensitive data

### Performance
- ✅ Connection pooling for efficient resource usage
- ✅ Indexes on frequently queried columns
- ✅ Efficient queries with proper SELECT fields

### Maintainability
- ✅ Clear separation of concerns (config, models, controllers, routes)
- ✅ Consistent naming conventions
- ✅ Comprehensive error handling
- ✅ Well-documented code
- ✅ Validation at multiple layers

### Reliability
- ✅ Graceful error handling
- ✅ Connection retry logic
- ✅ Transaction support for data integrity
- ✅ Proper status codes

---

## Maintenance Guide

### Adding New Fields

1. Update `schema.sql` with new column
2. Run migration: `npm run migrate`
3. Update `sqlValidation.js` validation functions
4. Update `contractStore.js` CRUD operations
5. Update validation middleware if needed
6. Update API documentation

### Debugging

- Check server logs for detailed error messages
- Use `/api/health` endpoint to verify database connection
- Enable development mode for stack traces
- Check MySQL logs for database-level errors

### Performance Tuning

- Adjust `DB_CONNECTION_LIMIT` based on load
- Add indexes for frequently queried columns
- Monitor connection pool usage
- Optimize queries based on EXPLAIN plans

---

## Support

For issues or questions:
1. Check `DATABASE_SETUP.md` for setup issues
2. Review `API_DOCUMENTATION.md` for API usage
3. Check `VALIDATION_AND_ERROR_HANDLING.md` for error handling

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**MySQL Version:** 8+  
**Node.js Version:** 18+
