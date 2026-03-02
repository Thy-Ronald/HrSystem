// Load environment variables FIRST — before any other require() that reads process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');

// Route imports
const githubRouter = require('./routes/github');
const contractRouter = require('./routes/contracts');
const issuesRouter = require('./routes/issues');
const monitoringRouter = require('./routes/monitoring');
const notificationRoutes = require('./routes/notificationRoutes');
const authRouter = require('./routes/auth');
const personnelRouter = require('./routes/personnelRoutes');
// Middleware imports
const { errorHandler } = require('./middlewares/errorHandler');
const { generalApiLimiter } = require('./middlewares/rateLimiter');

// Service / utility imports
const cacheService = require('./services/cacheService');

// Background jobs
const { startContractExpirationJob } = require('./jobs/contractExpirationJob');
const { startRealtimeRefreshJob, stopRealtimeRefreshJob } = require('./jobs/realtimeRefreshJob');

// Socket handlers
const setupMonitoringSocket = require('./sockets/monitoringSocket');
const employeeTrackingSocket = require('./sockets/employeeTrackingSocket');
// Services with side-effects
const { initializeEmailJS } = require('./services/emailService');
const monitoringService = require('./services/monitoringService');

// ─── Fast lookup for user sockets: Map<userId, Set<socketId>> ────────────────
const userSockets = new Map();

// ─── App & server setup ──────────────────────────────────────────────────────
const app = express();
app.set('userSockets', userSockets);
// Trust the first proxy hop (Cloud Run / load balancer) so that
// express-rate-limit correctly reads X-Forwarded-For for client IPs.
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
const PORT = process.env.PORT || 4000;

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(compression());
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use('/api', generalApiLimiter);

// ─── HTTP routes ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    database:  'firestore',
  });
});

app.use('/api/github', githubRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/auth', authRouter);
app.use('/api/monitoring/requests', require('./routes/monitoringRequestRoutes'));
app.use('/api/monitoring', monitoringRouter);
app.use('/api/personnel', personnelRouter);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/employee-tracking', require('./routes/employeeTrackingRoutes'));

// Expose io to controllers
app.set('io', io);

app.use(errorHandler);

// ─── Socket.IO setup ──────────────────────────────────────────────────────────
setupMonitoringSocket(io, userSockets);
employeeTrackingSocket.start(io);

// ─── Server startup ───────────────────────────────────────────────────────────
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

    // Start Real-time GitHub monitoring (checks every 5 min)
    startRealtimeRefreshJob(io);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  stopRealtimeRefreshJob();
  employeeTrackingSocket.stop();
  await cacheService.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
