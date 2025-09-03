const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const k8s = require('@kubernetes/client-node');
const yaml = require('yaml');
const authMiddleware = require('../middleware/auth');
const DatabaseService = require('../services/DatabaseService');
const { metrics } = require('../middleware/prometheus');
const logger = require('../utils/logger');

const router = express.Router();
const databaseService = new DatabaseService();

// Validation schemas
const createDatabaseSchema = Joi.object({
  name: Joi.string().alphanum().min(3).max(30).required(),
  engine: Joi.string().valid('mysql', 'postgresql', 'mongodb').required(),
  version: Joi.string().required(),
  storage: Joi.number().min(1).max(100).required(), // GB
  cpu: Joi.number().min(0.1).max(4).required(), // CPU cores
  memory: Joi.number().min(128).max(8192).required(), // MB
  replicas: Joi.number().min(1).max(5).default(1),
  projectId: Joi.string().uuid().optional() // Allow optional project ID
});

// Get all databases for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const databases = await databaseService.getUserDatabases(userId);
    
    res.json({
      databases,
      total: databases.length
    });
  } catch (error) {
    logger.error('Get databases error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve databases'
    });
  }
});

// Get specific database details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const database = await databaseService.getDatabaseById(id, userId);
    
    if (!database) {
      return res.status(404).json({
        error: 'Database Not Found',
        message: 'Database does not exist or access denied'
      });
    }

    // Get real-time status from Kubernetes
    const k8sStatus = await databaseService.getK8sStatus(database.k8s_namespace, database.k8s_deployment);
    
    res.json({
      database: {
        ...database,
        k8sStatus
      }
    });
  } catch (error) {
    logger.error('Get database error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve database details'
    });
  }
});

// Create new database instance
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createDatabaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const userId = req.user.userId;
    const databaseConfig = {
      ...value,
      userId,
      id: uuidv4()
    };

    // Check user's database quota
    const userDatabases = await databaseService.getUserDatabases(userId);
    const maxDatabases = process.env.MAX_DATABASES_PER_USER || 5;
    
    if (userDatabases.length >= maxDatabases) {
      return res.status(403).json({
        error: 'Quota Exceeded',
        message: `Maximum ${maxDatabases} databases allowed per user`
      });
    }

    // Create database in Kubernetes
    const database = await databaseService.createDatabase(databaseConfig);
    
    // Update metrics
    metrics.createdDatabasesTotal.inc({ database_type: value.engine });
    metrics.databaseOperationsTotal.inc({ 
      operation_type: 'create', 
      database_type: value.engine, 
      status: 'success' 
    });
    
    logger.info(`Database created: ${database.name} for user ${userId}`);
    
    res.status(201).json({
      message: 'Database creation initiated',
      database
    });

  } catch (error) {
    // Update error metrics
    const engine = req.body.engine || 'unknown';
    metrics.databaseOperationsTotal.inc({ 
      operation_type: 'create', 
      database_type: engine, 
      status: 'error' 
    });
    
    logger.error('Create database error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create database'
    });
  }
});

// Delete database instance
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const database = await databaseService.getDatabaseById(id, userId);
    
    if (!database) {
      return res.status(404).json({
        error: 'Database Not Found',
        message: 'Database does not exist or access denied'
      });
    }

    await databaseService.deleteDatabase(id, userId);
    
    logger.info(`Database deleted: ${database.name} by user ${userId}`);
    
    res.json({
      message: 'Database deletion initiated',
      id
    });

  } catch (error) {
    logger.error('Delete database error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete database'
    });
  }
});

// Get database connection URL
router.post('/:id/connection', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const database = await databaseService.getDatabaseById(id, userId);
    
    if (!database) {
      return res.status(404).json({
        error: 'Database Not Found',
        message: 'Database does not exist or access denied'
      });
    }

    // Generate secure, time-limited connection URL
    const connectionUrl = await databaseService.generateConnectionUrl(database);
    
    res.json({
      connectionUrl,
      expiresIn: '1h',
      instructions: {
        host: connectionUrl.host,
        port: connectionUrl.port,
        database: connectionUrl.database,
        username: connectionUrl.username,
        password: connectionUrl.password
      }
    });

  } catch (error) {
    logger.error('Connection URL error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate connection URL'
    });
  }
});

// Scale database (update resources)
router.patch('/:id/scale', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const scaleSchema = Joi.object({
      cpu: Joi.number().min(0.1).max(4),
      memory: Joi.number().min(128).max(8192),
      storage: Joi.number().min(1).max(100),
      replicas: Joi.number().min(1).max(5)
    });

    const { error, value } = scaleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const database = await databaseService.getDatabaseById(id, userId);
    
    if (!database) {
      return res.status(404).json({
        error: 'Database Not Found',
        message: 'Database does not exist or access denied'
      });
    }

    const updatedDatabase = await databaseService.scaleDatabase(id, value);
    
    logger.info(`Database scaled: ${database.name} by user ${userId}`);
    
    res.json({
      message: 'Database scaling initiated',
      database: updatedDatabase
    });

  } catch (error) {
    logger.error('Scale database error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to scale database'
    });
  }
});

module.exports = router;
