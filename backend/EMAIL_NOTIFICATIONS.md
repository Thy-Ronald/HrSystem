# Contract Expiration Email Notifications

The system automatically sends email notifications to the admin **1 week (7 days) before** contract expiration dates.

## How It Works

### 1. Scheduled Job

A cron job runs **daily at 9:00 AM** to check for contracts expiring in 7 days:

```javascript
// Runs every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  await checkAndNotifyExpiringContracts();
});
```

### 2. Expiration Check

The system queries for contracts where:
- `resignation_date IS NULL` (contract is still active)
- `expiration_date` is between today and 7 days from now
- Or calculates expiration from `assessment_date + term_months` if `expiration_date` is null

### 3. Email Notification

For each contract expiring in 7 days:
- Sends email to admin (configured in `ADMIN_EMAIL` env variable)
- Includes contract details: employee name, position, expiration date, days until expiration
- Uses EmailJS service for delivery

## Configuration

### Environment Variables

Make sure these are set in your `.env` file:

```env
# EmailJS Configuration
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
ADMIN_EMAIL=admin@company.com
```

### EmailJS Setup

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com)
2. Create a service (Gmail, Outlook, etc.)
3. Create an email template
4. Enable "Allow server-side API calls" in Account → Security
5. Copy credentials to `.env` file

## Email Content

The email includes:

- **Subject**: `Contract Expiration Alert: [Employee Name] - [Contract Type]`
- **Body**:
  - Employee Name
  - Position
  - Contract Type (term in months)
  - Expiration Date (formatted)
  - Days Until Expiration
  - Warning message

## Testing

### Manual Test

You can manually trigger the expiration check:

```bash
# Via API endpoint
curl -X POST http://localhost:4000/api/contracts/test-expiration-notifications
```

### Test Email

Test email sending directly:

```bash
curl -X POST http://localhost:4000/api/contracts/test-email
```

## Example Email

```
Subject: Contract Expiration Alert: John Doe - 12 months

Contract Expiration Notification

Employee Name: John Doe
Position: Software Engineer
Contract Type: 12 months
Expiration Date: January 22, 2025
Days Until Expiration: 7

⚠️ This contract expires in 7 day(s). Please review and take necessary action before the contract expires.
```

## Automatic Notifications

### On Contract Creation

If a new contract is created that expires in exactly 7 days, an immediate notification is sent (no need to wait for the daily job).

### Daily Check

The cron job runs every day at 9:00 AM and checks all contracts:
- Finds contracts expiring in the next 7 days
- Sends one email per expiring contract
- Logs results to console

## Logs

Check server logs for notification activity:

```
=== Starting expiration check ===
Found 2 contract(s) expiring in 7 days:
  1. John Doe - Expires: 2025-01-22 00:00:00
  2. Jane Smith - Expires: 2025-01-23 00:00:00
✓ EmailJS response status: 200
✓ Contract expiration notification sent for: John Doe
✓ Email sent to: admin@company.com
=== Expiration check completed: 2/2 emails sent ===
```

## Troubleshooting

### Emails Not Sending

1. **Check EmailJS Configuration**
   - Verify all EmailJS credentials in `.env`
   - Ensure "Allow server-side API calls" is enabled in EmailJS dashboard

2. **Check Server Logs**
   - Look for EmailJS errors
   - Verify cron job is running

3. **Check Database**
   - Ensure contracts have `expiration_date` set
   - Verify `ADMIN_EMAIL` is correct

### Cron Job Not Running

- Check server is running
- Verify cron job started message appears in logs
- Check server timezone matches your schedule

### No Contracts Found

- Verify contracts exist with expiration dates
- Check `resignation_date` is NULL (not resigned)
- Ensure expiration dates are within 7 days

## Customization

### Change Notification Period

Edit `backend/src/services/notificationService.js`:

```javascript
// Change from 7 days to 14 days
const expiringContracts = await getContractsExpiringInDays(14);
```

### Change Schedule

Edit `backend/src/jobs/contractExpirationJob.js`:

```javascript
// Run at 8:00 AM instead of 9:00 AM
job = cron.schedule('0 8 * * *', async () => {
  // ...
});

// Run twice daily (9 AM and 5 PM)
job = cron.schedule('0 9,17 * * *', async () => {
  // ...
});
```

### Change Email Template

Update the email template in EmailJS dashboard or modify `backend/src/services/emailService.js` to customize the message format.
