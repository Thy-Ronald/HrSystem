// Load environment variables FIRST — before any other require() that reads process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
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
  // ── Performance tuning ──────────────────────────────────────────────────
  // Disable per-message WebSocket deflate: WebRTC signaling payloads (SDP/ICE)
  // are already structured data and screen-share video is binary. Compressing them
  // at the WS layer burns CPU without saving meaningful bandwidth.
  perMessageDeflate: false,
  // Raise the HTTP payload cap to 5 MB so large SDP offers (many ICE candidates)
  // never trigger a "packet too large" error at the Socket.IO layer.
  maxHttpBufferSize: 5e6,
  // Ping / pong: detect dead connections faster without being too aggressive.
  pingInterval: 20000, // default 25 000 ms
  pingTimeout:  15000, // default 20 000 ms
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
  // ── 1. Connect the shared Redis client FIRST ─────────────────────────────
  //    redis.js no longer auto-connects at require() time.  Doing it here
  //    ensures Cloud Run networking is ready before the TLS handshake.
  const sharedRedis = require('./config/redis');
  await sharedRedis.connect();   // waits up to 20 s, never throws

  // ── 2. Initialize Redis cache service (reuses the shared client) ────────
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

  // ── Socket.IO Redis adapter (enables cross-instance pub/sub on Cloud Run) ──
  if (process.env.REDIS_URL) {
    try {
      // Use the same socket config as the main client so Upstash idle-timeout
      // reconnects work (without reconnectStrategy the clients die permanently).
      const adapterSocketConfig = {
        reconnectStrategy: (retries) => Math.min(retries * 500, 10000), // always retry
        keepAlive: 10000,      // TCP-level keepalive
        connectTimeout: 30000, // generous time for Upstash TLS on cold start
      };
      const pubClient = createClient({ url: process.env.REDIS_URL, socket: adapterSocketConfig });
      const subClient = pubClient.duplicate();

      // Must attach 'error' handlers BEFORE calling connect().
      // Throttle: log first error, then every 10th per client.
      let pubErrs = 0, subErrs = 0;
      pubClient.on('error', (err) => {
        pubErrs++;
        if (pubErrs === 1) console.error('[Redis Adapter] pub error:', err.message);
        else if (pubErrs % 10 === 0) console.warn(`[Redis Adapter] pub still failing (${pubErrs}): ${err.message}`);
      });
      subClient.on('error', (err) => {
        subErrs++;
        if (subErrs === 1) console.error('[Redis Adapter] sub error:', err.message);
        else if (subErrs % 10 === 0) console.warn(`[Redis Adapter] sub still failing (${subErrs}): ${err.message}`);
      });
      pubClient.on('ready', () => { pubErrs = 0; });
      subClient.on('ready', () => { subErrs = 0; });

      // Application-level heartbeat — keeps pub connection alive across Upstash's
      // ~30 s server-side idle timeout (TCP keepAlive alone is not enough).
      let adapterPingInterval = null;
      pubClient.on('ready', () => {
        if (!adapterPingInterval) {
          adapterPingInterval = setInterval(() => {
            pubClient.ping().catch(() => {});
          }, 25000);
        }
      });
      pubClient.on('end', () => {
        if (adapterPingInterval) { clearInterval(adapterPingInterval); adapterPingInterval = null; }
      });

      // Give adapter clients 20 s to connect.  If they don't make it the
      // server starts without the adapter (single-instance only) and the
      // clients keep retrying in the background.
      await Promise.race([
        Promise.all([pubClient.connect(), subClient.connect()]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Adapter connect timed out after 20 s')), 20000)
        ),
      ]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter configured (cross-instance support enabled)');
    } catch (adapterErr) {
      console.warn('⚠️ Socket.IO Redis adapter failed, falling back to in-memory:', adapterErr.message);
    }
  } else {
    console.warn('⚠️ REDIS_URL not set — Socket.IO running without Redis adapter (single-instance only)');
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
