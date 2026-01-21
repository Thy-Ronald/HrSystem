# Testing Guide - HR Management System

## Prerequisites

1. **Backend server running:**
   ```bash
   cd backend
   npm start
   # Should see: "Backend listening on port 4000"
   # Should see: "EmailJS configured successfully."
   ```

2. **Frontend server running:**
   ```bash
   cd frontend
   npm run dev
   # Should see: "Local: http://localhost:5173"
   ```

3. **EmailJS configured:**
   - Private Key added to `backend/.env`
   - Server-side API enabled in EmailJS Dashboard → Account → Security

---

## Test 1: Contract Form (Frontend)

### Steps:

1. **Open browser:** `http://localhost:5173`

2. **Click "New Contract"** button

3. **Fill out the form:**

   **Employee Info:**
   - Employee Name: `INTO, PETER ANDREW`
   - Position: `Software Developer`
   - Employment Date: `2026-01-21` (today)
   - Assessment Date: `2026-01-21` (today)

   **Contract Details:**
   - Contract Type: `Contract 2`
   - Term: `1 year`
   - **Expiration Date: `2026-01-28`** (7 days from today - IMPORTANT!)
   - Resignation: (leave empty)
   - Current Offer: `Yes`
   - Signing Bonus: `5000`

   **Salary Breakdown:**
   - Basic Salary: `50000`
   - Allowance: `5000`
   - Attendance Bonus (%): `10`
   - Perfect Attendance (%): `5`

4. **Verify calculations:**
   - Attendance Bonus Amount should show: `5000` (10% of 50000)
   - Perfect Attendance Amount should show: `2500` (5% of 50000)
   - Total Salary should show: `62500`

5. **Click "Save Contract"**

6. **Check results:**
   - ✅ Form closes automatically
   - ✅ Success message appears
   - ✅ New contract appears in the employee table
   - ✅ Table shows all contract details

---

## Test 2: Email Expiration Notification

### Option A: Manual Test via API

**Using PowerShell:**
```powershell
# Trigger expiration check
Invoke-RestMethod -Uri "http://localhost:4000/api/contracts/test-expiration-notifications" -Method POST
```

**Using curl:**
```bash
curl -X POST http://localhost:4000/api/contracts/test-expiration-notifications
```

**Expected output:**
```json
{
  "message": "Expiration check completed. Check logs for details."
}
```

**Check backend console for:**
- ✅ `Found 1 contract(s) expiring in 7 days.`
- ✅ `✓ Contract expiration notification sent for: INTO, PETER ANDREW`
- ✅ `✓ Email sent to: ronaldmoran930@gmail.com`

**Check email inbox:**
- ✅ Email received at `ronaldmoran930@gmail.com`
- ✅ Subject: "Contract Expiration Alert: INTO, PETER ANDREW - Contract 2"
- ✅ Contains contract details

### Option B: Automated Test Script

**Run the test script:**
```bash
cd backend
node test-expiration.js
```

This will:
1. Create a test contract with expiration date 7 days from now
2. Trigger the expiration check
3. Show results

---

## Test 3: Employee Table Display

1. **Create multiple contracts** with different:
   - Employee names
   - Positions
   - Expiration dates
   - Salaries

2. **Verify table displays:**
   - ✅ All contracts listed
   - ✅ Columns: Name, Position, Contract Type, Term, Expiration Date, Total Salary, Created
   - ✅ Responsive layout (scrolls on mobile)
   - ✅ Hover effects work
   - ✅ Salary values formatted correctly

---

## Test 4: Form Validation

### Test Required Fields:

1. **Try submitting empty form:**
   - ✅ Should show validation errors
   - ✅ Required fields highlighted in red

2. **Test invalid inputs:**
   - Negative numbers → Should show error
   - Percentages > 100 → Should show error
   - Invalid dates → Browser validation

3. **Test valid submission:**
   - ✅ All validations pass
   - ✅ Form submits successfully

---

## Test 5: Real-time Calculations

1. **Change Basic Salary:**
   - Enter `100000`
   - ✅ Attendance Bonus Amount updates automatically
   - ✅ Perfect Attendance Amount updates automatically
   - ✅ Total Salary updates automatically

2. **Change percentages:**
   - Change Attendance Bonus to `15`
   - ✅ Amount recalculates immediately

---

## Troubleshooting

### Email Not Sending?

1. **Check backend console:**
   ```bash
   # Look for errors like:
   # ✗ Failed to send email notification
   # 403: API calls are disabled
   ```

2. **Verify EmailJS settings:**
   - ✅ Private Key in `.env` file
   - ✅ Server-side API enabled in EmailJS Dashboard
   - ✅ Email service connected
   - ✅ Template uses correct variables

3. **Check email:**
   - ✅ Spam/junk folder
   - ✅ EmailJS Dashboard → Email Logs

### Form Not Saving?

1. **Check backend is running:**
   ```bash
   curl http://localhost:4000/api/health
   ```

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for network errors

3. **Verify API connection:**
   - Frontend should proxy `/api` to `http://localhost:4000`

---

## Quick Test Commands

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method GET

# List all contracts
Invoke-RestMethod -Uri "http://localhost:4000/api/contracts" -Method GET

# Test expiration notifications
Invoke-RestMethod -Uri "http://localhost:4000/api/contracts/test-expiration-notifications" -Method POST

# Create test contract
$expirationDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
$contract = @{
    employeeName = "TEST USER"
    position = "Developer"
    employmentDate = (Get-Date).ToString("yyyy-MM-dd")
    assessmentDate = (Get-Date).ToString("yyyy-MM-dd")
    contractType = "Contract 2"
    term = "1 year"
    expirationDate = $expirationDate
    basicSalary = "50000"
    totalSalary = "50000"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/api/contracts" -Method POST -Body $contract -ContentType "application/json"
```

---

## Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Form Submission | ✅ Contract saved, appears in table |
| Email Notification | ✅ Email received at admin address |
| Table Display | ✅ All contracts shown in table format |
| Calculations | ✅ Real-time updates on field changes |
| Validation | ✅ Errors shown for invalid inputs |
| Expiration Check | ✅ Finds contracts expiring in 7 days |
