# Testing Guide: Admin Monitoring & Employee Screen Sharing

This guide will help you test the screen sharing feature with both admin and employee roles simultaneously.

## Prerequisites

1. **Backend server running** on `http://localhost:4000`
2. **Frontend server running** on `http://localhost:5173` (or your configured port)
3. **Two browser windows/tabs** (or use incognito mode for one)
4. **Admin account created** (see `CREATE_ADMIN.md`)
5. **Employee account** (can be created via signup)

## Step-by-Step Testing Instructions

### Option 1: Two Browser Windows (Recommended)

#### Setup:
1. Open your main browser window
2. Open a second browser window (or use a different browser like Chrome + Firefox)
3. Alternatively, use one normal window and one incognito/private window

#### Test Scenario 1: Employee Starts Sharing First, Then Admin Joins

**Window 1 - Employee:**
1. Navigate to `http://localhost:5173`
2. Sign up or log in as an **employee** account
3. Go to the **Monitoring** page (from sidebar)
4. Click **"Start Sharing"** button
5. Select the screen/window you want to share
6. You should see:
   - "Sharing ON" banner at the top
   - "Stop Sharing" button
   - Session time remaining (30 minutes)

**Window 2 - Admin:**
1. Navigate to `http://localhost:5173` (or use incognito)
2. Log in as an **admin** account
3. Go to the **Monitoring** page
4. You should see:
   - Active session list showing the employee's name
   - Status showing "Waiting" or "Sharing"
5. Click on the employee's session to join
6. You should see:
   - The employee's screen in the video viewer
   - Connection status indicators
   - "Stop Viewing" button

**Expected Result:** Admin should see the employee's screen in real-time.

---

#### Test Scenario 2: Admin Joins First, Then Employee Starts Sharing

**Window 1 - Admin:**
1. Navigate to `http://localhost:5173`
2. Log in as an **admin** account
3. Go to the **Monitoring** page
4. Wait for an employee session (or proceed to Window 2 first)

**Window 2 - Employee:**
1. Navigate to `http://localhost:5173` (or use incognito)
2. Sign up or log in as an **employee** account
3. Go to the **Monitoring** page
4. Click **"Start Sharing"** button
5. Select the screen/window you want to share

**Window 1 - Admin (continue):**
1. Refresh the Monitoring page or wait for the session to appear
2. Click on the employee's session to join
3. You should see a message: "Waiting for [Employee Name] to start sharing..."
4. Once the employee starts sharing, the admin should automatically see the screen

**Expected Result:** Admin should see the employee's screen automatically when they start sharing.

---

### Option 2: Browser DevTools (Advanced)

You can also test using browser DevTools to simulate multiple users:

1. Open DevTools (F12)
2. Use the "Device Toolbar" or "Responsive Design Mode"
3. Open a second tab in the same browser
4. Note: This method may have limitations with WebRTC connections

---

## What to Check

### ✅ Employee Side Checks:
- [ ] "Start Sharing" button is clickable
- [ ] Browser permission prompt appears
- [ ] "Sharing ON" banner appears after starting
- [ ] Session time remaining is displayed (30 minutes)
- [ ] Toast notification shows "Screen sharing started"
- [ ] Can see admin count when admin joins
- [ ] "Stop Sharing" button works

### ✅ Admin Side Checks:
- [ ] Can see active sessions list
- [ ] Session shows employee name
- [ ] Session shows status (Waiting/Sharing)
- [ ] Can click to join a session
- [ ] Video viewer shows employee's screen
- [ ] Connection quality indicators work
- [ ] Toast notifications appear for events
- [ ] "Stop Viewing" button works

### ✅ WebRTC Connection Checks:
- [ ] Check browser console for WebRTC logs:
  - `[WebRTC] Sending offer for session: ...`
  - `[WebRTC] Received answer from employee`
  - `[Monitoring] Employee started sharing, initiating WebRTC connection`
- [ ] Check for any WebRTC errors in console
- [ ] Video stream should be smooth (no freezing)

---

## Troubleshooting

### Issue: Admin can't see employee screen

**Check:**
1. Open browser console (F12) on both windows
2. Look for WebRTC connection errors
3. Verify Socket.IO connection is established (check for connection status)
4. Check if employee's peer connection is initialized
5. Verify STUN server is accessible

**Common fixes:**
- Refresh both pages
- Check firewall/antivirus isn't blocking WebRTC
- Try a different browser
- Check backend logs for errors

### Issue: "Start Sharing" button not working

**Check:**
1. Verify employee is authenticated
2. Check Socket.IO connection status
3. Verify session was created (check console logs)
4. Check browser permissions for screen sharing

### Issue: Session not appearing for admin

**Check:**
1. Verify employee has started a session
2. Check backend logs for session creation
3. Verify Socket.IO events are being emitted
4. Refresh admin's Monitoring page

### Issue: Connection quality is poor

**Check:**
1. Network connection speed
2. Browser console for connection quality metrics
3. Try reducing screen resolution
4. Check if STUN server is accessible

---

## Quick Test Commands

### Check Backend Logs:
```bash
# In backend directory
npm run dev
# Watch for Socket.IO connection logs and WebRTC signaling logs
```

### Check Frontend Console:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for:
   - `[Monitoring]` logs
   - `[WebRTC]` logs
   - `[Socket.IO]` logs
   - Any error messages

---

## Test Checklist

- [ ] Employee can start sharing
- [ ] Admin can see active sessions
- [ ] Admin can join a session
- [ ] Admin can view employee's screen
- [ ] Employee can see admin joined notification
- [ ] Connection quality indicators work
- [ ] Session expiration countdown works
- [ ] Toast notifications appear correctly
- [ ] Stop sharing/viewing works
- [ ] Multiple admins can view same session (if applicable)

---

## Tips for Better Testing

1. **Use different browsers** for admin and employee to avoid cookie/session conflicts
2. **Keep console open** on both windows to see real-time logs
3. **Test on same network** first, then try different networks
4. **Check backend terminal** for server-side logs
5. **Test edge cases**: 
   - Employee stops sharing while admin is viewing
   - Admin leaves session while employee is sharing
   - Network disconnection scenarios

---

## Expected Console Logs

### Employee Console:
```
[Monitoring] Authenticating with Socket.IO: { role: 'employee', name: '...' }
[Monitoring] Session created successfully
[WebRTC] Initializing peer connection
[WebRTC] Received offer from admin
[WebRTC] Created answer
```

### Admin Console:
```
[Monitoring] Authenticating with Socket.IO: { role: 'admin', name: '...' }
[Monitoring] Session joined: { active: true, employeeName: '...' }
[WebRTC] Sending offer for session: session_...
[WebRTC] Received answer from employee
[WebRTC] Connection established
```

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check backend terminal for server errors
3. Verify both servers are running
4. Check network connectivity
5. Review the troubleshooting section above
