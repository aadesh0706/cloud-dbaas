const OpenAI = require('openai');
// Use production DatabaseService in production, development one locally
const DatabaseService = process.env.NODE_ENV === 'production'
  ? require('./DatabaseService.production')
  : require('./DatabaseService');

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AIAssistantService {
  constructor() {
    this.databaseService = new DatabaseService();
    this.ai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    this.model = 'meta/llama-3.3-70b-instruct';
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
   * Analyze user intent using NVIDIA LLM
   */
  async analyzeIntent(userMessage) {
    const systemPrompt = `You are an intent classifier for a Database-as-a-Service platform.
Analyze the user message and return ONLY a JSON object with this exact structure:
{
  "action": "<one of: create_database | create_project | view_schema | query_data | get_connection | optimize_performance | help>",
  "parameters": {
    "engine": "<mysql | postgresql | mongodb | redis | null>",
    "purpose": "<blog | ecommerce | analytics | general | null>",
    "table": "<table name if mentioned, else null>",
    "language": "<nodejs | python | java | php | null>",
    "name": "<project name if mentioned, else null>"
  },
  "confidence": <number 0-1>
}
Return ONLY the JSON object, no explanation.`;

    try {
      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const raw = response.choices[0]?.message?.content?.trim() || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          action: parsed.action || 'help',
          parameters: parsed.parameters || {},
          confidence: parsed.confidence || 0.5
        };
      }
    } catch (error) {
      logger.warn('NVIDIA intent analysis failed, falling back to keyword matching:', error.message);
    }

    // Keyword fallback in case the LLM is unreachable
    return this.analyzeIntentFallback(userMessage);
  }

  analyzeIntentFallback(userMessage) {
    const msg = userMessage.toLowerCase();
    if (msg.includes('create') && (msg.includes('database') || msg.includes('db'))) {
      const engine = msg.includes('postgres') ? 'postgresql'
        : msg.includes('mongo') ? 'mongodb'
        : msg.includes('redis') ? 'redis' : 'mysql';
      return { action: 'create_database', parameters: { engine, purpose: 'general' }, confidence: 0.8 };
    }
    if (msg.includes('schema') || msg.includes('view') || msg.includes('show')) {
      return { action: 'view_schema', parameters: {}, confidence: 0.7 };
    }
    if (msg.includes('connect') || msg.includes('connection')) {
      const language = msg.includes('python') ? 'python' : msg.includes('java') ? 'java' : 'nodejs';
      return { action: 'get_connection', parameters: { language }, confidence: 0.7 };
    }
    if (msg.includes('create') && msg.includes('project')) {
      return { action: 'create_project', parameters: {}, confidence: 0.8 };
    }
    if (msg.includes('optimize') || msg.includes('performance') || msg.includes('slow')) {
      return { action: 'optimize_performance', parameters: {}, confidence: 0.7 };
    }
    return { action: 'help', parameters: {}, confidence: 0.5 };
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
      const databases = await this.databaseService.getUserDatabases(userId);
      
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
   * Create a project from AI natural language request
   */
  async createProjectFromRequest(intent, userId) {
    try {
      const { parameters } = intent;
      const projectName = parameters.name || `AI Project ${Date.now()}`;
      const result = await this.databaseService.pool.query(
        `INSERT INTO projects (id, name, description, user_id, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [uuidv4(), projectName, parameters.description || 'Created by AI Assistant', userId]
      );
      const project = result.rows[0];
      return {
        success: true,
        message: `✅ Successfully created project "${project.name}"`,
        project,
        nextSteps: [
          '📦 Add databases to your new project',
          '👥 Invite team members if needed',
          '📊 Configure monitoring and alerts'
        ]
      };
    } catch (error) {
      logger.error('Create project from AI error:', error);
      throw error;
    }
  }

  /**
   * Guide user to query their database data
   */
  async queryDatabaseData(intent, userId) {
    try {
      const databases = await this.databaseService.getUserDatabases(userId);
      if (databases.length === 0) {
        return {
          success: false,
          message: 'You have no databases to query. Create a database first.',
          tip: 'Use the "Create a MySQL database" command to get started.'
        };
      }
      return {
        success: true,
        message: '🔍 To query your database, use the Schema & Data tab in Database Details.',
        availableDatabases: databases.map(db => ({ id: db.id, name: db.name, engine: db.engine })),
        tip: 'Navigate to Databases → select your database → "Schema & Data" tab to run SELECT queries interactively.'
      };
    } catch (error) {
      logger.error('Query data AI error:', error);
      throw error;
    }
  }

  /**
   * Return connection info and code examples for the user's database
   */
  async getDatabaseConnection(intent, userId) {
    try {
      const { parameters } = intent;
      const language = parameters.language || 'nodejs';
      const databases = await this.databaseService.getUserDatabases(userId);
      if (databases.length === 0) {
        return {
          success: false,
          message: 'No databases found. Create a database first to get connection details.'
        };
      }
      const database = databases[0];
      const connectionInfo = await this.databaseService.generateConnectionUrl(database);
      const examples = this.generateCodeExamples(connectionInfo, database.engine);
      return {
        success: true,
        message: `🔗 Here is how to connect to "${database.name}" using ${language}`,
        database: { id: database.id, name: database.name, engine: database.engine },
        connectionInfo,
        codeExample: examples[language] || examples.nodejs,
        tip: 'Use the "Get Connection" button on the Database Detail page for live credentials.'
      };
    } catch (error) {
      logger.error('Get connection AI error:', error);
      throw error;
    }
  }

  /**
   * Return engine-specific optimization tips for user's databases
   */
  async optimizeDatabase(intent, userId) {
    try {
      const databases = await this.databaseService.getUserDatabases(userId);
      const recommendations = {
        mysql: [
          'Enable query cache with query_cache_size = 64M',
          'Add indexes on frequently queried columns',
          'Use EXPLAIN to analyse slow queries',
          'Consider connection pooling with a max pool size of 20'
        ],
        postgresql: [
          'Run VACUUM ANALYZE periodically to update statistics',
          'Set work_mem = 64MB for complex sort operations',
          'Add partial indexes for filtered queries',
          'Use pg_stat_statements to identify slow queries'
        ],
        mongodb: [
          'Create compound indexes that match your query patterns',
          'Use projection to return only necessary fields',
          'Enable the MongoDB profiler to log slow operations',
          'Consider read replicas for read-heavy workloads'
        ],
        redis: [
          'Set appropriate maxmemory and eviction policy',
          'Use pipelining to batch commands',
          'Monitor key expiry and memory usage',
          'Use Redis Cluster for horizontal scaling'
        ]
      };
      return {
        success: true,
        message: '⚡ Here are performance optimisation recommendations for your databases:',
        databases: databases.map(db => ({
          id: db.id,
          name: db.name,
          engine: db.engine,
          recommendations: recommendations[db.engine] || recommendations.mysql
        })),
        generalTips: [
          '📊 Monitor query performance from the Performance Analysis page',
          '🔔 Set up alerts for CPU and memory thresholds',
          '📈 Review the Monitoring tab for real-time metrics'
        ]
      };
    } catch (error) {
      logger.error('Optimise database AI error:', error);
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
   * Enhance schema with AI descriptions via NVIDIA LLM
   */
  async enhanceSchemaWithAI(schema, engine) {
    try {
      const tableNames = (schema.tables || []).map(t => t.name).join(', ');
      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a database expert. Analyze the table names and provide a concise 1-2 sentence insight about what this schema is likely used for. Be direct and specific.'
          },
          {
            role: 'user',
            content: `${engine} database with tables: ${tableNames || '(none yet)'}`
          }
        ],
        temperature: 0.3,
        max_tokens: 150,
      });
      const insight = response.choices[0]?.message?.content?.trim() || '';
      return { ...schema, ai_insights: insight };
    } catch (error) {
      logger.warn('Schema AI enhancement failed:', error.message);
      return { ...schema, ai_insights: `${engine} database schema with ${(schema.tables || []).length} table(s).` };
    }
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

  generatePythonConnection(database, connectionInfo) {
    if (database.engine === 'mysql') {
      return `import mysql.connector

connection = mysql.connector.connect(
    host='${connectionInfo.host}',
    user='${connectionInfo.username}',
    password='${connectionInfo.password}',
    database='${connectionInfo.database}'
)
print('Connected to MySQL database!')`;
    }
    if (database.engine === 'postgresql') {
      return `import psycopg2

connection = psycopg2.connect(
    host='${connectionInfo.host}',
    user='${connectionInfo.username}',
    password='${connectionInfo.password}',
    database='${connectionInfo.database}',
    port=5432
)
print('Connected to PostgreSQL database!')`;
    }
    if (database.engine === 'mongodb') {
      return `from pymongo import MongoClient

client = MongoClient('${connectionInfo.connectionString}')
db = client['${connectionInfo.database}']
print('Connected to MongoDB database!')`;
    }
    return `# Connection example for ${database.engine}\n# Please refer to the documentation for your specific driver`;
  }

  generatePythonQuery(database, connectionInfo) {
    if (database.engine === 'mysql' || database.engine === 'postgresql') {
      return `# Query example
cursor = connection.cursor()
cursor.execute("SELECT * FROM users LIMIT 10")
results = cursor.fetchall()
print('Query results:', results)`;
    }
    if (database.engine === 'mongodb') {
      return `# Query example
collection = db['users']
results = list(collection.find({}).limit(10))
print('Query results:', results)`;
    }
    return `# Query example for ${database.engine}`;
  }

  generatePythonInsert(database, connectionInfo) {
    if (database.engine === 'mysql' || database.engine === 'postgresql') {
      return `# Insert example
cursor = connection.cursor()
cursor.execute(
    "INSERT INTO users (username, email) VALUES (%s, %s)",
    ('john_doe', 'john@example.com')
)
connection.commit()
print('Insert successful, row id:', cursor.lastrowid)`;
    }
    if (database.engine === 'mongodb') {
      return `# Insert example
collection = db['users']
result = collection.insert_one({
    'username': 'john_doe',
    'email': 'john@example.com'
})
print('Insert result:', result.inserted_id)`;
    }
    return `# Insert example for ${database.engine}`;
  }

  /**
   * Generate a natural language help response via NVIDIA LLM
   */
  async generateHelpResponse(userMessage) {
    const capabilities = [
      'Create databases (MySQL, PostgreSQL, MongoDB, Redis)',
      'View database schemas and table structures',
      'Generate connection strings and code examples in Node.js, Python, Java, PHP',
      'Optimize database performance with engine-specific tips',
      'Create and manage projects'
    ];

    try {
      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant for a Database-as-a-Service platform. You help users manage MySQL, PostgreSQL, MongoDB, and Redis databases. You can: ${capabilities.join('; ')}. Keep responses concise and friendly.`
          },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 400,
      });
      const reply = response.choices[0]?.message?.content?.trim() || '';
      return { success: true, message: reply, capabilities };
    } catch (error) {
      logger.warn('NVIDIA help response failed:', error.message);
      return {
        success: true,
        message: 'I can help you with your databases. Try asking me to create a database, show a schema, or generate connection code.',
        capabilities
      };
    }
  }
}

module.exports = AIAssistantService;
