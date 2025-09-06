// const { Configuration, OpenAIApi } = require('openai');
const DatabaseService = require('./DatabaseService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AIAssistantService {
  constructor() {
    this.databaseService = new DatabaseService();
    // For demo purposes, we'll use a mock AI instead of OpenAI
    // this.openai = new OpenAIApi(new Configuration({
    //   apiKey: process.env.OPENAI_API_KEY,
    // }));
  }

  /**
   * Process natural language request and determine action
   */
  async processRequest(userMessage, userId, context = {}) {
    try {
      logger.info(`AI Assistant processing request: ${userMessage}`, { userId });

      // Analyze intent using AI
      const intent = await this.analyzeIntent(userMessage);
      
      switch (intent.action) {
        case 'create_database':
          return await this.createDatabaseFromRequest(intent, userId);
        case 'create_project':
          return await this.createProjectFromRequest(intent, userId);
        case 'view_schema':
          return await this.viewDatabaseSchema(intent, userId);
        case 'query_data':
          return await this.queryDatabaseData(intent, userId);
        case 'get_connection':
          return await this.getDatabaseConnection(intent, userId);
        case 'optimize_performance':
          return await this.optimizeDatabase(intent, userId);
        default:
          return await this.generateHelpResponse(userMessage);
      }
    } catch (error) {
      logger.error('AI Assistant error:', error);
      return {
        success: false,
        message: 'I encountered an error processing your request. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Analyze user intent using mock AI (replace with real AI service)
   */
  async analyzeIntent(userMessage) {
    // Mock AI analysis - in production, use OpenAI or similar
    const message = userMessage.toLowerCase();
    
    if (message.includes('create') && (message.includes('database') || message.includes('db'))) {
      let engine = 'mysql'; // default
      if (message.includes('postgres') || message.includes('postgresql')) engine = 'postgresql';
      if (message.includes('mongo') || message.includes('mongodb')) engine = 'mongodb';
      if (message.includes('redis')) engine = 'redis';
      
      let purpose = 'general';
      if (message.includes('blog')) purpose = 'blog';
      if (message.includes('ecommerce') || message.includes('store') || message.includes('shop')) purpose = 'ecommerce';
      if (message.includes('analytics')) purpose = 'analytics';
      
      return {
        action: 'create_database',
        parameters: { engine, purpose },
        confidence: 0.9
      };
    }
    
    if (message.includes('show') || message.includes('view') || message.includes('schema')) {
      return {
        action: 'view_schema',
        parameters: { table: this.extractTableName(message) },
        confidence: 0.8
      };
    }
    
    if (message.includes('connect') || message.includes('connection')) {
      let language = 'nodejs'; // default
      if (message.includes('python')) language = 'python';
      if (message.includes('java')) language = 'java';
      if (message.includes('php')) language = 'php';
      
      return {
        action: 'get_connection',
        parameters: { language },
        confidence: 0.8
      };
    }
    
    return {
      action: 'help',
      parameters: {},
      confidence: 0.5
    };
  }
  
  extractTableName(message) {
    const words = message.split(' ');
    const tableKeywords = ['users', 'user', 'posts', 'post', 'products', 'product', 'orders', 'order'];
    return tableKeywords.find(keyword => message.includes(keyword)) || null;
  }

  /**
   * Create database based on AI analysis
   */
  async createDatabaseFromRequest(intent, userId) {
    try {
      const { parameters } = intent;
      
      // Generate intelligent database configuration
      const dbConfig = await this.generateDatabaseConfig(parameters);
      
      // Get user's first project or create a default one
      const projects = await this.databaseService.pool.query(
        'SELECT id FROM projects WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      
      let projectId;
      if (projects.rows.length > 0) {
        projectId = projects.rows[0].id;
      } else {
        // Create a default project for the user
        const projectResult = await this.databaseService.pool.query(
          `INSERT INTO projects (id, name, description, user_id, created_at) 
           VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
          [uuidv4(), 'AI Generated Project', 'Project created by AI Assistant', userId]
        );
        projectId = projectResult.rows[0].id;
      }
      
      // Create the database with all required fields
      const databaseConfig = {
        id: uuidv4(),
        name: dbConfig.name,
        engine: dbConfig.engine,
        version: dbConfig.version,
        storage: dbConfig.storage_gb,    // Map storage_gb to storage
        cpu: dbConfig.cpu_cores,         // Map cpu_cores to cpu  
        memory: dbConfig.memory_mb,      // Map memory_mb to memory
        replicas: dbConfig.replicas || 1,
        userId: userId,
        projectId: projectId
      };
      
      const database = await this.databaseService.createDatabase(databaseConfig);

      // Generate connection details  
      const connectionInfo = await this.databaseService.generateConnectionUrl(database);

      return {
        success: true,
        message: `✅ Successfully created ${dbConfig.engine} database "${dbConfig.name}"`,
        database: database,
        connectionInfo: connectionInfo,
        nextSteps: this.generateNextSteps(dbConfig.engine, dbConfig.purpose),
        codeExamples: this.generateCodeExamples(connectionInfo, dbConfig.engine)
      };
    } catch (error) {
      logger.error('Database creation error:', error);
      throw error;
    }
  }

  /**
   * Generate optimal database configuration based on use case
   */
  async generateDatabaseConfig(parameters) {
    const { engine, purpose, expectedLoad = 'medium' } = parameters;
    
    // AI-driven configuration based on use case
    const configs = {
      mysql: {
        engine: 'mysql',
        version: '8.0',
        cpu_cores: expectedLoad === 'high' ? 4 : expectedLoad === 'medium' ? 2 : 1,
        memory_mb: expectedLoad === 'high' ? 4096 : expectedLoad === 'medium' ? 2048 : 1024,
        storage_gb: purpose === 'analytics' ? 100 : purpose === 'ecommerce' ? 50 : 20,
        replicas: 1
      },
      postgresql: {
        engine: 'postgresql',
        version: '15',
        cpu_cores: expectedLoad === 'high' ? 4 : expectedLoad === 'medium' ? 2 : 1,
        memory_mb: expectedLoad === 'high' ? 4096 : expectedLoad === 'medium' ? 2048 : 1024,
        storage_gb: purpose === 'analytics' ? 100 : purpose === 'ecommerce' ? 50 : 20,
        replicas: 1
      },
      mongodb: {
        engine: 'mongodb',
        version: '6.0',
        cpu_cores: expectedLoad === 'high' ? 4 : expectedLoad === 'medium' ? 2 : 1,
        memory_mb: expectedLoad === 'high' ? 4096 : expectedLoad === 'medium' ? 2048 : 1024,
        storage_gb: purpose === 'analytics' ? 100 : purpose === 'content' ? 50 : 20,
        replicas: 1
      }
    };

    const baseConfig = configs[engine] || configs.mysql;
    
    // Generate intelligent name
    const purposeMap = {
      'blog': 'blog_db',
      'ecommerce': 'store_db',
      'analytics': 'analytics_db',
      'content': 'content_db',
      'user_management': 'users_db'
    };
    
    return {
      ...baseConfig,
      name: purposeMap[purpose] || `${engine}_db_${Date.now()}`,
      purpose: purpose
    };
  }

  /**
   * View database schema with AI-enhanced description
   */
  async viewDatabaseSchema(intent, userId) {
    try {
      const { parameters } = intent;
      
      // Get user's databases
      const databases = await this.databaseService.getDatabases(userId);
      
      // Find relevant database
      const database = this.findRelevantDatabase(databases, parameters);
      
      if (!database) {
        return {
          success: false,
          message: "I couldn't find the database you're referring to. Here are your available databases:",
          databases: databases.map(db => ({ name: db.name, engine: db.engine, id: db.id }))
        };
      }

      // Get schema
      const schema = await this.databaseService.getDatabaseSchema(database);
      
      // Add AI-enhanced descriptions
      const enhancedSchema = await this.enhanceSchemaWithAI(schema, database.engine);

      return {
        success: true,
        database: database,
        schema: enhancedSchema,
        message: `📊 Here's the schema for your ${database.engine} database "${database.name}"`
      };
    } catch (error) {
      logger.error('Schema view error:', error);
      throw error;
    }
  }

  /**
   * Generate connection examples and next steps
   */
  generateCodeExamples(connectionInfo, engine) {
    const examples = {
      mysql: {
        nodejs: `const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({
  host: '${connectionInfo.host}',
  user: '${connectionInfo.username}',
  password: '${connectionInfo.password}',
  database: '${connectionInfo.database}'
});

// Example query
const [rows] = await connection.execute('SELECT * FROM users LIMIT 10');
console.log(rows);`,
        
        python: `import mysql.connector

connection = mysql.connector.connect(
    host='${connectionInfo.host}',
    user='${connectionInfo.username}',
    password='${connectionInfo.password}',
    database='${connectionInfo.database}'
)

cursor = connection.cursor()
cursor.execute("SELECT * FROM users LIMIT 10")
results = cursor.fetchall()
print(results)`
      },
      postgresql: {
        nodejs: `const { Client } = require('pg');

const client = new Client({
  host: '${connectionInfo.host}',
  user: '${connectionInfo.username}',
  password: '${connectionInfo.password}',
  database: '${connectionInfo.database}',
  port: 5432
});

await client.connect();
const result = await client.query('SELECT * FROM users LIMIT 10');
console.log(result.rows);`,
        
        python: `import psycopg2

connection = psycopg2.connect(
    host='${connectionInfo.host}',
    user='${connectionInfo.username}',
    password='${connectionInfo.password}',
    database='${connectionInfo.database}'
)

cursor = connection.cursor()
cursor.execute("SELECT * FROM users LIMIT 10")
results = cursor.fetchall()
print(results)`
      }
    };

    return examples[engine] || examples.mysql;
  }

  /**
   * Generate next steps recommendations
   */
  generateNextSteps(engine, purpose) {
    const steps = {
      mysql: [
        "🔧 Connect to your database using the provided credentials",
        "📋 Create your first table with the schema designer",
        "📊 Import sample data or start inserting records",
        "⚡ Monitor performance in the dashboard"
      ],
      postgresql: [
        "🔧 Connect using psql or your preferred client",
        "🏗️ Design your database schema",
        "📊 Load your data using COPY or INSERT statements",
        "📈 Set up monitoring and alerts"
      ],
      mongodb: [
        "🔧 Connect using MongoDB Compass or mongo shell",
        "📄 Create your first collection",
        "📊 Insert your first documents",
        "🔍 Set up indexes for better performance"
      ]
    };

    return steps[engine] || steps.mysql;
  }

  /**
   * Find relevant database based on user query
   */
  findRelevantDatabase(databases, parameters) {
    // Simple matching logic - can be enhanced with AI
    const { table, database_name } = parameters;
    
    if (database_name) {
      return databases.find(db => 
        db.name.toLowerCase().includes(database_name.toLowerCase())
      );
    }
    
    // Return first database if no specific match
    return databases[0];
  }

  /**
   * Enhance schema with AI descriptions
   */
  async enhanceSchemaWithAI(schema, engine) {
    // Add intelligent descriptions to tables and columns
    // This would use AI to analyze table/column names and provide insights
    return {
      ...schema,
      ai_insights: "This schema appears to be for a typical web application with user management."
    };
  }

  /**
   * Generate schema suggestions based on use case
   */
  async generateSchemaSuggestions({ purpose, industry, expectedLoad }) {
    const schemaSuggestions = {
      blog: {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INT PRIMARY KEY AUTO_INCREMENT' },
              { name: 'username', type: 'VARCHAR(255) UNIQUE' },
              { name: 'email', type: 'VARCHAR(255) UNIQUE' },
              { name: 'password_hash', type: 'VARCHAR(255)' },
              { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ]
          },
          {
            name: 'posts',
            columns: [
              { name: 'id', type: 'INT PRIMARY KEY AUTO_INCREMENT' },
              { name: 'title', type: 'VARCHAR(255)' },
              { name: 'content', type: 'TEXT' },
              { name: 'author_id', type: 'INT REFERENCES users(id)' },
              { name: 'published_at', type: 'TIMESTAMP' },
              { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ]
          }
        ]
      },
      ecommerce: {
        tables: [
          {
            name: 'customers',
            columns: [
              { name: 'id', type: 'INT PRIMARY KEY AUTO_INCREMENT' },
              { name: 'email', type: 'VARCHAR(255) UNIQUE' },
              { name: 'first_name', type: 'VARCHAR(100)' },
              { name: 'last_name', type: 'VARCHAR(100)' },
              { name: 'phone', type: 'VARCHAR(20)' },
              { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ]
          },
          {
            name: 'products',
            columns: [
              { name: 'id', type: 'INT PRIMARY KEY AUTO_INCREMENT' },
              { name: 'name', type: 'VARCHAR(255)' },
              { name: 'description', type: 'TEXT' },
              { name: 'price', type: 'DECIMAL(10,2)' },
              { name: 'stock_quantity', type: 'INT' },
              { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ]
          },
          {
            name: 'orders',
            columns: [
              { name: 'id', type: 'INT PRIMARY KEY AUTO_INCREMENT' },
              { name: 'customer_id', type: 'INT REFERENCES customers(id)' },
              { name: 'total_amount', type: 'DECIMAL(10,2)' },
              { name: 'status', type: 'VARCHAR(50)' },
              { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
            ]
          }
        ]
      }
    };

    return schemaSuggestions[purpose] || schemaSuggestions.blog;
  }

  /**
   * Generate code example for database operations
   */
  async generateCodeExample(databaseId, userId, language, operation) {
    try {
      const database = await this.databaseService.getDatabaseById(databaseId, userId);
      if (!database) {
        throw new Error('Database not found');
      }

      const connectionInfo = await this.databaseService.getConnectionString(databaseId, userId);
      
      const examples = {
        nodejs: {
          connect: this.generateNodeJSConnection(database, connectionInfo),
          query: this.generateNodeJSQuery(database, connectionInfo),
          insert: this.generateNodeJSInsert(database, connectionInfo)
        },
        python: {
          connect: this.generatePythonConnection(database, connectionInfo),
          query: this.generatePythonQuery(database, connectionInfo),
          insert: this.generatePythonInsert(database, connectionInfo)
        }
      };

      return examples[language]?.[operation] || examples.nodejs.connect;
    } catch (error) {
      logger.error('Code generation error:', error);
      throw error;
    }
  }

  generateNodeJSConnection(database, connectionInfo) {
    if (database.engine === 'mysql') {
      return `const mysql = require('mysql2/promise');

const connection = await mysql.createConnection({
  host: '${connectionInfo.host}',
  user: '${connectionInfo.username}',
  password: '${connectionInfo.password}',
  database: '${connectionInfo.database}'
});

console.log('Connected to MySQL database!');`;
    }
    
    if (database.engine === 'postgresql') {
      return `const { Client } = require('pg');

const client = new Client({
  host: '${connectionInfo.host}',
  user: '${connectionInfo.username}',
  password: '${connectionInfo.password}',
  database: '${connectionInfo.database}',
  port: 5432
});

await client.connect();
console.log('Connected to PostgreSQL database!');`;
    }

    if (database.engine === 'mongodb') {
      return `const { MongoClient } = require('mongodb');

const client = new MongoClient('${connectionInfo.connectionString}');
await client.connect();

const database = client.db('${connectionInfo.database}');
console.log('Connected to MongoDB database!');`;
    }
  }

  generateNodeJSQuery(database, connectionInfo) {
    if (database.engine === 'mysql' || database.engine === 'postgresql') {
      return `// Query example
const [rows] = await connection.execute('SELECT * FROM users LIMIT 10');
console.log('Query results:', rows);`;
    }
    
    if (database.engine === 'mongodb') {
      return `// Query example
const collection = database.collection('users');
const users = await collection.find({}).limit(10).toArray();
console.log('Query results:', users);`;
    }
  }

  generateNodeJSInsert(database, connectionInfo) {
    if (database.engine === 'mysql' || database.engine === 'postgresql') {
      return `// Insert example
const result = await connection.execute(
  'INSERT INTO users (username, email) VALUES (?, ?)',
  ['john_doe', 'john@example.com']
);
console.log('Insert result:', result);`;
    }
    
    if (database.engine === 'mongodb') {
      return `// Insert example
const collection = database.collection('users');
const result = await collection.insertOne({
  username: 'john_doe',
  email: 'john@example.com',
  createdAt: new Date()
});
console.log('Insert result:', result);`;
    }
  }

  /**
   * Generate helpful response for unclear requests
   */
  async generateHelpResponse(userMessage) {
    return {
      success: true,
      message: "I can help you with:",
      capabilities: [
        "🗄️ Create databases (MySQL, PostgreSQL, MongoDB)",
        "📋 View database schemas and table structures", 
        "🔍 Query your data with natural language",
        "🔗 Generate connection strings and code examples",
        "⚡ Optimize database performance",
        "📊 Create and manage projects"
      ],
      examples: [
        "Create a MySQL database for my blog",
        "Show me the schema of my users table",
        "How do I connect to my database from Node.js?",
        "Find all users who registered this month"
      ]
    };
  }
}

module.exports = AIAssistantService;
