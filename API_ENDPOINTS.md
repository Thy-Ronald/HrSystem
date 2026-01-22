# API Endpoints Documentation

Base URL: `http://localhost:4000` (or your configured PORT)

---

## Health Check

### GET `/api/health`
Check server and database status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

---

## GitHub Endpoints

### GET `/api/github/:username`
Get GitHub profile and repositories for a user.

**Parameters:**
- `username` (path parameter) - GitHub username

**Example:** `GET /api/github/octocat`

**Response:**
```json
{
  "profile": { ... },
  "repositories": [ ... ]
}
```

---

## Contract Endpoints

### POST `/api/contracts`
Create a new contract.

**Request Body:**
```json
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-01",
  "basicSalary": 50000,
  "termMonths": 12,
  "allowance": 5000,
  "attendanceBonus": 1000,
  "fullAttendanceBonus": 2000,
  "signingBonus": "5000",
  "expirationDate": "2025-01-01",
  "resignationDate": null
}
```

**Required Fields:**
- `name` (string, max 255 chars)
- `position` (string, max 255 chars)
- `assessmentDate` (date string)
- `basicSalary` (integer, >= 0)
- `termMonths` (integer, >= 1)

**Optional Fields:**
- `allowance` (integer, >= 0)
- `attendanceBonus` (number, >= 0)
- `fullAttendanceBonus` (number, >= 0)
- `signingBonus` (string, max 255 chars)
- `expirationDate` (date string) - auto-calculated if not provided
- `resignationDate` (date string)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "position": "Software Engineer",
    ...
  },
  "message": "Contract created successfully"
}
```

---

### GET `/api/contracts`
Get all contracts.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "position": "Software Engineer",
      "assessmentDate": "2024-01-01T00:00:00.000Z",
      "basicSalary": 50000,
      ...
    }
  ]
}
```

---

### GET `/api/contracts/expiring`
Get contracts expiring within a specified number of days.

**Query Parameters:**
- `days` (optional, default: 7) - Number of days to look ahead

**Example:** `GET /api/contracts/expiring?days=7`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "expirationDate": "2024-01-08T00:00:00.000Z",
      ...
    }
  ]
}
```

---

### GET `/api/contracts/:id`
Get a contract by ID.

**Parameters:**
- `id` (path parameter) - Contract ID (positive integer)

**Example:** `GET /api/contracts/1`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    ...
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Contract not found with ID 1"
}
```

---

### PUT `/api/contracts/:id`
Update a contract by ID.

**Parameters:**
- `id` (path parameter) - Contract ID (positive integer)

**Request Body:** (all fields optional for updates)
```json
{
  "name": "Jane Doe",
  "position": "Senior Software Engineer",
  "basicSalary": 60000,
  "expirationDate": "2025-06-01"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jane Doe",
    ...
  },
  "message": "Contract updated successfully"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Contract not found with ID 1"
}
```

---

### DELETE `/api/contracts/:id`
Delete a contract by ID.

**Parameters:**
- `id` (path parameter) - Contract ID (positive integer)

**Example:** `DELETE /api/contracts/1`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Contract deleted successfully"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Contract not found with ID 1"
}
```

---

## Test Endpoints

### POST `/api/contracts/test-expiration-notifications`
Test expiration notification system (legacy endpoint).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "found": 5,
    "sent": 3
  },
  "message": "Expiration check completed. Check logs for details."
}
```

---

### POST `/api/contracts/test-email`
Test direct email sending (legacy endpoint).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true
  },
  "message": "Test email sent successfully! Check your inbox."
}
```

---

## Error Responses

All endpoints return errors in the following format:

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    "name is required and must be a non-empty string",
    "basic_salary must be an integer"
  ]
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "Contract not found with ID 1"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Error details..."
}
```

---

## Postman Collection Tips

1. **Base URL:** Set as a variable: `{{baseUrl}}` = `http://localhost:4000`

2. **Headers:** 
   - `Content-Type: application/json` (for POST/PUT requests)

3. **Test Examples:**
   - Create: Use POST `/api/contracts` with required fields
   - List: Use GET `/api/contracts`
   - Get One: Use GET `/api/contracts/1` (replace 1 with actual ID)
   - Update: Use PUT `/api/contracts/1` with fields to update
   - Delete: Use DELETE `/api/contracts/1`
   - Expiring: Use GET `/api/contracts/expiring?days=7`
   - GitHub: Use GET `/api/github/octocat`

4. **Date Format:** Use ISO date strings: `"2024-01-01"` or `"2024-01-01T00:00:00.000Z"`
