# Remote Support Screen Share - Setup Guide

## Overview
This feature enables consent-based screen sharing between employees and admins using WebRTC and Socket.IO.

## Features
- ✅ Consent-based: Employee must explicitly click "Start Sharing"
- ✅ Visual indicator: "Sharing ON" banner with stop button
- ✅ Role-based access: Admin can only view after employee starts
- ✅ WebRTC streaming with Socket.IO signaling
- ✅ Simple dev authentication (role + name)

## Installation Steps

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install socket.io
```

**Frontend:**
```bash
cd frontend
npm install socket.io-client
```

### 2. Start the Backend Server

```bash
cd backend
npm run dev
# or
npm start
```

The server will start on `http://localhost:4000` (or PORT from .env).

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (or Vite default port).

## Usage

### For Employees:

1. Navigate to **Monitoring** in the sidebar
2. Select role: **Employee**
3. Enter your name
4. Click **Continue**
5. Click **Start Sharing** button
6. Select the screen/window to share in the browser prompt
7. A red "Sharing ON" banner will appear at the top
8. Click **Stop Sharing** to end the session

### For Admins:

1. Navigate to **Monitoring** in the sidebar
2. Select role: **Admin**
3. Enter your name
4. Click **Continue**
5. You'll see a list of active employee sessions
6. Click on a session to start viewing
7. The employee's screen will appear in the video viewer
8. Click **Stop Viewing** to disconnect

## Technical Details

### WebRTC Configuration
- **STUN Server**: `stun:stun.l.google.com:19302`
- **Signaling**: Socket.IO events
- **Stream Type**: Screen capture (getDisplayMedia)

### Socket.IO Events

**Authentication:**
- `monitoring:auth` - Client → Server (role, name)
- `monitoring:session-created` - Server → Employee (sessionId)
- `monitoring:sessions-list` - Server → Admin (sessions array)

**Session Management:**
- `monitoring:start-sharing` - Employee → Server
- `monitoring:stop-sharing` - Employee → Server
- `monitoring:join-session` - Admin → Server (sessionId)
- `monitoring:leave-session` - Admin → Server

**WebRTC Signaling:**
- `monitoring:offer` - Admin → Server → Employee
- `monitoring:answer` - Employee → Server → Admin
- `monitoring:ice-candidate` - Bidirectional

**Status Updates:**
- `monitoring:stream-started` - Server → Admin
- `monitoring:stream-stopped` - Server → Admin
- `monitoring:admin-joined` - Server → Employee
- `monitoring:admin-left` - Server → Employee

## File Structure

### Backend
- `backend/src/server.js` - Socket.IO server setup and event handlers
- `backend/src/services/monitoringService.js` - Session management
- `backend/src/routes/monitoring.js` - REST API routes

### Frontend
- `frontend/src/pages/Monitoring.jsx` - Main monitoring page component
- `frontend/src/hooks/useScreenShare.js` - WebRTC screen sharing logic
- `frontend/src/hooks/useSocket.js` - Socket.IO connection (already existed)

## Security Notes

⚠️ **Development Only**: The current authentication is simple (role + name) and should NOT be used in production.

For production:
- Implement proper JWT authentication
- Add role-based access control (RBAC)
- Use HTTPS/WSS for secure connections
- Add rate limiting
- Implement session expiration
- Add audit logging

## Troubleshooting

### Connection Issues
- Ensure backend is running on port 4000 (or configured PORT)
- Check CORS settings in `backend/src/server.js`
- Verify Socket.IO connection in browser console

### Screen Sharing Not Working
- Ensure browser supports `getDisplayMedia()` (Chrome, Firefox, Edge)
- Check browser permissions for screen sharing
- Verify WebRTC is not blocked by firewall/proxy

### No Video Stream
- Check browser console for WebRTC errors
- Verify STUN server is accessible
- Check network connectivity between client and server

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (limited support)
- ❌ Internet Explorer (not supported)

## Next Steps

1. Add JWT authentication
2. Add session recording (optional)
3. Add chat/audio support
4. Add connection quality indicators
5. Add reconnection handling
6. Add session history/logging
