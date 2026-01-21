# Validation and Error Handling

This document describes the validation middleware and error handling system for the Contracts API.

## Validation Middleware

### Required Fields

The following fields are **required** when creating a contract:

- `name` - Employee full name (string, max 255 characters)
- `position` - Job title (string, max 255 characters)
- `assessment_date` - Assessment date (valid date/datetime)
- `basic_salary` - Base salary (integer, >= 0)
- `term_months` - Contract duration in months (integer, >= 1)

**Note:** Field names can be provided in either camelCase (`assessmentDate`) or snake_case (`assessment_date`).

### Validation Rules

#### String Fields
- `name`: Required, non-empty string, max 255 characters
- `position`: Required, non-empty string, max 255 characters
- `signing_bonus`: Optional, string, max 255 characters

#### Numeric Fields (All must be >= 0)
- `basic_salary`: Required, integer, >= 0
- `term_months`: Required, integer, >= 1
- `allowance`: Optional, integer, >= 0
- `attendance_bonus`: Optional, float, >= 0
- `full_attendance_bonus`: Optional, float, >= 0

#### Date Fields (Must be valid dates)
- `assessment_date`: Required, valid date/datetime
- `resignation_date`: Optional, valid date/datetime

### Validation Examples

**Valid Request:**
```json
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": 50000,
  "termMonths": 12
}
```

**Invalid Request (Missing Required Field):**
```json
{
  "name": "John Doe",
  "position": "Software Engineer"
  // Missing: assessmentDate, basicSalary, termMonths
}
```
**Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "assessment_date is required",
    "basic_salary is required",
    "term_months is required"
  ]
}
```

**Invalid Request (Negative Salary):**
```json
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": -1000,
  "termMonths": 12
}
```
**Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "basic_salary must be 0 or greater"
  ]
}
```

**Invalid Request (Invalid Date):**
```json
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "invalid-date",
  "basicSalary": 50000,
  "termMonths": 12
}
```
**Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "assessment_date must be a valid date"
  ]
}
```

---

## Error Handling

The error handler middleware sanitizes all errors and **never exposes raw SQL errors** to clients.

### Error Types Handled

#### 1. Duplicate Entry Errors

**MySQL Error:** `ER_DUP_ENTRY` (1062)

**Client Response:** `409 Conflict`
```json
{
  "success": false,
  "error": "Duplicate entry",
  "message": "A record with this information already exists"
}
```

#### 2. Missing Records

**Scenario:** Requesting a contract that doesn't exist

**Client Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Contract not found",
  "message": "No contract found with ID 999"
}
```

#### 3. SQL Errors

All SQL errors are sanitized and never expose:
- Raw SQL queries
- Database structure details
- Connection strings
- Internal error codes

**Client Response:** `400 Bad Request` or `500 Internal Server Error`
```json
{
  "success": false,
  "error": "Database error",
  "message": "An unexpected database error occurred"
}
```

#### 4. Connection Errors

**MySQL Error:** `ECONNREFUSED`, `ETIMEDOUT`, `PROTOCOL_CONNECTION_LOST`

**Client Response:** `503 Service Unavailable`
```json
{
  "success": false,
  "error": "Service unavailable",
  "message": "Database service is temporarily unavailable"
}
```

#### 5. Validation Errors

**Client Response:** `400 Bad Request`
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

#### 6. Constraint Violations

**MySQL Error:** `ER_CHECK_CONSTRAINT_VIOLATED`

**Client Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Constraint violation",
  "message": "Data validation failed"
}
```

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Error type",
  "message": "User-friendly error message",
  "errors": ["Array of validation errors"] // Only for validation errors
}
```

### Security Features

✅ **No Raw SQL Exposure** - SQL queries, error codes, and database details are never sent to clients  
✅ **Sanitized Messages** - All error messages are user-friendly and don't reveal system internals  
✅ **Consistent Format** - All errors follow the same JSON structure  
✅ **Proper Status Codes** - HTTP status codes accurately reflect error types  

### Error Logging

Errors are logged server-side with full details for debugging:

```javascript
// Server-side log (not sent to client)
{
  message: "Duplicate entry 'john@example.com' for key 'email'",
  code: "ER_DUP_ENTRY",
  errno: 1062,
  sqlState: "23000",
  stack: "..." // Only in development
}
```

---

## Usage Examples

### Creating a Contract with Validation

```javascript
// Valid request
const response = await fetch('/api/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    position: 'Software Engineer',
    assessmentDate: '2024-01-15T10:00:00',
    basicSalary: 50000,
    termMonths: 12
  })
});

// Success: 201 Created
// {
//   "success": true,
//   "data": { ... },
//   "message": "Contract created successfully"
// }
```

### Handling Validation Errors

```javascript
// Invalid request (missing required field)
const response = await fetch('/api/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe'
    // Missing required fields
  })
});

const result = await response.json();
// result.errors contains array of validation errors
if (!result.success) {
  result.errors.forEach(error => console.error(error));
}
```

### Handling Missing Records

```javascript
// Request non-existent contract
const response = await fetch('/api/contracts/999');
const result = await response.json();

if (!result.success && response.status === 404) {
  console.error('Contract not found');
}
```

### Handling Duplicate Entries

```javascript
// Try to create duplicate (if unique constraint exists)
const response = await fetch('/api/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});

const result = await response.json();
if (!result.success && response.status === 409) {
  console.error('Duplicate entry:', result.message);
}
```

---

## Testing Validation

### Test Required Fields

```bash
curl -X POST http://localhost:4000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{}'
# Returns: 400 with validation errors
```

### Test Numeric Validation

```bash
curl -X POST http://localhost:4000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "position": "Test",
    "assessmentDate": "2024-01-15",
    "basicSalary": -1000,
    "termMonths": 12
  }'
# Returns: 400 - "basic_salary must be 0 or greater"
```

### Test Date Validation

```bash
curl -X POST http://localhost:4000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "position": "Test",
    "assessmentDate": "invalid-date",
    "basicSalary": 50000,
    "termMonths": 12
  }'
# Returns: 400 - "assessment_date must be a valid date"
```

### Test Missing Record

```bash
curl http://localhost:4000/api/contracts/999
# Returns: 404 - "Contract not found"
```

---

## Summary

- ✅ **Required fields validated**: name, position, assessment_date, basic_salary, term_months
- ✅ **Salary fields >= 0**: All numeric salary/bonus fields validated
- ✅ **Dates validated**: All date fields checked for validity
- ✅ **SQL errors handled**: All database errors sanitized
- ✅ **Duplicate entries handled**: Returns 409 Conflict
- ✅ **Missing records handled**: Returns 404 Not Found
- ✅ **No raw SQL exposure**: All errors sanitized before sending to client
