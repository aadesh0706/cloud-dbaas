const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

class RelationshipStoryService {
  constructor() {
    this.cardinality = {
      ONE_TO_ONE: 'one-to-one',
      ONE_TO_MANY: 'one-to-many',
      MANY_TO_ONE: 'many-to-one',
      MANY_TO_MANY: 'many-to-many'
    };
  }

  /**
   * Generate a human-readable story about database relationships
   * @param {Object} database - Database configuration object
   * @returns {Promise<Object>} Story object with relationships
   */
  async generateRelationshipStory(database) {
    try {
      logger.info(`🔍 Generating relationship story for ${database.engine} database: ${database.name}`);

      let relationships = [];
      let story = [];
      let schemaInfo = {};

      switch (database.engine.toLowerCase()) {
        case 'mysql':
          ({ relationships, schemaInfo } = await this.analyzeMySQLRelationships(database));
          break;
        case 'postgresql':
        case 'postgres':
          ({ relationships, schemaInfo } = await this.analyzePostgreSQLRelationships(database));
          break;
        case 'mongodb':
          ({ relationships, schemaInfo } = await this.analyzeMongoDBRelationships(database));
          break;
        default:
          logger.warn(`Unsupported database engine: ${database.engine}`);
          return {
            success: false,
            message: 'Relationship analysis not supported for this database engine'
          };
      }

      // Generate natural language story from relationships
      story = this.convertRelationshipsToStory(relationships);

      // Generate insights and statistics
      const insights = this.generateInsights(relationships, schemaInfo);

      return {
        success: true,
        databaseName: database.name,
        engine: database.engine,
        relationships,
        story,
        insights,
        schemaInfo,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error generating relationship story:', error);
      return {
        success: false,
        error: error.message,
        story: ['Unable to analyze database relationships at this time.']
      };
    }
  }

  /**
   * Analyze MySQL database relationships
   */
  async analyzeMySQLRelationships(database) {
    const connection = await mysql.createConnection({
      host: database.host,
      port: database.port || 3306,
      user: database.username || 'root',
      password: database.password || 'mysql123',
      database: database.database || database.name
    });

    try {
      // Get all tables
      const [tables] = await connection.execute(
        `SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT 
         FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = ?`,
        [database.database || database.name]
      );

      // Get foreign key relationships
      const [foreignKeys] = await connection.execute(
        `SELECT 
          CONSTRAINT_NAME,
          TABLE_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ? 
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [database.database || database.name]
      );

      // Get column information for each table
      const [columns] = await connection.execute(
        `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME, ORDINAL_POSITION`,
        [database.database || database.name]
      );

      const relationships = foreignKeys.map(fk => this.parseRelationship(fk, columns, 'mysql'));

      const schemaInfo = {
        totalTables: tables.length,
        totalRelationships: relationships.length,
        tables: tables.map(t => ({
          name: t.TABLE_NAME,
          rows: t.TABLE_ROWS,
          comment: t.TABLE_COMMENT
        }))
      };

      return { relationships, schemaInfo };

    } finally {
      await connection.end();
    }
  }

  /**
   * Analyze PostgreSQL database relationships
   */
  async analyzePostgreSQLRelationships(database) {
    const client = new Client({
      host: database.host,
      port: database.port || 5432,
      user: database.username || 'postgres',
      password: database.password || 'postgres',
      database: database.database || database.name
    });

    await client.connect();

    try {
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name, 
               (SELECT reltuples FROM pg_class WHERE relname = table_name) as row_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);

      // Get foreign key relationships
      const foreignKeysResult = await client.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `);

      // Get column information
      const columnsResult = await client.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);

      const relationships = foreignKeysResult.rows.map(fk => 
        this.parseRelationship(fk, columnsResult.rows, 'postgresql')
      );

      const schemaInfo = {
        totalTables: tablesResult.rows.length,
        totalRelationships: relationships.length,
        tables: tablesResult.rows.map(t => ({
          name: t.table_name,
          rows: parseInt(t.row_count) || 0
        }))
      };

      return { relationships, schemaInfo };

    } finally {
      await client.end();
    }
  }

  /**
   * Analyze MongoDB database relationships (based on references in documents)
   */
  async analyzeMongoDBRelationships(database) {
    // Use DatabaseService to obtain a connection (this centralizes host/port/defaults for dev/prod)
    const DatabaseService = require('./DatabaseService');
    const dbService = new DatabaseService();
    const client = await dbService.createDatabaseConnection(database);

    try {
      const db = client.db(database.database || database.name);
      const collections = await db.listCollections().toArray();

      const relationships = [];
      const schemaInfo = {
        totalTables: collections.length,
        totalRelationships: 0,
        tables: []
      };

      // Analyze each collection for reference patterns
      for (const collection of collections) {
        const collectionName = collection.name;
        const docs = await db.collection(collectionName).find({}).limit(100).toArray();
        const docCount = await db.collection(collectionName).countDocuments();

        schemaInfo.tables.push({
          name: collectionName,
          rows: docCount
        });

        if (docs.length > 0) {
          // Look for common reference patterns (_id, userId, postId, etc.)
          const refFields = this.findReferenceFields(docs, collectionName, collections);
          relationships.push(...refFields);
        }
      }

      schemaInfo.totalRelationships = relationships.length;

      return { relationships, schemaInfo };

    } finally {
      // Ensure client is closed using the correct method
      try {
        await client.close();
      } catch (e) {
        // ignore close errors
      }
    }
  }

  /**
   * Find reference fields in MongoDB documents
   */
  findReferenceFields(documents, collectionName, allCollections) {
    const relationships = [];
    const collectionNames = allCollections.map(c => c.name);
    
    // Sample first few documents
    documents.slice(0, 10).forEach(doc => {
      Object.keys(doc).forEach(key => {
        // Look for common reference patterns
        const lowerKey = key.toLowerCase();
        
        // Pattern 1: userId, postId, authorId, etc.
        if (lowerKey.endsWith('id') && lowerKey !== '_id') {
          const referencedCollection = lowerKey.replace(/id$/, '') + 's';
          if (collectionNames.includes(referencedCollection)) {
            relationships.push({
              fromTable: collectionName,
              fromColumn: key,
              toTable: referencedCollection,
              toColumn: '_id',
              type: this.cardinality.MANY_TO_ONE,
              engine: 'mongodb'
            });
          }
        }

        // Pattern 2: Array of IDs (many-to-many)
        if (Array.isArray(doc[key]) && doc[key].length > 0 && 
            typeof doc[key][0] === 'object' && doc[key][0]._id) {
          const potentialCollection = key;
          if (collectionNames.includes(potentialCollection)) {
            relationships.push({
              fromTable: collectionName,
              fromColumn: key,
              toTable: potentialCollection,
              toColumn: '_id',
              type: this.cardinality.MANY_TO_MANY,
              engine: 'mongodb'
            });
          }
        }
      });
    });

    // Remove duplicates
    return relationships.filter((rel, index, self) =>
      index === self.findIndex(r => 
        r.fromTable === rel.fromTable && 
        r.fromColumn === rel.fromColumn &&
        r.toTable === rel.toTable
      )
    );
  }

  /**
   * Parse a relationship from foreign key data
   */
  parseRelationship(fk, columns, engine) {
    // Determine cardinality based on column constraints
    let type = this.cardinality.MANY_TO_ONE; // Default

    if (engine === 'mysql') {
      const column = columns.find(c => 
        c.TABLE_NAME === fk.TABLE_NAME && 
        c.COLUMN_NAME === fk.COLUMN_NAME
      );

      if (column) {
        // If foreign key is also unique, it's one-to-one
        if (column.COLUMN_KEY === 'UNI' || column.COLUMN_KEY === 'PRI') {
          type = this.cardinality.ONE_TO_ONE;
        }
      }
    } else if (engine === 'postgresql') {
      const column = columns.find(c => 
        c.table_name === fk.table_name && 
        c.column_name === fk.column_name
      );
      // PostgreSQL: check if unique constraint exists
      // Simplified: assume many-to-one by default
    }

    return {
      fromTable: engine === 'mysql' ? fk.TABLE_NAME : fk.table_name,
      fromColumn: engine === 'mysql' ? fk.COLUMN_NAME : fk.column_name,
      toTable: engine === 'mysql' ? fk.REFERENCED_TABLE_NAME : fk.referenced_table_name,
      toColumn: engine === 'mysql' ? fk.REFERENCED_COLUMN_NAME : fk.referenced_column_name,
      constraintName: engine === 'mysql' ? fk.CONSTRAINT_NAME : fk.constraint_name,
      type,
      engine
    };
  }

  /**
   * Convert relationships to natural language story
   */
  convertRelationshipsToStory(relationships) {
    if (relationships.length === 0) {
      return [
        "📊 This database currently has no foreign key relationships.",
        "💡 Tip: Add foreign keys to establish connections between tables!"
      ];
    }

    const story = ["📖 Database Relationship Story:", ""];

    // Group relationships by type
    const groupedByType = relationships.reduce((acc, rel) => {
      if (!acc[rel.type]) acc[rel.type] = [];
      acc[rel.type].push(rel);
      return acc;
    }, {});

    // Generate story for each relationship type
    Object.keys(groupedByType).forEach(type => {
      const rels = groupedByType[type];
      
      rels.forEach(rel => {
        const sentence = this.generateSentence(rel);
        story.push(`• ${sentence}`);
      });
      
      story.push(''); // Add spacing
    });

    // Add summary
    story.push(`✨ Total: ${relationships.length} relationship${relationships.length > 1 ? 's' : ''} found`);

    return story;
  }

  /**
   * Generate a natural language sentence for a relationship
   */
  generateSentence(relationship) {
    const from = this.humanize(relationship.fromTable);
    const to = this.humanize(relationship.toTable);

    switch (relationship.type) {
      case this.cardinality.ONE_TO_ONE:
        return `Each ${from} has exactly one ${to}.`;

      case this.cardinality.ONE_TO_MANY:
        return `One ${to} can have many ${from}.`;

      case this.cardinality.MANY_TO_ONE:
        return `Many ${from} belong to one ${to}.`;

      case this.cardinality.MANY_TO_MANY:
        return `${from} and ${to} have a many-to-many relationship.`;

      default:
        return `${from} is related to ${to}.`;
    }
  }

  /**
   * Humanize table names (convert from snake_case/camelCase to readable)
   */
  humanize(tableName) {
    return tableName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase())
      .replace(/s$/, ''); // Remove plural 's' for better readability
  }

  /**
   * Generate insights from relationships
   */
  generateInsights(relationships, schemaInfo) {
    const insights = [];

    // Complexity insight
    if (relationships.length === 0) {
      insights.push({
        type: 'info',
        message: 'This appears to be a simple database with independent tables.'
      });
    } else if (relationships.length > 10) {
      insights.push({
        type: 'warning',
        message: 'This is a complex database with many relationships. Consider documentation!'
      });
    } else {
      insights.push({
        type: 'success',
        message: 'This database has a well-structured relationship model.'
      });
    }

    // Find most connected tables
    const connectionCounts = {};
    relationships.forEach(rel => {
      connectionCounts[rel.fromTable] = (connectionCounts[rel.fromTable] || 0) + 1;
      connectionCounts[rel.toTable] = (connectionCounts[rel.toTable] || 0) + 1;
    });

    const mostConnected = Object.entries(connectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (mostConnected.length > 0) {
      const topTable = mostConnected[0];
      insights.push({
        type: 'info',
        message: `"${this.humanize(topTable[0])}" is the most connected table with ${topTable[1]} relationship${topTable[1] > 1 ? 's' : ''}.`
      });
    }

    // Check for potential many-to-many tables
    const manyToMany = relationships.filter(r => r.type === this.cardinality.MANY_TO_MANY);
    if (manyToMany.length > 0) {
      insights.push({
        type: 'info',
        message: `Found ${manyToMany.length} many-to-many relationship${manyToMany.length > 1 ? 's' : ''}.`
      });
    }

    return insights;
  }
}

module.exports = RelationshipStoryService;
