# Debugging: Admin Not Seeing Employee Screen

## Issue
Admin sees "Waiting for [Employee] to start sharing..." even though employee has started sharing.

## Flow Check Points

### 1. Employee Side
- ✅ Employee clicks "Start Sharing"
- ✅ `useScreenShare.js` calls `emit('monitoring:start-sharing')`
- ✅ Backend receives event (check backend logs)

### 2. Backend Side
- ✅ Backend receives `monitoring:start-sharing`
- ✅ Backend sets `streamActive: true` on session
- ✅ Backend notifies all admins in `session.adminSocketIds`
- ❓ Check: Is admin in `session.adminSocketIds`?

### 3. Admin Side
- ❓ Admin receives `monitoring:stream-started` event?
- ❓ `handleStreamStarted` is called?
- ❓ `selectedSession` is updated with `streamActive: true`?
- ❓ UI re-renders with updated state?

## Debugging Steps

1. **Check Backend Logs:**
   ```
   [Monitoring] Employee [name] started sharing for session [sessionId]
   [Monitoring] Notifying X admin(s) about stream start
   [Monitoring] Sending stream-started to admin [adminSocketId]
   ```

2. **Check Admin Browser Console:**
   ```
   [Monitoring] Socket.IO event received: ['monitoring:stream-started', {...}]
   [Monitoring] Stream started event received: { targetSessionId, employeeName }
   [Monitoring] Checking if admin is viewing: { isViewing: true/false, ... }
   ```

3. **Check if Admin is in Session:**
   - When admin joins, backend should log: `[Monitoring] Admin [name] ([socketId]) joined session [sessionId]`
   - When employee starts sharing, check: `[Monitoring] Session found: [sessionId], current admins: [adminSocketIds]`
   - Verify admin's socket ID is in the list

## Common Issues

1. **Admin not in session.adminSocketIds:**
   - Admin joined before employee authenticated
   - Socket reconnected and lost session association
   - Fix: Ensure admin is added to session when joining

2. **Event not received:**
   - Socket.IO connection issue
   - Event name mismatch
   - Fix: Check Socket.IO connection status

3. **State not updating:**
   - Stale closure in useEffect
   - selectedSession not syncing with sessions list
   - Fix: Use functional updates and sync selectedSession

4. **UI not re-rendering:**
   - React not detecting state change
   - Condition check is wrong
   - Fix: Ensure state updates trigger re-render
