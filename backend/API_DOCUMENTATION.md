# Contracts API Documentation

RESTful API endpoints for managing staff contracts.

## Base URL

```
http://localhost:4000/api/contracts
```

## Response Format

All responses follow a consistent JSON format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Array of validation errors"] // Only for validation errors
}
```

---

## Endpoints

### 1. Create Contract

**POST** `/api/contracts`

Create a new staff contract.

**Request Body:**
```json
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": 50000,
  "termMonths": 12,
  "allowance": 5000,
  "attendanceBonus": 1000.50,
  "fullAttendanceBonus": 2000.75,
  "signingBonus": "Signing bonus notes",
  "resignationDate": null
}
```

**Required Fields:**
- `name` (string): Employee full name (max 255 chars)
- `position` (string): Job title (max 255 chars)
- `assessmentDate` (string/Date): Assessment date
- `basicSalary` (integer): Base salary (>= 0)
- `termMonths` (integer): Contract duration in months (>= 1)

**Optional Fields:**
- `allowance` (integer): Allowance amount (>= 0)
- `attendanceBonus` (float): Attendance bonus (>= 0)
- `fullAttendanceBonus` (float): Perfect attendance bonus (>= 0)
- `signingBonus` (string): Signing bonus notes (max 255 chars)
- `resignationDate` (string/Date): Resignation date

**Response:** `201 Created`
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
    "signingBonus": "Signing bonus notes",
    "resignationDate": null,
    "createdDate": "2024-01-15 10:00:00",
    "updatedDate": "2024-01-15 10:00:00"
  },
  "message": "Contract created successfully"
}
```

**Validation Errors:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "name is required and must be a non-empty string",
    "basicSalary must be an integer"
  ]
}
```

---

### 2. Get All Contracts

**GET** `/api/contracts`

Retrieve all contracts.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "position": "Software Engineer",
      ...
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "position": "Product Manager",
      ...
    }
  ]
}
```

---

### 3. Get Contract by ID

**GET** `/api/contracts/:id`

Retrieve a specific contract by ID.

**Parameters:**
- `id` (integer): Contract ID

**Response:** `200 OK`
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
    "signingBonus": "Signing bonus notes",
    "resignationDate": null,
    "createdDate": "2024-01-15 10:00:00",
    "updatedDate": "2024-01-15 10:00:00"
  }
}
```

**Not Found:** `404 Not Found`
```json
{
  "success": false,
  "error": "Contract not found",
  "message": "No contract found with ID 999"
}
```

**Invalid ID:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Invalid ID",
  "message": "ID must be a positive integer"
}
```

---

### 4. Update Contract

**PUT** `/api/contracts/:id`

Update a contract. Supports partial updates (only include fields to update).

**Parameters:**
- `id` (integer): Contract ID

**Request Body:** (all fields optional)
```json
{
  "basicSalary": 55000,
  "allowance": 6000,
  "resignationDate": "2024-12-31T17:00:00"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "position": "Software Engineer",
    "basicSalary": 55000,
    "allowance": 6000,
    ...
  },
  "message": "Contract updated successfully"
}
```

**Not Found:** `404 Not Found`
```json
{
  "success": false,
  "error": "Contract not found",
  "message": "No contract found with ID 999"
}
```

**Validation Errors:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "basicSalary must be an integer",
    "termMonths must be 1 or greater"
  ]
}
```

---

### 5. Delete Contract

**DELETE** `/api/contracts/:id`

Delete a contract by ID.

**Parameters:**
- `id` (integer): Contract ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": null,
  "message": "Contract deleted successfully"
}
```

**Not Found:** `404 Not Found`
```json
{
  "success": false,
  "error": "Contract not found",
  "message": "No contract found with ID 999"
}
```

---

## Validation Rules

### Required Fields (Create)
- `name`: Non-empty string, max 255 characters
- `position`: Non-empty string, max 255 characters
- `assessmentDate`: Valid date/datetime
- `basicSalary`: Integer >= 0
- `termMonths`: Integer >= 1

### Optional Fields
- `allowance`: Integer >= 0
- `attendanceBonus`: Number (float) >= 0
- `fullAttendanceBonus`: Number (float) >= 0
- `signingBonus`: String, max 255 characters
- `resignationDate`: Valid date/datetime

### Date Formats
Dates can be provided in ISO 8601 format:
- `"2024-01-15T10:00:00"`
- `"2024-01-15"`
- `"2024-01-15 10:00:00"`

---

## Example Usage

### cURL Examples

**Create Contract:**
```bash
curl -X POST http://localhost:4000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "position": "Software Engineer",
    "assessmentDate": "2024-01-15T10:00:00",
    "basicSalary": 50000,
    "termMonths": 12
  }'
```

**Get All Contracts:**
```bash
curl http://localhost:4000/api/contracts
```

**Get Contract by ID:**
```bash
curl http://localhost:4000/api/contracts/1
```

**Update Contract:**
```bash
curl -X PUT http://localhost:4000/api/contracts/1 \
  -H "Content-Type: application/json" \
  -d '{
    "basicSalary": 55000,
    "allowance": 6000
  }'
```

**Delete Contract:**
```bash
curl -X DELETE http://localhost:4000/api/contracts/1
```

### JavaScript/Fetch Examples

**Create Contract:**
```javascript
const response = await fetch('http://localhost:4000/api/contracts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    position: 'Software Engineer',
    assessmentDate: '2024-01-15T10:00:00',
    basicSalary: 50000,
    termMonths: 12,
  }),
});

const result = await response.json();
console.log(result);
```

**Get All Contracts:**
```javascript
const response = await fetch('http://localhost:4000/api/contracts');
const result = await response.json();
console.log(result.data);
```

**Update Contract:**
```javascript
const response = await fetch('http://localhost:4000/api/contracts/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    basicSalary: 55000,
    allowance: 6000,
  }),
});

const result = await response.json();
console.log(result);
```

**Delete Contract:**
```javascript
const response = await fetch('http://localhost:4000/api/contracts/1', {
  method: 'DELETE',
});

const result = await response.json();
console.log(result);
```

---

## Error Codes

- `400 Bad Request`: Validation error or invalid input
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server/database error

---

## Notes

- All endpoints use prepared statements to prevent SQL injection
- All inputs are validated before database operations
- Date fields accept ISO 8601 format strings
- Numeric fields are validated for type and range
- Partial updates are supported for PUT requests
