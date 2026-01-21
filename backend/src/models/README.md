# Contract Data Access Layer

This module provides a complete data access layer (DAL) for the `staff_contract` table with CRUD operations using prepared statements for SQL injection prevention.

## Methods

### `createContract(data)`

Creates a new contract in the database.

**Parameters:**
- `data` (Object): Contract data with the following fields:
  - `name` (string, required): Employee full name
  - `position` (string, required): Job title
  - `assessmentDate` (string/Date, required): Assessment date
  - `basicSalary` (number, required): Base salary
  - `termMonths` (number, required): Contract duration in months
  - `allowance` (number, optional): Allowance
  - `attendanceBonus` (number, optional): Attendance bonus
  - `fullAttendanceBonus` (number, optional): Perfect attendance bonus
  - `signingBonus` (string, optional): Signing bonus notes
  - `resignationDate` (string/Date, optional): Resignation date

**Returns:** `Promise<Object>` - Created contract with ID

**Example:**
```javascript
const { createContract } = require('./models/contractStore');

const newContract = await createContract({
  name: 'John Doe',
  position: 'Software Engineer',
  assessmentDate: '2024-01-15 10:00:00',
  basicSalary: 50000,
  termMonths: 12,
  allowance: 5000,
  attendanceBonus: 1000,
  fullAttendanceBonus: 2000
});
```

---

### `getAllContracts()`

Retrieves all contracts from the database.

**Returns:** `Promise<Array>` - Array of all contracts

**Example:**
```javascript
const { getAllContracts } = require('./models/contractStore');

const contracts = await getAllContracts();
console.log(`Found ${contracts.length} contracts`);
```

---

### `getContractById(id)`

Retrieves a single contract by its ID.

**Parameters:**
- `id` (number): Contract ID

**Returns:** `Promise<Object|null>` - Contract object or null if not found

**Example:**
```javascript
const { getContractById } = require('./models/contractStore');

const contract = await getContractById(1);
if (contract) {
  console.log(`Contract: ${contract.name} - ${contract.position}`);
} else {
  console.log('Contract not found');
}
```

---

### `updateContract(id, data)`

Updates a contract by ID. Supports partial updates (only provided fields are updated).

**Parameters:**
- `id` (number): Contract ID
- `data` (Object): Partial contract data to update (only include fields to update)

**Returns:** `Promise<Object|null>` - Updated contract or null if not found

**Example:**
```javascript
const { updateContract } = require('./models/contractStore');

// Update only specific fields
const updated = await updateContract(1, {
  basicSalary: 55000,
  allowance: 6000
});

// Update resignation date
const resigned = await updateContract(1, {
  resignationDate: '2024-12-31 17:00:00'
});
```

---

### `deleteContract(id)`

Deletes a contract by ID.

**Parameters:**
- `id` (number): Contract ID

**Returns:** `Promise<boolean>` - True if deleted, false if not found

**Example:**
```javascript
const { deleteContract } = require('./models/contractStore');

const deleted = await deleteContract(1);
if (deleted) {
  console.log('Contract deleted successfully');
} else {
  console.log('Contract not found');
}
```

---

## Security Features

✅ **Prepared Statements**: All queries use parameterized prepared statements to prevent SQL injection  
✅ **Input Validation**: All inputs are validated and sanitized before database operations  
✅ **Type Checking**: ID parameters are validated as positive integers  
✅ **Error Handling**: Comprehensive error handling with meaningful error messages

## Error Handling

All methods throw errors that should be caught:

```javascript
try {
  const contract = await createContract(data);
} catch (error) {
  if (error.message.includes('required')) {
    // Validation error - 400 Bad Request
    res.status(400).json({ error: error.message });
  } else {
    // Database error - 500 Internal Server Error
    res.status(500).json({ error: 'Database error' });
  }
}
```

## Usage in Controllers

```javascript
const {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract
} = require('../models/contractStore');

// Create
router.post('/contracts', async (req, res) => {
  try {
    const contract = await createContract(req.body);
    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Read all
router.get('/contracts', async (req, res) => {
  try {
    const contracts = await getAllContracts();
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

// Read one
router.get('/contracts/:id', async (req, res) => {
  try {
    const contract = await getContractById(req.params.id);
    if (contract) {
      res.json(contract);
    } else {
      res.status(404).json({ error: 'Contract not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update
router.put('/contracts/:id', async (req, res) => {
  try {
    const contract = await updateContract(req.params.id, req.body);
    if (contract) {
      res.json(contract);
    } else {
      res.status(404).json({ error: 'Contract not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete
router.delete('/contracts/:id', async (req, res) => {
  try {
    const deleted = await deleteContract(req.params.id);
    if (deleted) {
      res.json({ message: 'Contract deleted successfully' });
    } else {
      res.status(404).json({ error: 'Contract not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```
