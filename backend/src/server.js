require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const databaseRoutes = require('./routes/databases');
const monitoringRoutes = require('./routes/monitoring');
const projectRoutes = require('./routes/projects');
const performanceRoutes = require('./routes/performance');
const aiAssistantRoutes = require('./routes/ai-assistant');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const CleanupService = require('./services/CleanupService');
const initDatabase = require('./utils/initDatabase');

const app = express();

const PORT = process.env.PORT || 5000;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Much higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'development' // Skip rate limiting in development
});

// Apply rate limiter only in production
if (process.env.NODE_ENV !== 'development') {
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Environment variables test endpoint
app.get('/env-test', (req, res) => {
  res.json({
    status: 'success',
    environment: process.env.NODE_ENV,
    dbConfig: {
      host: process.env.DB_HOST ? 'SET' : 'NOT_SET',
      port: process.env.DB_PORT ? 'SET' : 'NOT_SET',
      database: process.env.DB_NAME ? 'SET' : 'NOT_SET',
      user: process.env.DB_USER ? 'SET' : 'NOT_SET',
      password: process.env.DB_PASSWORD ? 'SET' : 'NOT_SET',
      jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
      corsOrigin: process.env.CORS_ORIGIN || 'NOT_SET'
    }
  });
});

// Database connectivity test endpoint
app.get('/db-test', async (req, res) => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const result = await pool.query('SELECT NOW() as current_time');
    await pool.end();
    res.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: result.rows[0].current_time,
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
      }
    });
  } catch (error) {
    await pool.end();
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
      }
    });
  }
});

// Simple metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  const metrics = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total 100

# HELP backend_uptime_seconds Backend uptime in seconds
# TYPE backend_uptime_seconds gauge
backend_uptime_seconds ${process.uptime()}

# HELP active_connections Current active connections
# TYPE active_connections gauge
active_connections 25

# HELP database_operations_total Total database operations
# TYPE database_operations_total counter
database_operations_total{operation="create",status="success"} 10
database_operations_total{operation="create",status="error"} 2
database_operations_total{operation="delete",status="success"} 5
`;
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found on this server.'
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, async () => {
  logger.info(`🚀 DBaaS Backend Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize database tables
  await initDatabase();
  
  // Initialize cleanup service
  const cleanupService = new CleanupService();
  cleanupService.startScheduler();
  logger.info('✅ Email verification and cleanup services initialized');
});

module.exports = app;
