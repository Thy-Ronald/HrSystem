# Frontend Integration with MySQL-Backed APIs

This document describes how the React frontend connects to the MySQL-backed REST APIs.

## Overview

The frontend has been updated to:
- Use Axios/Fetch for API calls
- Handle loading and error states properly
- Submit Employee Contract Form to MySQL
- Display saved contracts from MySQL
- Store computed salary values correctly

## API Service (`src/services/api.js`)

### Updated Functions

All API functions now handle the consistent JSON response format:

```javascript
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Functions Available

- `submitContract(payload)` - Create a new contract
- `fetchContracts()` - Get all contracts
- `fetchContractById(id)` - Get a contract by ID
- `updateContract(id, payload)` - Update a contract
- `deleteContract(id)` - Delete a contract

### Error Handling

The `handleResponse` function:
- Parses JSON responses
- Extracts data from `success: true` responses
- Throws errors with status codes and error arrays
- Handles validation errors from the API

## Contract Form (`src/pages/ContractForm.jsx`)

### Field Mapping

The form maps frontend fields to MySQL schema:

| Frontend Field | MySQL Field | Notes |
|---------------|-------------|-------|
| `employeeName` | `name` | Required |
| `position` | `position` | Required |
| `assessmentDate` | `assessmentDate` | Required, converted to ISO datetime |
| `basicSalary` | `basicSalary` | Required, converted to integer |
| `term` | `termMonths` | Required, converted to integer |
| `allowance` | `allowance` | Optional, converted to integer |
| `attendanceBonusAmount` | `attendanceBonus` | Calculated from percentage, stored as float |
| `perfectAttendanceAmount` | `fullAttendanceBonus` | Calculated from percentage, stored as float |
| `signingBonus` | `signingBonus` | Optional, stored as string |

### Salary Calculations

The form calculates bonus amounts from percentages:
- **Attendance Bonus**: `basicSalary * (attendanceBonusPercent / 100)`
- **Perfect Attendance Bonus**: `basicSalary * (perfectAttendancePercent / 100)`
- **Total Salary**: `basicSalary + allowance + attendanceBonus + fullAttendanceBonus + signingBonus`

These calculated values are stored in MySQL as actual amounts, not percentages.

### Loading States

- **Loading contracts**: Shows "Loading contracts..." message
- **Submitting form**: Button shows "Saving..." and is disabled
- **Error states**: Displays error messages in red
- **Success states**: Shows success message in green

### Error Handling

- **Validation errors**: Displays field-specific errors from API
- **Network errors**: Shows user-friendly error messages
- **API errors**: Extracts and displays error messages from API response

## Contract List Display

### Displayed Fields

- Employee Name (`name`)
- Position (`position`)
- Assessment Date (`assessmentDate`)
- Term (`termMonths` months)
- Basic Salary (`basicSalary`)
- Total Salary (calculated from all salary components)
- Created Date (`createdDate`)

### Total Salary Calculation

The total salary is calculated on display:
```javascript
const contractTotalSalary = 
  (contract.basicSalary || 0) +
  (contract.allowance || 0) +
  (contract.attendanceBonus || 0) +
  (contract.fullAttendanceBonus || 0) +
  (Number(contract.signingBonus) || 0);
```

## Usage Example

### Creating a Contract

```javascript
const contractData = {
  name: "John Doe",
  position: "Software Engineer",
  assessmentDate: "2024-01-15T10:00:00",
  basicSalary: 50000,
  termMonths: 12,
  allowance: 5000,
  attendanceBonus: 1000.50,  // Calculated amount
  fullAttendanceBonus: 2000.75, // Calculated amount
  signingBonus: "5000",
  resignationDate: null
};

await submitContract(contractData);
```

### Fetching Contracts

```javascript
try {
  const contracts = await fetchContracts();
  // contracts is an array of contract objects
} catch (error) {
  // Handle error
  console.error('Failed to load contracts:', error.message);
}
```

## Environment Variables

Set `VITE_API_BASE` in `.env` file:

```env
VITE_API_BASE=http://localhost:4000
```

If not set, defaults to `http://localhost:4000`.

## Error Messages

### Validation Errors

When API returns validation errors:
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

The form maps these to specific field errors.

### Network Errors

- Connection refused: "Unable to connect to server"
- Timeout: "Request timed out"
- Server error: "Server error occurred"

### API Errors

- 400 Bad Request: Validation errors displayed
- 404 Not Found: "Resource not found"
- 500 Internal Server Error: "Server error occurred"

## Testing

### Test Contract Creation

1. Fill in required fields:
   - Employee Name
   - Position
   - Assessment Date
   - Basic Salary
   - Term (months)

2. Optionally fill bonus percentages:
   - Attendance Bonus (%)
   - Perfect Attendance (%)

3. Click "Save Contract"

4. Verify:
   - Success message appears
   - Contract appears in list
   - Calculated amounts are stored correctly

### Test Error Handling

1. Submit form with missing required fields
2. Verify validation errors appear
3. Submit with invalid data (negative salary)
4. Verify API validation errors are displayed

## Notes

- All salary calculations happen client-side before submission
- Calculated amounts (not percentages) are stored in MySQL
- Dates are converted to ISO format before submission
- Numeric fields are converted to appropriate types (int/float)
- The form automatically reloads contracts after successful submission
