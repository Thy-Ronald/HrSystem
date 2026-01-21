# Contract Expiration System - How It Works

Complete guide to understanding how contract expiration dates are calculated, stored, and how email notifications are sent.

## Overview

The system automatically:
1. **Calculates** expiration dates from `assessment_date + term_months`
2. **Stores** expiration dates in the database
3. **Checks** daily for contracts expiring in 7 days
4. **Sends** email notifications to admin 1 week before expiration

---

## 1. Expiration Date Calculation

### When Creating a Contract

**Automatic Calculation:**
- If you don't provide `expirationDate`, the system calculates it:
  ```
  expiration_date = assessment_date + term_months
  ```

**Example:**
- Assessment Date: `2024-01-15`
- Term: `12 months`
- **Calculated Expiration:** `2025-01-15`

**Manual Override:**
- You can also provide a custom `expirationDate`:
  ```json
  {
    "assessmentDate": "2024-01-15",
    "termMonths": 12,
    "expirationDate": "2025-06-30"  // Custom expiration
  }
  ```

### Code Flow

```javascript
// In contractStore.js - createContract()
1. Validate input data
2. Check if expirationDate provided
3. If NOT provided:
   - Get assessmentDate
   - Add termMonths to it
   - Calculate expirationDate
4. Store expirationDate in database
```

---

## 2. Database Storage

### Schema

The `expiration_date` field is stored in the `staff_contract` table:

```sql
expiration_date DATETIME NULL DEFAULT NULL
```

- **Nullable**: Can be NULL (will be calculated on-the-fly if needed)
- **Indexed**: For fast queries
- **Constraint**: Must be >= assessment_date

### Storage Examples

| Assessment Date | Term (Months) | Expiration Date (Stored) |
|----------------|---------------|--------------------------|
| 2024-01-15     | 12            | 2025-01-15               |
| 2024-06-01     | 6             | 2024-12-01               |
| 2024-03-20     | 24            | 2026-03-20               |

---

## 3. Email Notification System

### Scheduled Job

**Cron Schedule:** `0 9 * * *` (Every day at 9:00 AM)

```javascript
// Runs daily at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  await checkAndNotifyExpiringContracts();
});
```

### Notification Flow

```
1. Cron job triggers at 9:00 AM
   ↓
2. Query database for contracts expiring in 7 days
   ↓
3. Filter: resignation_date IS NULL (active contracts only)
   ↓
4. For each expiring contract:
   - Calculate days until expiration
   - Format email message
   - Send email to admin
   ↓
5. Log results
```

### Query Logic

The system finds contracts where:
```sql
expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
```

**Example:**
- Today: `2025-01-15`
- Finds contracts expiring: `2025-01-15` to `2025-01-22`
- Sends notification for contracts expiring in exactly 7 days

---

## 4. Email Content

### Email Subject
```
Contract Expiration Alert: [Employee Name] - [Contract Type]
```

### Email Body
```
Contract Expiration Notification

Employee Name: John Doe
Position: Software Engineer
Contract Type: 12 months
Expiration Date: January 22, 2025
Days Until Expiration: 7

⚠️ This contract expires in 7 day(s). Please review and take necessary action before the contract expires.
```

### Email Recipient
- Sent to: `ADMIN_EMAIL` (from .env)
- Default: `admin@company.com`

---

## 5. Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  CREATE CONTRACT                                        │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Calculate Expiration  │
        │  assessment_date +     │
        │  term_months          │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Store in Database     │
        │  expiration_date      │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Check: Expires in     │
        │  7 days?              │
        └───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │ YES                    │ NO
        ▼                        ▼
┌───────────────┐      ┌──────────────────┐
│ Send Email    │      │ Store & Continue │
│ Immediately   │      └──────────────────┘
└───────────────┘
                    │
                    │
        ┌───────────▼───────────┐
        │  DAILY CRON JOB       │
        │  (9:00 AM)            │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Query: Contracts      │
        │  expiring in 7 days   │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  For Each Contract:    │
        │  Send Email to Admin   │
        └───────────────────────┘
```

---

## 6. Key Functions

### `createContract(data)`
- Calculates expiration if not provided
- Stores expiration_date in database
- Checks if expires in 7 days → sends immediate notification

### `getContractsExpiringInDays(days = 7)`
- Queries contracts expiring within specified days
- Uses `expiration_date` field (or calculates if NULL)
- Returns array of expiring contracts

### `checkAndNotifyExpiringContracts()`
- Called by cron job daily
- Gets contracts expiring in 7 days
- Sends email for each contract

### `sendContractExpirationNotification(contract)`
- Formats email message
- Calculates days until expiration
- Sends via EmailJS

---

## 7. Examples

### Example 1: Contract Created Today

**Input:**
```json
{
  "name": "John Doe",
  "position": "Software Engineer",
  "assessmentDate": "2024-01-15T10:00:00",
  "basicSalary": 50000,
  "termMonths": 12
}
```

**What Happens:**
1. System calculates: `2024-01-15 + 12 months = 2025-01-15`
2. Stores `expiration_date = 2025-01-15`
3. Checks: Does it expire in 7 days? (No, it's 365 days away)
4. No immediate email sent
5. Daily job will check again tomorrow

### Example 2: Contract Expiring Soon

**Input:**
```json
{
  "name": "Jane Smith",
  "assessmentDate": "2024-01-08T10:00:00",  // 7 days ago
  "termMonths": 12
}
```

**What Happens:**
1. Calculates: `2024-01-08 + 12 months = 2025-01-08`
2. Today is `2025-01-15` (7 days after expiration)
3. If created today with expiration in 7 days → immediate email sent

### Example 3: Daily Check

**Scenario:** Today is `2025-01-15`

**Database Query:**
```sql
SELECT * FROM staff_contract
WHERE expiration_date BETWEEN '2025-01-15' AND '2025-01-22'
AND resignation_date IS NULL
```

**Results:**
- Contract A expires `2025-01-16` → Email sent
- Contract B expires `2025-01-20` → Email sent
- Contract C expires `2025-01-22` → Email sent
- Contract D expires `2025-02-01` → No email (too far)

---

## 8. Edge Cases Handled

### Expiration Date is NULL
- System calculates on-the-fly: `assessment_date + term_months`
- Used in queries and notifications

### Contract Already Resigned
- `resignation_date IS NOT NULL` → Excluded from expiration checks
- No notifications sent for resigned employees

### Multiple Contracts Same Day
- Each contract gets its own email
- Admin receives separate notification for each

### Timezone Considerations
- Uses MySQL `CURDATE()` for date comparison
- Compares dates only (ignores time)
- Ensures consistent behavior across timezones

---

## 9. Configuration

### Environment Variables

```env
# EmailJS for notifications
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
ADMIN_EMAIL=admin@company.com
```

### Cron Schedule

Change in `backend/src/jobs/contractExpirationJob.js`:

```javascript
// Current: Daily at 9:00 AM
'0 9 * * *'

// Options:
'0 8 * * *'    // 8:00 AM
'0 9,17 * * *' // 9:00 AM and 5:00 PM
'0 */6 * * *'  // Every 6 hours
```

### Notification Period

Change in `backend/src/services/notificationService.js`:

```javascript
// Current: 7 days
await getContractsExpiringInDays(7);

// Options:
await getContractsExpiringInDays(14); // 2 weeks
await getContractsExpiringInDays(30); // 1 month
```

---

## 10. Testing

### Test Expiration Check

```bash
curl -X POST http://localhost:4000/api/contracts/test-expiration-notifications
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "found": 2,
    "sent": 2
  },
  "message": "Expiration check completed..."
}
```

### Test Email Sending

```bash
curl -X POST http://localhost:4000/api/contracts/test-email
```

### Create Test Contract

Create a contract that expires in exactly 7 days:

```bash
# Calculate date 7 days from now
# Then create contract with that expiration date
curl -X POST http://localhost:4000/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Employee",
    "position": "Test Position",
    "assessmentDate": "2024-01-08T10:00:00",
    "basicSalary": 50000,
    "termMonths": 12
  }'
```

---

## Summary

✅ **Automatic Calculation**: Expiration = Assessment Date + Term Months  
✅ **Database Storage**: Stored in `expiration_date` field  
✅ **Daily Checks**: Cron job runs at 9:00 AM  
✅ **7-Day Warning**: Emails sent 1 week before expiration  
✅ **Immediate Notifications**: New contracts expiring in 7 days trigger immediate email  
✅ **Smart Filtering**: Only active contracts (not resigned)  
✅ **Flexible**: Supports manual expiration dates or auto-calculation

The system ensures you never miss a contract expiration!
