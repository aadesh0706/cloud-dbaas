const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const EmailService = require('../services/EmailService');
const OTPService = require('../services/OTPService');

const router = express.Router();

// Initialize services
const emailService = new EmailService();
const otpService = new OTPService();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Much higher limit for development
  message: 'Too many authentication attempts, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'development' // Skip rate limiting in development
});

// For development, create a no-op middleware
const developmentLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  return authLimiter(req, res, next);
};

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});

const resendOTPSchema = Joi.object({
  email: Joi.string().email().required()
});

// Register endpoint - Now sends OTP for verification
router.post('/register', developmentLimiter, async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const { username, email, password, firstName, lastName } = value;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email or username already exists'
      });
    }

    // Check if user can request new OTP (rate limiting)
    const canRequestOTP = await otpService.canRequestNewOTP(email);
    if (!canRequestOTP) {
      const waitTime = process.env.NODE_ENV === 'development' ? 5 : 60;
      return res.status(429).json({
        error: 'Rate Limited',
        message: `Please wait ${waitTime} seconds before requesting a new verification code`
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Store user data temporarily (pending verification)
    await pool.query(
      `INSERT INTO pending_users (username, email, password_hash, first_name, last_name, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (email) DO UPDATE SET
       username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       created_at = EXCLUDED.created_at`,
      [username, email, hashedPassword, firstName, lastName]
    );

    // Generate and store OTP
    const otp = otpService.generateOTP();
    await otpService.storeOTP(email, otp, 'email_verification');

    // Send OTP email
    await emailService.sendOTPEmail(email, otp, `${firstName} ${lastName}`);

    logger.info(`Registration initiated for ${email}, OTP sent`);

    res.status(200).json({
      message: 'Verification code sent to your email',
      email: email,
      requiresVerification: true
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process registration. Please try again.'
    });
  }
});

// Verify OTP and complete registration
router.post('/verify-otp', developmentLimiter, async (req, res) => {
  try {
    // Validate input
    const { error, value } = verifyOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const { email, otp } = value;

    // Verify OTP
    await otpService.verifyOTP(email, otp, 'email_verification');

    // Get pending user data
    const pendingUserResult = await pool.query(
      'SELECT username, email, password_hash, first_name, last_name FROM pending_users WHERE email = $1',
      [email]
    );

    if (pendingUserResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Registration Data Not Found',
        message: 'Registration session expired. Please register again.'
      });
    }

    const pendingUser = pendingUserResult.rows[0];

    // Move user from pending to active users
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the actual user
      const result = await client.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, email_verified_at, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, username, email, first_name, last_name, created_at`,
        [pendingUser.username, pendingUser.email, pendingUser.password_hash, 
         pendingUser.first_name, pendingUser.last_name]
      );

      const user = result.rows[0];

      // Remove from pending users
      await client.query('DELETE FROM pending_users WHERE email = $1', [email]);

      await client.query('COMMIT');

      // Send welcome email
      await emailService.sendWelcomeEmail(email, `${user.first_name} ${user.last_name}`);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      logger.info(`User registration completed and verified: ${email}`);

      res.status(201).json({
        message: 'Email verified successfully! Your account is now active.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
          emailVerified: true
        },
        token
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('OTP verification error:', error);
    res.status(400).json({
      error: 'Verification Failed',
      message: error.message || 'Invalid or expired verification code'
    });
  }
});

// Resend OTP endpoint
router.post('/resend-otp', developmentLimiter, async (req, res) => {
  try {
    // Validate input
    const { error, value } = resendOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const { email } = value;

    // Check if there's a pending registration for this email
    const pendingUserResult = await pool.query(
      'SELECT first_name, last_name FROM pending_users WHERE email = $1',
      [email]
    );

    if (pendingUserResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Registration Not Found',
        message: 'No pending registration found for this email. Please register first.'
      });
    }

    // Check rate limiting
    const canRequestOTP = await otpService.canRequestNewOTP(email);
    if (!canRequestOTP) {
      const waitTime = process.env.NODE_ENV === 'development' ? 5 : 60;
      return res.status(429).json({
        error: 'Rate Limited',
        message: `Please wait ${waitTime} seconds before requesting a new verification code`
      });
    }

    const pendingUser = pendingUserResult.rows[0];

    // Generate and store new OTP
    const otp = otpService.generateOTP();
    await otpService.storeOTP(email, otp, 'email_verification');

    // Send OTP email
    await emailService.sendOTPEmail(email, otp, `${pendingUser.first_name} ${pendingUser.last_name}`);

    logger.info(`OTP resent for ${email}`);

    res.status(200).json({
      message: 'New verification code sent to your email',
      email: email
    });

  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resend verification code. Please try again.'
    });
  }
});

// Login endpoint
router.post('/login', developmentLimiter, async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      logger.error('Login validation error:', error.details);
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password } = value;
    logger.info(`Login attempt for email: ${email}`);

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, first_name, last_name, email_verified_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      logger.warn(`Login failed: User not found for email ${email}`);
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];
    logger.info(`User found: ${email}, email_verified: ${!!user.email_verified_at}`);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    logger.info(`Password validation result for ${email}: ${isValidPassword}`);
    
    if (!isValidPassword) {
      logger.warn(`Login failed: Invalid password for email ${email}`);
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.email_verified_at) {
      logger.warn(`Login failed: Email not verified for ${email}`);
      return res.status(403).json({
        error: 'Email Not Verified',
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: email
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: true
      },
      token
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate user'
    });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, email, first_name, last_name, created_at, last_login FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User does not exist'
      });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'The provided token is invalid'
      });
    }
    
    logger.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user information'
    });
  }
});

module.exports = router;
