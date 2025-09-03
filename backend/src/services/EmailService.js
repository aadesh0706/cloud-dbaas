const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  // Send OTP email
  async sendOTPEmail(email, otp, firstName = 'User') {
    try {
      const mailOptions = {
        from: `"DBaaS Platform" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Email Verification - DBaaS Platform',
        html: this.getOTPEmailTemplate(otp, firstName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`OTP email sent successfully to ${email}`);
      return result;
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      throw error;
    }
  }

  // Send welcome email after successful verification
  async sendWelcomeEmail(email, firstName = 'User') {
    try {
      const mailOptions = {
        from: `"DBaaS Platform" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Welcome to DBaaS Platform!',
        html: this.getWelcomeEmailTemplate(firstName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent successfully to ${email}`);
      return result;
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      throw error;
    }
  }

  // OTP email template
  getOTPEmailTemplate(otp, firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - DBaaS Platform</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .otp-box {
            background: #f3f4f6;
            border: 2px dashed #2563eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .instructions {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🗄️ DBaaS Platform</div>
            <h2>Email Verification Required</h2>
          </div>
          
          <p>Hello <strong>${firstName}</strong>,</p>
          
          <p>Thank you for registering with DBaaS Platform! To complete your registration, please verify your email address using the OTP code below:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Enter this code to verify your email</p>
          </div>
          
          <div class="instructions">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>This OTP will expire in <strong>15 minutes</strong></li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <p>Once verified, you'll have access to:</p>
          <ul>
            <li>🚀 Create and manage database instances</li>
            <li>📊 Real-time monitoring and metrics</li>
            <li>🔧 Advanced configuration options</li>
            <li>📦 Project organization tools</li>
          </ul>
          
          <div class="footer">
            <p>If you're having trouble, please contact our support team.</p>
            <p>© 2024 DBaaS Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Welcome email template
  getWelcomeEmailTemplate(firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DBaaS Platform!</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #16a34a;
            margin-bottom: 10px;
          }
          .success-icon {
            font-size: 48px;
            margin: 20px 0;
          }
          .cta-button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
          }
          .feature-box {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🗄️ DBaaS Platform</div>
            <div class="success-icon">✅</div>
            <h2>Welcome to DBaaS Platform!</h2>
          </div>
          
          <p>Hello <strong>${firstName}</strong>,</p>
          
          <p>🎉 <strong>Congratulations!</strong> Your email has been successfully verified and your account is now active.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="cta-button">
              Login to Your Account
            </a>
          </div>
          
          <div class="feature-box">
            <h3>🚀 What's Next?</h3>
            <p>Now that your account is set up, you can:</p>
            <ul>
              <li><strong>Create Projects:</strong> Organize your databases by project</li>
              <li><strong>Deploy Databases:</strong> Choose from MySQL, PostgreSQL, or MongoDB</li>
              <li><strong>Monitor Performance:</strong> Real-time metrics and alerts</li>
              <li><strong>Scale Resources:</strong> Adjust CPU, memory, and storage as needed</li>
            </ul>
          </div>
          
          <div class="feature-box">
            <h3>📚 Getting Started Resources</h3>
            <ul>
              <li>📖 <a href="#">Quick Start Guide</a></li>
              <li>🎥 <a href="#">Video Tutorials</a></li>
              <li>💬 <a href="#">Community Forum</a></li>
              <li>📧 <a href="#">Support Center</a></li>
            </ul>
          </div>
          
          <p>If you have any questions or need assistance, our support team is here to help!</p>
          
          <div class="footer">
            <p>Thank you for choosing DBaaS Platform!</p>
            <p>© 2024 DBaaS Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email configuration verified successfully');
      return true;
    } catch (error) {
      logger.error('Email configuration verification failed:', error);
      return false;
    }
  }
}

module.exports = EmailService;
