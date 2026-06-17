const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mock the singleton db pool before any imports
jest.mock('../src/utils/db', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return mockPool;
});

// Mock email and OTP services
jest.mock('../src/services/EmailService', () =>
  jest.fn().mockImplementation(() => ({
    sendOTPEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  }))
);

jest.mock('../src/services/OTPService', () =>
  jest.fn().mockImplementation(() => ({
    generateOTP: jest.fn().mockReturnValue('123456'),
    storeOTP: jest.fn().mockResolvedValue(true),
    verifyOTP: jest.fn().mockResolvedValue(true),
    canRequestNewOTP: jest.fn().mockResolvedValue(true),
  }))
);

const pool = require('../src/utils/db');
const app = require('../src/server');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.NODE_ENV = 'test';
});

describe('POST /api/auth/register', () => {
  it('returns 400 for missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('returns 400 when password lacks uppercase', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password1',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(res.status).toBe(400);
    expect(res.body.details[0]).toMatch(/uppercase/i);
  });

  it('returns 400 when password lacks a number', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Passwordonly',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });

    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'existing@example.com',
      password: 'Password1',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('User already exists');
  });

  it('returns 200 and sends OTP for valid input', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })   // check existing user
      .mockResolvedValueOnce({ rows: [] });  // insert pending user

    const res = await request(app).post('/api/auth/register').send({
      username: 'newuser',
      email: 'new@example.com',
      password: 'Password1',
      firstName: 'New',
      lastName: 'User',
    });
    expect(res.status).toBe(200);
    expect(res.body.requiresVerification).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Password1' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('CorrectPassword1', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: hash,
        first_name: 'Test',
        last_name: 'User',
        email_verified_at: new Date(),
      }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token and refreshToken on success', async () => {
    const hash = await bcrypt.hash('Password1', 10);
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          password_hash: hash,
          first_name: 'Test',
          last_name: 'User',
          email_verified_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] }); // update last_login

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' });
    expect(res.status).toBe(401);
  });
});
