const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
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
const { testConnection } = require('./config/database');
const cacheService = require('./services/cacheService');

// Background jobs
const { startContractExpirationJob } = require('./jobs/contractExpirationJob');
const { startCacheRefreshJob, stopCacheRefreshJob } = require('./jobs/cacheRefreshJob');
const { startRealtimeRefreshJob, stopRealtimeRefreshJob } = require('./jobs/realtimeRefreshJob');

// Socket handler
const setupMonitoringSocket = require('./sockets/monitoringSocket');

// Services with side-effects
const { initializeEmailJS } = require('./services/emailService');
const monitoringService = require('./services/monitoringService');

dotenv.config();

// ─── Fast lookup for user sockets: Map<userId, Set<socketId>> ────────────────
const userSockets = new Map();

// ─── App & server setup ──────────────────────────────────────────────────────
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

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(compression());
app.use(cors());
app.use(express.json());
app.use('/api', generalApiLimiter);

// ─── HTTP routes ──────────────────────────────────────────────────────────────
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
app.use('/api/auth', authRouter);
app.use('/api/monitoring/requests', require('./routes/monitoringRequestRoutes'));
app.use('/api/monitoring', monitoringRouter);
app.use('/api/personnel', personnelRouter);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));

// Expose io to controllers
app.set('io', io);

app.use(errorHandler);

// ─── Socket.IO setup ──────────────────────────────────────────────────────────
setupMonitoringSocket(io, userSockets);

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

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('⚠ Warning: Database connection failed. The application may not work correctly.');
    console.warn('⚠ Please ensure MySQL is running and database credentials are correct.');
    console.warn('⚠ Run: npm run migrate (or node src/database/migrate.js) to set up the database schema.');
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

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  stopCacheRefreshJob();
  stopRealtimeRefreshJob();
  await cacheService.disconnect();
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
