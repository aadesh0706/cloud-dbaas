const express = require('express');
const AIAssistantService = require('../services/AIAssistantService');
const authenticateToken = require('../middleware/auth');
const logger = require('../utils/logger');
const DatabaseService = process.env.NODE_ENV === 'production'
  ? require('../services/DatabaseService.production')
  : require('../services/DatabaseService');

const router = express.Router();
const aiAssistant = new AIAssistantService();
const dbService = new DatabaseService();

/**
 * Chat with AI Assistant
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    const userId = req.user.userId;

    if (!message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message is required'
      });
    }

    logger.info('AI Assistant chat request', { userId, message: message.substring(0, 100) });

    const response = await aiAssistant.processRequest(message, userId, context);

    // Persist conversation to history (non-fatal)
    try {
      await dbService.pool.query(
        `INSERT INTO conversation_history (user_id, message, response, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, message, JSON.stringify(response)]
      );
    } catch (historyError) {
      logger.warn('Failed to save conversation history:', historyError.message);
    }

    res.json(response);
  } catch (error) {
    logger.error('AI Assistant chat error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process AI request'
    });
  }
});

/**
 * Get AI Assistant capabilities
 */
router.get('/capabilities', authenticateToken, async (req, res) => {
  try {
    const capabilities = {
      actions: [
        {
          name: 'create_database',
          description: 'Create a new database with intelligent configuration',
          examples: ['Create a MySQL database for my blog', 'Set up a PostgreSQL database for analytics']
        },
        {
          name: 'create_project',
          description: 'Create and organize database projects',
          examples: ['Create a new project for my e-commerce app', 'Set up a project for mobile backend']
        },
        {
          name: 'view_schema',
          description: 'Explore database schemas and table structures',
          examples: ['Show me my users table schema', 'What tables do I have in my blog database?']
        },
        {
          name: 'query_data',
          description: 'Query your databases with natural language',
          examples: ['Find all users who signed up this month', 'Show me the top 10 products by sales']
        },
        {
          name: 'get_connection',
          description: 'Generate connection strings and code examples',
          examples: ['How do I connect from Node.js?', 'Give me Python connection code']
        },
        {
          name: 'optimize_performance',
          description: 'Analyze and optimize database performance',
          examples: ['Why is my query slow?', 'Optimize my database performance']
        }
      ],
      supported_engines: ['mysql', 'postgresql', 'mongodb', 'redis'],
      code_examples: ['nodejs', 'python', 'java', 'php', 'go']
    };

    res.json(capabilities);
  } catch (error) {
    logger.error('AI capabilities error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get AI capabilities'
    });
  }
});

/**
 * Get conversation history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const result = await dbService.pool.query(
      `SELECT id, message, response, created_at
       FROM conversation_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      conversations: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('AI history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get conversation history'
    });
  }
});

/**
 * Generate database schema suggestions
 */
router.post('/suggest-schema', authenticateToken, async (req, res) => {
  try {
    const { purpose, industry, expectedLoad } = req.body;
    const userId = req.user.userId;

    logger.info('Schema suggestion request', { userId, purpose, industry });

    // AI-generated schema suggestions based on use case
    const suggestions = await aiAssistant.generateSchemaSuggestions({
      purpose,
      industry,
      expectedLoad
    });

    res.json({
      suggestions,
      message: 'Here are some schema suggestions based on your requirements'
    });
  } catch (error) {
    logger.error('Schema suggestion error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate schema suggestions'
    });
  }
});

/**
 * Auto-generate connection code
 */
router.post('/generate-code', authenticateToken, async (req, res) => {
  try {
    const { databaseId, language = 'nodejs', operation = 'connect' } = req.body;
    const userId = req.user.userId;

    if (!databaseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Database ID is required'
      });
    }

    logger.info('Code generation request', { userId, databaseId, language, operation });

    const codeExample = await aiAssistant.generateCodeExample(databaseId, userId, language, operation);

    res.json({
      code: codeExample,
      language,
      operation,
      instructions: `Here's how to ${operation} to your database using ${language}`
    });
  } catch (error) {
    logger.error('Code generation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate code example'
    });
  }
});

module.exports = router;
