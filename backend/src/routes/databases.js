const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const k8s = require('@kubernetes/client-node');
const yaml = require('yaml');
const authMiddleware = require('../middleware/auth');

// Use production DatabaseService in production, development one locally
const DatabaseService = process.env.NODE_ENV === 'production' 
  ? require('../services/DatabaseService.production')
  : require('../services/DatabaseService');

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
    
    logger.info(`Database created: ${database.name} for user ${userId}`);
    
    res.status(201).json({
      message: 'Database creation initiated',
      database
    });

  } catch (error) {
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

// Get database schema (tables, columns, indexes)
router.get('/:id/schema', authMiddleware, async (req, res) => {
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
    
    const schema = await databaseService.getDatabaseSchema(database);
    
    res.json({
      schema
    });
  } catch (error) {
    logger.error('Get database schema error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve database schema'
    });
  }
});

// Get table details including columns and indexes
router.get('/:id/schema/tables/:tableName', authMiddleware, async (req, res) => {
  try {
    const { id, tableName } = req.params;
    const userId = req.user.userId;
    
    const database = await databaseService.getDatabaseById(id, userId);
    
    if (!database) {
      return res.status(404).json({
        error: 'Database Not Found',
        message: 'Database does not exist or access denied'
      });
    }
    
    const tableDetails = await databaseService.getTableDetails(database, tableName);
    
    res.json({
      table: tableDetails
    });
  } catch (error) {
    logger.error('Get table details error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve table details'
    });
  }
});

// Execute SQL query (read-only)
router.post('/:id/query', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { query, limit = 100 } = req.body;
    const userId = req.user.userId;
    
    // Validate query is read-only
    const readOnlyPattern = /^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN)\s+/i;
    if (!readOnlyPattern.test(query.trim())) {
      return res.status(400).json({
        error: 'Invalid Query',
        message: 'Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed'
      });
    }
    
    const database = await databaseService.getDatabaseById(id, userId);
    
    if (!database) {
      return res.status(404).json({
        error: 'Database Not Found',
        message: 'Database does not exist or access denied'
      });
    }
    
    const queryResult = await databaseService.executeReadOnlyQuery(database, query, limit);
    
    res.json({
      result: queryResult
    });
  } catch (error) {
    logger.error('Execute query error:', error);
    res.status(500).json({
      error: 'Query Error',
      message: error.message || 'Failed to execute query'
    });
  }
});

// Get collection/table data (for viewing records)
router.get('/:id/data/:collectionName', authMiddleware, async (req, res) => {
  try {
    const { id, collectionName } = req.params;
    const { limit = 10, skip = 0, filter = '{}' } = req.query;
    const userId = req.user.userId;
    
    const database = await databaseService.getDatabaseById(id, userId);
    
    if (!database) {
      return res.status(404).json({
        error: 'Database Not Found',
        message: 'Database does not exist or access denied'
      });
    }
    
    // Get collection data
    const data = await databaseService.getCollectionData(database, collectionName, {
      limit: Math.min(parseInt(limit), 100), // Max 100 records
      skip: parseInt(skip),
      filter: filter
    });
    
    res.json({
      data: data.rows,
      columns: data.columns,
      total: data.rowCount,
      collection: collectionName
    });
  } catch (error) {
    logger.error('Get collection data error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve collection data'
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
