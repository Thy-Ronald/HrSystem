# EmailJS Troubleshooting Guide

## ✅ Checklist to Fix Email Not Sending

### 1. **Verify EmailJS Configuration**

Check your `backend/.env` file has:
```env
EMAILJS_SERVICE_ID=service_xre2ekc
EMAILJS_TEMPLATE_ID=template_jfkytol
EMAILJS_PRIVATE_KEY=ji-KpLQ9Vq7RJArO4UqJF
ADMIN_EMAIL=ronaldmoran930@gmail.com
```

**Important:** Restart your backend server after changing `.env` file!

### 2. **Enable Server-Side API Access (CRITICAL!)**

**This is the most common issue!**

1. Go to EmailJS Dashboard → **Account** → **Security**
2. Look for **"Allow server-side API calls"** or **"Allow non-browser applications"**
3. **Enable this setting** (it's disabled by default)
4. Save the settings
5. Restart your backend server

**Without this setting enabled, you'll get:**
```
403: API calls are disabled for non-browser applications
```

### 3. **Check EmailJS Dashboard Settings**

#### A. Email Service Connection
1. Go to EmailJS Dashboard → **Email Services**
2. Verify `service_xre2ekc` is **connected** and **active**
3. If not connected, connect your email service (Gmail, Outlook, etc.)
4. Test the service by sending a test email from the dashboard

#### B. Template Configuration
1. Go to **Email Templates** → `template_jfkytol`
2. Verify these variables exist in your template:
   - `{{to_email}}` - Should be in "To Email" field
   - `{{subject}}` - Should be in "Subject" field
   - `{{{message}}}` - Should be in "Content" field
3. Make sure "To Email" field uses: `{{to_email}}` (not a hardcoded email)

#### C. API Keys
1. Go to **Account** → **API Keys**
2. Verify your **Private Key** matches what's in `.env`
3. Make sure the key is **active** (not revoked)

### 3. **Check Backend Logs**

After restarting backend, look for:
- ✅ `EmailJS configured successfully.`
- ✅ `✓ Contract expiration notification sent for: [Name]`
- ✅ `✓ Email sent to: ronaldmoran930@gmail.com`

If you see errors, check:
- ✗ `EmailJS configuration missing` → Check `.env` file
- ✗ `403 API calls are disabled` → Use Private Key (not Public Key)
- ✗ `400 Bad Request` → Check template variables match

### 4. **Test Email Sending**

Run this command to test:
```bash
POST http://localhost:4000/api/contracts/test-expiration-notifications
```

Or use PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/contracts/test-expiration-notifications" -Method POST
```

### 5. **Check Email Delivery**

1. **Check Spam/Junk Folder** - Emails might be filtered
2. **Check EmailJS Dashboard** → **Email Logs** - See if emails were sent
3. **Try Different Email Address** - Test with another email to rule out recipient issues
4. **Check Email Service Limits** - Free plans have daily limits

### 6. **Common Issues**

| Issue | Solution |
|-------|----------|
| 403 "API calls disabled" | Use Private Key, not Public Key |
| Template variables not working | Match exact variable names (case-sensitive) |
| Email not received | Check spam folder, verify email service is connected |
| Service not connected | Connect email service in EmailJS dashboard |

### 7. **Debug Steps**

1. **Restart Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Check Console Output**
   - Look for detailed error messages
   - Check template params being sent

3. **Test Template in Dashboard**
   - Use "Test It" button in EmailJS template editor
   - Verify email is received from dashboard test

4. **Verify Template Variables**
   - Our code sends: `to_email`, `subject`, `message`
   - Template must use: `{{to_email}}`, `{{subject}}`, `{{{message}}}`

## Still Not Working?

1. Check EmailJS dashboard → Email Logs for delivery status
2. Verify email service (Gmail/Outlook) is properly connected
3. Try sending a test email directly from EmailJS dashboard
4. Check if your email provider is blocking emails
5. Verify Private Key is correct (copy from EmailJS dashboard)
