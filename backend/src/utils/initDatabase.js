const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const initDatabase = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    logger.info('Initializing database...');

    // Read and execute init.sql
    const initSqlPath = path.join(__dirname, '../../sql/init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    
    await pool.query(initSql);
    logger.info('Base database schema initialized successfully');

    // Read and execute email verification SQL
    const emailVerificationSqlPath = path.join(__dirname, '../../sql/add_email_verification.sql');
    const emailVerificationSql = fs.readFileSync(emailVerificationSqlPath, 'utf8');
    
    await pool.query(emailVerificationSql);
    logger.info('Email verification schema initialized successfully');

    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    // Don't exit the process, just log the error
    // The database might already be initialized
  } finally {
    await pool.end();
  }
};

module.exports = initDatabase;
