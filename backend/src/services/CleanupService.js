const cron = require('node-cron');
const { Pool } = require('pg');
const logger = require('../utils/logger');

class CleanupService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }

  // Clean up expired OTPs and pending users
  async cleanupExpiredData() {
    try {
      const expiredOTPs = await this.cleanupExpiredOTPs();
      const expiredPendingUsers = await this.cleanupExpiredPendingUsers();
      
      logger.info(`Cleanup completed - Removed ${expiredOTPs} expired OTPs and ${expiredPendingUsers} expired pending users`);
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  // Clean up expired OTPs directly
  async cleanupExpiredOTPs() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM otps WHERE expires_at < NOW() RETURNING id'
      );
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Clean up expired pending users
  async cleanupExpiredPendingUsers() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM pending_users WHERE expires_at < NOW() RETURNING id'
      );
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up expired pending users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Start the cleanup scheduler
  startScheduler() {
    // Run cleanup every hour
    cron.schedule('0 * * * *', () => {
      this.cleanupExpiredData();
    });
    
    logger.info('Cleanup scheduler started - running every hour');
  }

  // Stop the cleanup scheduler
  stopScheduler() {
    cron.destroy();
    logger.info('Cleanup scheduler stopped');
  }
}

module.exports = CleanupService;
