const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const githubRouter = require('./routes/github');
const contractRouter = require('./routes/contracts');
const { errorHandler } = require('./middlewares/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/github', githubRouter);
app.use('/api/contracts', contractRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

