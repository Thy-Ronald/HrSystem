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
const { errorHandler } = require('./middlewares/errorHandler');
const { initializeEmailJS } = require('./services/emailService');
const { startContractExpirationJob } = require('./jobs/contractExpirationJob');
const { startCacheRefreshJob, stopCacheRefreshJob } = require('./jobs/cacheRefreshJob');
const { testConnection } = require('./config/database');
const cacheService = require('./services/cacheService');
const monitoringService = require('./services/monitoringService');

dotenv.config();

const app = express();
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
app.use('/api/monitoring', monitoringRouter);

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

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Handle user authentication (simple dev auth)
    socket.on('monitoring:auth', ({ role, name }) => {
      socket.data.role = role;
      socket.data.name = name;
      socket.data.authenticated = true;
      console.log(`[Monitoring] ${role} authenticated: ${name} (${socket.id})`);

      if (role === 'employee') {
        // Create session for employee
        const sessionId = monitoringService.createSession(socket.id, name);
        socket.data.sessionId = sessionId;
        socket.emit('monitoring:session-created', { sessionId });
        socket.broadcast.emit('monitoring:session-available', {
          sessionId,
          employeeName: name,
        });
      } else if (role === 'admin') {
        // Send list of available sessions
        const sessions = monitoringService.getAllSessions();
        socket.emit('monitoring:sessions-list', { sessions });
      }
    });

    // Employee: Start sharing
    socket.on('monitoring:start-sharing', async () => {
      if (socket.data.role !== 'employee' || !socket.data.sessionId) {
        socket.emit('monitoring:error', { message: 'Unauthorized' });
        return;
      }

      const sessionId = socket.data.sessionId;
      monitoringService.setStreamActive(sessionId, true);
      
      // Notify all admins
      const session = monitoringService.getSession(sessionId);
      if (session) {
        session.adminSocketIds.forEach((adminId) => {
          io.to(adminId).emit('monitoring:stream-started', {
            sessionId,
            employeeName: session.employeeName,
          });
        });
      }

      socket.emit('monitoring:sharing-started', { sessionId });
    });

    // Employee: Stop sharing
    socket.on('monitoring:stop-sharing', () => {
      if (socket.data.role !== 'employee' || !socket.data.sessionId) {
        socket.emit('monitoring:error', { message: 'Unauthorized' });
        return;
      }

      const sessionId = socket.data.sessionId;
      monitoringService.setStreamActive(sessionId, false);

      // Notify all admins
      const session = monitoringService.getSession(sessionId);
      if (session) {
        session.adminSocketIds.forEach((adminId) => {
          io.to(adminId).emit('monitoring:stream-stopped', { sessionId });
        });
      }

      socket.emit('monitoring:sharing-stopped', { sessionId });
    });

    // Admin: Join session
    socket.on('monitoring:join-session', ({ sessionId }) => {
      if (socket.data.role !== 'admin') {
        socket.emit('monitoring:error', { message: 'Unauthorized' });
        return;
      }

      const session = monitoringService.getSession(sessionId);
      if (!session) {
        socket.emit('monitoring:error', { message: 'Session not found' });
        return;
      }

      monitoringService.addAdminToSession(sessionId, socket.id, socket.data.name);
      socket.data.sessionId = sessionId;
      socket.join(sessionId);

      // Notify employee that admin joined
      io.to(session.employeeSocketId).emit('monitoring:admin-joined', {
        adminName: socket.data.name,
      });

      // Send current stream status to admin
      socket.emit('monitoring:session-joined', {
        sessionId,
        employeeName: session.employeeName,
        streamActive: session.streamActive,
      });
    });

    // Admin: Leave session
    socket.on('monitoring:leave-session', () => {
      if (socket.data.role !== 'admin' || !socket.data.sessionId) {
        return;
      }

      const sessionId = socket.data.sessionId;
      const session = monitoringService.getSession(sessionId);
      
      if (session) {
        monitoringService.removeAdminFromSession(sessionId, socket.id);
        socket.leave(sessionId);
        
        // Notify employee that admin left
        io.to(session.employeeSocketId).emit('monitoring:admin-left', {
          adminName: socket.data.name,
        });
      }

      socket.data.sessionId = null;
    });

    // WebRTC signaling: Offer
    socket.on('monitoring:offer', ({ sessionId, offer }) => {
      const session = monitoringService.getSession(sessionId);
      if (!session) {
        socket.emit('monitoring:error', { message: 'Session not found' });
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
      const session = monitoringService.getSession(sessionId);
      if (!session) {
        socket.emit('monitoring:error', { message: 'Session not found' });
        return;
      }

      // Forward answer to admin
      io.to(toSocketId).emit('monitoring:answer', { answer });
    });

    // WebRTC signaling: ICE candidate
    socket.on('monitoring:ice-candidate', ({ sessionId, candidate, toSocketId }) => {
      const session = monitoringService.getSession(sessionId);
      if (!session) {
        return;
      }

      // If employee sends ICE candidate, forward to all admins in the session
      if (socket.data.role === 'employee') {
        session.adminSocketIds.forEach((adminId) => {
          io.to(adminId).emit('monitoring:ice-candidate', { candidate });
        });
      }
      // If admin sends ICE candidate, forward to employee
      else if (socket.data.role === 'admin') {
        io.to(session.employeeSocketId).emit('monitoring:ice-candidate', { candidate });
      }
      // Fallback: if toSocketId is provided, forward to that socket
      else if (toSocketId) {
        io.to(toSocketId).emit('monitoring:ice-candidate', { candidate });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);

      if (socket.data.role === 'employee' && socket.data.sessionId) {
        // Clean up employee session
        monitoringService.cleanupEmployeeSession(socket.id);
        io.emit('monitoring:session-ended', { sessionId: socket.data.sessionId });
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
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopCacheRefreshJob();
  await cacheService.disconnect();
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  stopCacheRefreshJob();
  await cacheService.disconnect();
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
