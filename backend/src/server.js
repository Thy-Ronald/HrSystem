const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const githubRouter = require('./routes/github');
const contractRouter = require('./routes/contracts');
const issuesRouter = require('./routes/issues');
const { errorHandler } = require('./middlewares/errorHandler');
const { initializeEmailJS } = require('./services/emailService');
const { startContractExpirationJob } = require('./jobs/contractExpirationJob');
const { startCacheRefreshJob, stopCacheRefreshJob } = require('./jobs/cacheRefreshJob');
const { testConnection } = require('./config/database');
const cacheService = require('./services/cacheService');

dotenv.config();

const app = express();
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

  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
    
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
