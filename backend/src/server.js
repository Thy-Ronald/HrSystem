const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const githubRouter = require('./routes/github');
const contractRouter = require('./routes/contracts');
const issuesRouter = require('./routes/issues');
const analyticsRouter = require('./routes/analytics');
const monitoringRouter = require('./routes/monitoring');
const notificationRoutes = require('./routes/notificationRoutes');
const Notification = require('./models/notificationModel');
const authRouter = require('./routes/auth');
const personnelRouter = require('./routes/personnelRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { socketAuth } = require('./middlewares/monitoringAuth');
const { validateAuthPayload, validateSessionId, validateSDP, validateICECandidate } = require('./middlewares/monitoringValidation');
const { socketRateLimiter } = require('./middlewares/rateLimiter');
const { generateToken } = require('./utils/jwt');
const { initializeEmailJS } = require('./services/emailService');
const { startContractExpirationJob } = require('./jobs/contractExpirationJob');
const { startCacheRefreshJob, stopCacheRefreshJob } = require('./jobs/cacheRefreshJob');
const { startRealtimeRefreshJob, stopRealtimeRefreshJob } = require('./jobs/realtimeRefreshJob');
const { testConnection } = require('./config/database');
const cacheService = require('./services/cacheService');
const monitoringService = require('./services/monitoringService');

// Fast lookup for user sockets: Map<userId, Set<socketId>>
const userSockets = new Map();

dotenv.config();

const app = express();
app.set('userSockets', userSockets);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected',
  });
});

app.use('/api/github', githubRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/auth', authRouter);
app.use('/api/monitoring/requests', require('./routes/monitoringRequestRoutes'));
app.use('/api/monitoring', monitoringRouter);
app.use('/api/personnel', personnelRouter);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', notificationRoutes);

// Expose io to controllers
app.set('io', io);

app.use(errorHandler);

// Initialize database connection and start server
async function startServer() {
  // Initialize Redis cache service
  try {
    await cacheService.connect();
    if (cacheService.getConnectionStatus()) {
      console.log('✅ Redis cache service initialized (Upstash)');
    } else {
      console.warn('⚠️ Redis not connected, using in-memory cache fallback');
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize Redis cache:', error.message);
    console.warn('⚠️ Using in-memory cache fallback');
  }

  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.warn('⚠ Warning: Database connection failed. The application may not work correctly.');
    console.warn('⚠ Please ensure MySQL is running and database credentials are correct.');
    console.warn('⚠ Run: npm run migrate (or node src/database/migrate.js) to set up the database schema.');
  }

  // Socket.IO connection handling with authentication
  io.use((socket, next) => {
    // For development: allow connection without auth, but require auth for monitoring events
    // For production: use socketAuth(socket, next) to require JWT on connection
    if (process.env.NODE_ENV === 'production') {
      return socketAuth(socket, next);
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Handle user authentication with JWT
    socket.on('monitoring:auth', async ({ role, name, token, connectionCode }) => {
      // Rate limiting: 10 auth attempts per 15 minutes
      if (!socketRateLimiter.checkLimit(socket.id, 10, 15 * 60 * 1000)) {
        socket.emit('monitoring:error', {
          message: 'Too many authentication attempts. Please wait before trying again.',
        });
        return;
      }

      // Validate and sanitize input
      const validation = validateAuthPayload({ role, name });
      if (!validation.valid) {
        socket.emit('monitoring:error', {
          message: validation.errors.join(', '),
        });
        return;
      }

      const { sanitized } = validation;

      // Extract User ID from token if available (to link with persistent requests)
      let userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let jwtToken = token;
      let avatarUrl = null;

      if (token) {
        try {
          const { verifyToken } = require('./utils/jwt');
          const decoded = verifyToken(token);
          if (decoded && decoded.userId) {
            userId = decoded.userId;
            avatarUrl = decoded.avatar_url; // Extract avatar_url
            console.log(`[Monitoring] User authenticated with token. ID: ${userId}, Avatar: ${avatarUrl ? 'Yes' : 'No'}`);
          }
          // Fallback: If avatar missing from token (legacy token), fetch from DB
          if (decoded && decoded.userId && !avatarUrl) {
            try {
              const userService = require('./services/userService');
              const user = await userService.findUserById(decoded.userId);
              if (user) {
                avatarUrl = user.avatar_url;
                console.log(`[Monitoring] Fetched avatar from DB for user ${userId}`);
              }
            } catch (dbErr) {
              console.error('[Monitoring] Failed to fetch user avatar from DB:', dbErr);
            }
          }
        } catch (err) {
          console.log('[Monitoring] Invalid token provided in auth, using temporary ID');
          // Generate new token if invalid
          jwtToken = generateToken({
            userId,
            role: sanitized.role,
            name: sanitized.name,
          });
        }
      } else {
        jwtToken = generateToken({
          userId,
          role: sanitized.role,
          name: sanitized.name,
        });
      }

      socket.data.role = sanitized.role;
      socket.data.name = sanitized.name;
      socket.data.userId = userId;
      socket.data.authenticated = true;
      socket.data.token = jwtToken;

      // Maintain userSockets map (O(1) lookup)
      if (!userSockets.has(String(userId))) {
        userSockets.set(String(userId), new Set());
      }
      userSockets.get(String(userId)).add(socket.id);

      console.log(`[Monitoring] ${sanitized.role} authenticated: ${sanitized.name} (${socket.id}). UserID: ${socket.data.userId}`);

      if (sanitized.role === 'employee') {
        // Validate connection code for employees




        // Check if this code is already used by SOMEONE ELSE


        // Check if employee already has an active session by name (reconnection scenario)
        const existingSessionId = monitoringService.getSessionByEmployeeName(sanitized.name);
        let sessionId;

        if (existingSessionId) {
          // Employee reconnected, reuse existing session
          sessionId = existingSessionId;
          // Update employee socket ID in the session
          const session = monitoringService.getSession(sessionId);
          if (session) {
            const oldSocketId = session.employeeSocketId;
            session.employeeSocketId = socket.id;
            // Connection code removed
            // session.connectionCode = sanitizedCode;
            console.log(`[Monitoring] Employee ${sanitized.name} reconnected (${oldSocketId} -> ${socket.id}), reusing session ${sessionId}`);
          }
        } else {
          // Rate limiting: 5 sessions per 15 minutes
          if (!socketRateLimiter.checkLimit(`${socket.id}_sessions`, 5, 15 * 60 * 1000)) {
            socket.emit('monitoring:error', {
              message: 'Too many session creation attempts. Please wait before creating another session.',
            });
            return;
          }

          // Create new session for employee with connection code
          sessionId = monitoringService.createSession(socket.id, sanitized.name, socket.data.userId, avatarUrl);
          console.log(`[Monitoring] Created new session ${sessionId} for employee ${sanitized.name} (ID: ${socket.data.userId}, Avatar: ${avatarUrl ? avatarUrl.substring(0, 30) + '...' : 'None'})`);
        }

        socket.data.sessionId = sessionId; // IMPORTANT: Assign session ID to socket data

        // Check for persistent approved requests to trigger "Resume Sharing" modal
        let monitoringExpected = false;
        let activeRequest = null;
        try {
          const monitoringRequestModel = require('./models/monitoringRequestModel');
          const requests = await monitoringRequestModel.getRequestsForUser(userId);
          const approved = requests.find(r => r.status === 'approved');
          if (approved) {
            monitoringExpected = true;
            activeRequest = { adminName: approved.admin_name, requestId: approved.id };
            console.log(`[Monitoring] Found approved request for ${sanitized.name}, expecting monitoring resume.`);
          }
        } catch (err) {
          console.error('[Monitoring] Error checking requests during auth:', err);
        }

        socket.emit('monitoring:session-created', {
          sessionId,
          token: jwtToken,
          monitoringExpected,
          activeRequest
        });

        // Notify all admins about the new session (so they can add it to their list)
        io.emit('monitoring:new-session', {
          sessionId,
          employeeName: sanitized.name,
          employeeId: userId,
          avatarUrl: avatarUrl,
          streamActive: false
        });
        console.log(`[Monitoring] Broadcast new-session for ${sanitized.name}`);

        // No longer auto-broadcast sessions - admins connect via request
      } else if (sanitized.role === 'admin') {
        // Admin authenticated - they will connect to sessions via request
        socket.emit('monitoring:auth-success', {
          token: jwtToken,
          message: 'Authenticated. Search for employees to connect.',
        });
      }
    });

    // Admin: Request connection to employee
    socket.on('monitoring:request-connection', ({ employeeName }) => {
      if (!socket.data.authenticated || socket.data.role !== 'admin') {
        console.warn(`[Monitoring] Unauthorized start-sharing attempt from ${socket.id}`);
        return;
      }

      if (!employeeName) {
        socket.emit('monitoring:error', { message: 'Employee name is required' });
        return;
      }

      console.log(`[Monitoring] Admin ${socket.data.name} requesting connection to: ${employeeName}`);

      // Find session by employee name
      const targetSessionId = monitoringService.getSessionByEmployeeName(employeeName);

      if (!targetSessionId) {
        socket.emit('monitoring:error', { message: 'Employee not found or offline' });
        return;
      }

      const session = monitoringService.getSession(targetSessionId);
      if (!session) {
        socket.emit('monitoring:error', { message: 'Session invalid' });
        return;
      }

      // Check if already connected and stream is active
      if (session.adminSocketIds.has(socket.id) && session.streamActive) {
        socket.emit('monitoring:error', { message: 'Already monitoring this employee' });
        return;
      }

      // Check if employee is online
      if (!session.employeeSocketId) {
        socket.emit('monitoring:error', { message: 'Employee is currently offline' });
        return;
      }

      // Send request to employee
      io.to(session.employeeSocketId).emit('monitoring:connection-request', {
        adminName: socket.data.name,
        adminSocketId: socket.id
      });

      socket.emit('monitoring:request-sent', { employeeName });
    });

    // Employee: Respond to connection request
    socket.on('monitoring:respond-connection', ({ adminSocketId, accepted }) => {
      if (!socket.data.authenticated || socket.data.role !== 'employee' || !socket.data.sessionId) {
        return;
      }

      const sessionId = socket.data.sessionId;
      const session = monitoringService.getSession(sessionId);

      if (!session) return;

      console.log(`[Monitoring] Employee ${socket.data.name} responded to ${adminSocketId}: ${accepted ? 'Accepted' : 'Denied'}`);

      if (accepted) {
        // Add admin to session
        monitoringService.addAdminToSession(sessionId, adminSocketId); // logic from connect-by-code

        // Get admin socket to notify them
        // We need to look up the admin socket instance or broadcast to room? 
        // Better to emit to specific ID.

        // Allow admin to join room
        const adminSocket = io.sockets.sockets.get(adminSocketId);
        if (adminSocket) {
          adminSocket.join(sessionId);
          adminSocket.data.sessionId = sessionId;

          // Notify admin success
          adminSocket.emit('monitoring:connect-success', {
            sessionId,
            employeeName: session.employeeName,
            employeeId: session.employeeId, // Added
            avatarUrl: session.avatarUrl,
            streamActive: session.streamActive
          });

          // Notify employee that admin joined
          socket.emit('monitoring:admin-joined', {
            adminName: adminSocket.data.name
          });
        }
      } else {
        // Notify admin of denial
        io.to(adminSocketId).emit('monitoring:request-denied', {
          employeeName: session.employeeName
        });
      }
    });

    // Admin: Connect to employee session by code (REMOVED)
    /*
    socket.on('monitoring:connect-by-code', ({ connectionCode }) => {
      // ... REMOVED ...
    });
    */


    // Employee: Start sharing
    socket.on('monitoring:start-sharing', async () => {
      console.log(`[Monitoring] ========== START SHARING EVENT ==========`);
      console.log(`[Monitoring] Received monitoring:start-sharing from socket ${socket.id}`);
      console.log(`[Monitoring] Socket data:`, {
        authenticated: socket.data.authenticated,
        role: socket.data.role,
        sessionId: socket.data.sessionId,
        name: socket.data.name
      });

      if (!socket.data.authenticated || socket.data.role !== 'employee' || !socket.data.sessionId) {
        console.log(`[Monitoring] Unauthorized: authenticated=${socket.data.authenticated}, role=${socket.data.role}, sessionId=${socket.data.sessionId}`);
        console.warn(`[Monitoring] Unauthorized start-sharing attempt from ${socket.id}`);
        return;
      }

      // Validate session
      const sessionId = socket.data.sessionId;
      if (!validateSessionId(sessionId)) {
        console.log(`[Monitoring] Invalid session ID format: ${sessionId}`);
        socket.emit('monitoring:error', { message: 'Invalid session ID' });
        return;
      }

      const session = monitoringService.getSession(sessionId);
      if (!session) {
        console.log(`[Monitoring] Session not found: ${sessionId}`);
        socket.emit('monitoring:error', { message: 'Session not found or expired' });
        return;
      }

      console.log(`[Monitoring] Session found: ${sessionId}`);
      console.log(`[Monitoring] Session details:`, {
        employeeSocketId: session.employeeSocketId,
        employeeName: session.employeeName,
        adminCount: session.adminSocketIds.size,
        adminSocketIds: Array.from(session.adminSocketIds),
        streamActive: session.streamActive
      });

      monitoringService.setStreamActive(sessionId, true);
      console.log(`[Monitoring] Stream active set to true for session ${sessionId}`);

      // Notify all admins in the session room (Room-based emission for reliability)
      console.log(`[Monitoring] Emitting stream-started to room ${sessionId}`);
      io.to(sessionId).emit('monitoring:stream-started', {
        sessionId,
        employeeName: session.employeeName,
      });

      socket.emit('monitoring:sharing-started', { sessionId });
    });

    // Employee: Stop sharing
    socket.on('monitoring:stop-sharing', (payload) => {
      const { reason } = payload || {};
      if (socket.data.role !== 'employee' || !socket.data.sessionId) {
        console.warn(`[Monitoring] Unauthorized stop-sharing attempt from ${socket.id}`);
        return;
      }

      const sessionId = socket.data.sessionId;

      monitoringService.setStreamActive(sessionId, false);

      // Notify all admins
      const session = monitoringService.getSession(sessionId);
      if (session) {
        const stopReason = reason || 'manual';

        // 1. Notify viewing admins via real-time stream stopped event (Room-based)
        console.log(`[Monitoring] Emitting stream-stopped to room ${sessionId}, reason: ${stopReason}`);
        io.to(sessionId).emit('monitoring:stream-stopped', {
          sessionId,
          reason: stopReason
        });

        // 2. Create persistent notification if it's NOT a manual disconnect
        // Manual disconnects are handled by monitoringRequestController.js
        if (stopReason !== 'manual') {
          // Identify unqiue user IDs from the session's admins
          const adminUserIds = new Set();
          session.adminSocketIds.forEach(sid => {
            const s = io.sockets.sockets.get(sid);
            if (s && s.data.userId) adminUserIds.add(String(s.data.userId));
          });

          adminUserIds.forEach(async (adminId) => {
            try {
              await Notification.createAndNotify({
                user_id: adminId,
                type: 'monitoring_disconnect',
                title: 'Monitoring Stopped',
                message: `${session.employeeName} stopped sharing (${stopReason}).`,
                data: { sessionId, reason: stopReason, employeeName: session.employeeName }
              }, io, userSockets);
            } catch (err) {
              console.error('[Monitoring] Failed to notify admin via stop-sharing:', err);
            }
          });
        }
      }

      socket.emit('monitoring:sharing-stopped', { sessionId });
    });

    // Admin: Join session
    socket.on('monitoring:join-session', ({ sessionId }) => {
      if (!socket.data.authenticated || socket.data.role !== 'admin') {
        console.warn(`[Monitoring] Unauthorized start-sharing attempt from ${socket.id}`);
        return;
      }

      // Validate session ID
      if (!validateSessionId(sessionId)) {
        socket.emit('monitoring:error', { message: 'Invalid session ID format' });
        return;
      }

      const session = monitoringService.getSession(sessionId);
      if (!session) {
        socket.emit('monitoring:error', { message: 'Session not found or expired' });
        return;
      }

      monitoringService.addAdminToSession(sessionId, socket.id, socket.data.name);
      socket.join(sessionId);

      console.log(`[Monitoring] Admin ${socket.data.name} (${socket.id}) joined session ${sessionId}`);

      // Notify employee that admin joined
      io.to(session.employeeSocketId).emit('monitoring:admin-joined', {
        adminName: socket.data.name,
      });

      // Send current stream status to admin
      socket.emit('monitoring:session-joined', {
        sessionId,
        connectionCode: session.connectionCode,
        employeeName: session.employeeName,
        avatarUrl: session.avatarUrl, // Added
        streamActive: session.streamActive,
      });
      console.log(`[Monitoring] Sent session-joined to admin ${socket.id}, streamActive: ${session.streamActive}`);
    });

    // Admin: Leave session
    socket.on('monitoring:leave-session', ({ sessionId }) => {
      if (socket.data.role !== 'admin' || !sessionId) {
        return;
      }

      const session = monitoringService.getSession(sessionId);

      if (session) {
        monitoringService.removeAdminFromSession(sessionId, socket.id);
        socket.leave(sessionId);

        // Notify employee that admin left
        io.to(session.employeeSocketId).emit('monitoring:admin-left', {
          adminName: socket.data.name,
        });
      }
    });

    // WebRTC signaling: Offer
    socket.on('monitoring:offer', ({ sessionId, offer }) => {
      if (!socket.data.authenticated) {
        console.warn(`[Monitoring] Unauthorized start-sharing attempt from ${socket.id}`);
        return;
      }

      // Rate limiting for signaling
      if (!socketRateLimiter.checkLimit(`${socket.id}_signaling`, 100, 60 * 1000)) {
        socket.emit('monitoring:error', { message: 'Too many signaling requests' });
        return;
      }

      // Validate session and SDP
      if (!validateSessionId(sessionId)) {
        socket.emit('monitoring:error', { message: 'Invalid session ID' });
        return;
      }

      if (!validateSDP(offer)) {
        socket.emit('monitoring:error', { message: 'Invalid offer format' });
        return;
      }

      const session = monitoringService.getSession(sessionId);
      if (!session) {
        socket.emit('monitoring:error', { message: 'Session not found or expired' });
        return;
      }

      // Forward offer to employee
      io.to(session.employeeSocketId).emit('monitoring:offer', {
        offer,
        fromSocketId: socket.id,
      });
    });

    // WebRTC signaling: Answer
    socket.on('monitoring:answer', ({ sessionId, answer, toSocketId }) => {
      if (!socket.data.authenticated) {
        console.warn(`[Monitoring] Unauthorized start-sharing attempt from ${socket.id}`);
        return;
      }

      // Validate SDP
      if (!validateSDP(answer)) {
        socket.emit('monitoring:error', { message: 'Invalid answer format' });
        return;
      }

      const session = monitoringService.getSession(sessionId);
      if (!session) {
        socket.emit('monitoring:error', { message: 'Session not found or expired' });
        return;
      }

      // Forward answer to admin with sessionId for filtering
      io.to(toSocketId).emit('monitoring:answer', { answer, sessionId });
    });

    // WebRTC signaling: ICE candidate
    socket.on('monitoring:ice-candidate', ({ sessionId, candidate, toSocketId }) => {
      if (!socket.data.authenticated) {
        return;
      }

      // Validate ICE candidate
      if (!validateICECandidate(candidate)) {
        return; // Silently ignore invalid candidates
      }

      const session = monitoringService.getSession(sessionId);
      if (!session) {
        return;
      }

      // If specific toSocketId is provided, route directly
      if (toSocketId) {
        io.to(toSocketId).emit('monitoring:ice-candidate', { candidate, sessionId, fromSocketId: socket.id });
      }
      // Otherwise fallback to role-based routing
      else if (socket.data.role === 'employee') {
        // Broadcast from employee to all admins in the session
        session.adminSocketIds.forEach((adminId) => {
          io.to(adminId).emit('monitoring:ice-candidate', { candidate, sessionId, fromSocketId: socket.id });
        });
      }
      else if (socket.data.role === 'admin') {
        // Direct from admin to employee
        io.to(session.employeeSocketId).emit('monitoring:ice-candidate', {
          candidate,
          sessionId,
          fromSocketId: socket.id
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);

      // Clean up userSockets map
      if (socket.data.userId) {
        const userId = String(socket.data.userId);
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
          }
        }
      }

      if (socket.data.role === 'employee' && socket.data.sessionId) {
        // Clean up employee session (marks as inactive but keeps for reconnection)
        const sessionId = socket.data.sessionId;

        console.log(`[Monitoring] DEBUG: Employee ${socket.data.name} (UID: ${socket.data.userId}) disconnected in session ${sessionId}`);
        monitoringService.cleanupEmployeeSession(socket.id);

        // Notify admins in this session that employee disconnected
        const session = monitoringService.getSession(sessionId);
        if (session) {
          console.log(`[Monitoring] DEBUG: Session ${sessionId} still active in service. Notifying room admins...`);

          // 1. Notify viewing admins via real-time stream stopped (Room-based)
          io.to(sessionId).emit('monitoring:stream-stopped', { sessionId, reason: 'offline' });
          console.log(`[Monitoring] DEBUG: monitoring:stream-stopped emitted to room ${sessionId}`);

          // 2. Identify all admins to be notified persistently (Viewers + Owner)
          const adminsToNotify = new Set();

          // Add viewing admins
          session.adminSocketIds.forEach(sid => {
            const s = io.sockets.sockets.get(sid);
            if (s && s.data.userId) adminsToNotify.add(String(s.data.userId));
          });

          // 3. Special Case: Notify the "Owner" Admin (requester) even if they aren't viewing
          (async () => {
            try {
              const monitoringRequestModel = require('./models/monitoringRequestModel');
              const Notification = require('./models/notificationModel');
              const requests = await monitoringRequestModel.getRequestsForUser(session.employeeId);
              const activeRequest = requests.find(r => r.status === 'approved');
              if (activeRequest) {
                adminsToNotify.add(String(activeRequest.admin_id));
              }

              // 4. Batch notify all relevant admins (O(1) lookups inside)
              adminsToNotify.forEach(async (adminId) => {
                await Notification.createAndNotify({
                  user_id: adminId,
                  type: 'monitoring_disconnect',
                  title: 'Monitoring Stopped',
                  message: `${session.employeeName} went offline.`,
                  data: { sessionId, reason: 'offline', employeeName: session.employeeName }
                }, io, userSockets);
              });
            } catch (err) {
              console.error('[Monitoring] Disconnect notify error:', err);
            }
          })();
        } else {
          console.log(`[Monitoring] Disconnect: Session ${sessionId} not found after cleanup`);
        }
      } else if (socket.data.role === 'admin' && socket.data.sessionId) {
        // Remove admin from session
        const sessionId = socket.data.sessionId;
        const session = monitoringService.getSession(sessionId);
        if (session) {
          monitoringService.removeAdminFromSession(sessionId, socket.id);
          io.to(session.employeeSocketId).emit('monitoring:admin-left', {
            adminName: socket.data.name,
          });
        }
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
    console.log(`Socket.IO server ready`);

    // Clean up expired monitoring sessions every 5 minutes
    setInterval(() => {
      const cleaned = monitoringService.cleanupExpiredSessions();
      if (cleaned > 0) {
        console.log(`[Monitoring] Cleaned up ${cleaned} expired session(s)`);
      }
    }, 5 * 60 * 1000);

    if (initializeEmailJS()) {
      startContractExpirationJob();
    } else {
      console.log('Contract expiration notifications disabled due to missing EmailJS configuration.');
    }

    // Start GitHub issues cache refresh job (runs every 30 minutes)
    if (dbConnected) {
      startCacheRefreshJob();
      console.log('GitHub issues cache refresh job started.');
    } else {
      console.log('Cache refresh job disabled - database not connected.');
    }

    // Start Real-time GitHub monitoring (checks every 15s)
    startRealtimeRefreshJob(io);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopCacheRefreshJob();
  stopRealtimeRefreshJob();
  await cacheService.disconnect();
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  stopCacheRefreshJob();
  stopRealtimeRefreshJob();
  await cacheService.disconnect();
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
