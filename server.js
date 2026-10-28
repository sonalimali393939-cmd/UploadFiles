const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

// Load environment variables while preserving test environment
const initialEnv = process.env.NODE_ENV;
dotenv.config();
if (isTestEnv) {
  process.env.NODE_ENV = initialEnv || 'test';
}

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import route handlers
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root / Welcome Route — Returns JSON API catalog
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    project: "Akatsuki's Draft API",
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      auth: '/api/auth',
      posts: '/api/posts',
      admin: '/api/admin/posts',
      ai: '/api/ai',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin/posts', adminRoutes);
app.use('/api/ai', aiRoutes);

// 404 Not Found Catch-All
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;

/**
 * Start Express server after establishing MongoDB connection
 */
const startServer = async () => {
  try {
    console.log('🔄 Initializing database connection...');
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`🚀 Akatsuki's Draft server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 Base API URL: http://localhost:${PORT}`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error(`🛑 Server startup aborted: Database connection could not be established.`);
    console.error(`👉 Action Required: ${error.message}\n`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

// Start server if not in test environment
if (!isTestEnv) {
  startServer();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
    });
  }
  const mongoose = require('mongoose');
  await mongoose.connection.close();
  console.log('MongoDB connection closed. Process exiting.');
  process.exit(0);
});

module.exports = app;
