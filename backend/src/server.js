const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const githubRouter = require('./routes/github');
const contractRouter = require('./routes/contracts');
const { errorHandler } = require('./middlewares/errorHandler');
const { initializeEmailJS } = require('./services/emailService');
const { startContractExpirationJob } = require('./jobs/contractExpirationJob');
const { testConnection } = require('./config/database');

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

app.use(errorHandler);

// Initialize database connection and start server
async function startServer() {
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
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const { closePool } = require('./config/database');
  await closePool();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
