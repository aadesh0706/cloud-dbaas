const crypto = require('crypto');
const { Pool } = require('pg');
const logger = require('../utils/logger');

class OTPService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database
  async storeOTP(email, otp, purpose = 'email_verification') {
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      // Delete any existing OTPs for this email and purpose
      await this.pool.query(
        'DELETE FROM otps WHERE email = $1 AND purpose = $2',
        [email, purpose]
      );

      // Insert new OTP
      const result = await this.pool.query(
        `INSERT INTO otps (email, otp, purpose, expires_at, created_at, attempts)
         VALUES ($1, $2, $3, $4, NOW(), 0)
         RETURNING id`,
        [email, otp, purpose, expiresAt]
      );

      logger.info(`OTP stored for ${email} with purpose ${purpose}`);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to store OTP:', error);
      throw new Error('Failed to store verification code');
    }
  }

  // Verify OTP
  async verifyOTP(email, otp, purpose = 'email_verification') {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get OTP record
      const result = await client.query(
        `SELECT id, otp, expires_at, attempts, verified_at
         FROM otps 
         WHERE email = $1 AND purpose = $2 AND verified_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [email, purpose]
      );

      if (result.rows.length === 0) {
        throw new Error('No verification code found or code already used');
      }

      const otpRecord = result.rows[0];

      // Check if OTP is expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        await client.query(
          'DELETE FROM otps WHERE email = $1 AND purpose = $2',
          [email, purpose]
        );
        throw new Error('Verification code has expired');
      }

      // Check attempts limit (max 5 attempts)
      if (otpRecord.attempts >= 5) {
        await client.query(
          'DELETE FROM otps WHERE email = $1 AND purpose = $2',
          [email, purpose]
        );
        throw new Error('Too many invalid attempts. Please request a new code');
      }

      // Increment attempts
      await client.query(
        'UPDATE otps SET attempts = attempts + 1 WHERE id = $1',
        [otpRecord.id]
      );

      // Verify OTP
      if (otpRecord.otp !== otp) {
        await client.query('COMMIT');
        throw new Error('Invalid verification code');
      }

      // Mark as verified and delete
      await client.query(
        'UPDATE otps SET verified_at = NOW() WHERE id = $1',
        [otpRecord.id]
      );

      // Clean up - delete the used OTP
      await client.query(
        'DELETE FROM otps WHERE id = $1',
        [otpRecord.id]
      );

      await client.query('COMMIT');
      logger.info(`OTP verified successfully for ${email} with purpose ${purpose}`);
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('OTP verification failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Clean up expired OTPs (run periodically)
  async cleanupExpiredOTPs() {
    try {
      const result = await this.pool.query(
        'DELETE FROM otps WHERE expires_at < NOW()'
      );
      
      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} expired OTPs`);
      }
      
      return result.rowCount;
    } catch (error) {
      logger.error('Failed to cleanup expired OTPs:', error);
      throw error;
    }
  }

  // Get OTP attempts for rate limiting
  async getOTPAttempts(email, purpose = 'email_verification') {
    try {
      const result = await this.pool.query(
        'SELECT attempts FROM otps WHERE email = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1',
        [email, purpose]
      );
      
      return result.rows.length > 0 ? result.rows[0].attempts : 0;
    } catch (error) {
      logger.error('Failed to get OTP attempts:', error);
      return 0;
    }
  }

  // Check if user can request new OTP (rate limiting)
  async canRequestNewOTP(email, purpose = 'email_verification') {
    try {
      const result = await this.pool.query(
        `SELECT created_at FROM otps 
         WHERE email = $1 AND purpose = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [email, purpose]
      );

      if (result.rows.length === 0) {
        return true; // No previous OTP, can request
      }

      const lastOTPTime = new Date(result.rows[0].created_at);
      const now = new Date();
      const timeDiff = (now - lastOTPTime) / 1000; // seconds

      // Allow new OTP after different intervals based on environment
      const rateLimitSeconds = process.env.NODE_ENV === 'development' ? 5 : 60;
      return timeDiff >= rateLimitSeconds;
    } catch (error) {
      logger.error('Failed to check OTP rate limit:', error);
      return false;
    }
  }

  // Initialize OTP table
  async initializeOTPTable() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS otps (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          otp VARCHAR(10) NOT NULL,
          purpose VARCHAR(50) NOT NULL DEFAULT 'email_verification',
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          verified_at TIMESTAMP NULL,
          attempts INTEGER DEFAULT 0,
          INDEX idx_email_purpose (email, purpose),
          INDEX idx_expires_at (expires_at)
        )
      `);
      
      logger.info('OTP table initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OTP table:', error);
      throw error;
    }
  }
}

module.exports = OTPService;
