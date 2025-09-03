-- Add email verification column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;

-- Create pending_users table for storing unverified registrations
CREATE TABLE IF NOT EXISTS pending_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create OTPs table for storing verification codes
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'email_verification',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP NULL,
    attempts INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
CREATE INDEX IF NOT EXISTS idx_pending_users_expires_at ON pending_users(expires_at);
CREATE INDEX IF NOT EXISTS idx_otps_email_purpose ON otps(email, purpose);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- Update existing users to be email verified (for existing data)
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;
