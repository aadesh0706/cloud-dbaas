const request = require('supertest');
const jwt = require('jsonwebtoken');

// Shared mock db service instance
const mockDbService = {
  getUserDatabases: jest.fn(),
  getDatabaseById: jest.fn(),
  createDatabase: jest.fn(),
  deleteDatabase: jest.fn(),
  scaleDatabase: jest.fn(),
  getK8sStatus: jest.fn().mockResolvedValue({ replicas: 1, readyReplicas: 1, pods: [] }),
  generateConnectionUrl: jest.fn(),
  getDatabaseSchema: jest.fn(),
  getTableDetails: jest.fn(),
  executeReadOnlyQuery: jest.fn(),
  getCollectionData: jest.fn(),
};

// Mock singleton db pool
jest.mock('../src/utils/db', () => ({ query: jest.fn(), connect: jest.fn() }));

// Mock DatabaseService to always return the same instance
jest.mock('../src/services/DatabaseService', () => jest.fn(() => mockDbService));

jest.mock('../src/services/RelationshipStoryService', () =>
  jest.fn(() => ({ generateRelationshipStory: jest.fn() }))
);

const app = require('../src/server');

const JWT_SECRET = 'test-secret-key';

function makeToken(userId = 'user-123') {
  return jwt.sign({ userId, username: 'testuser', email: 'test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.NODE_ENV = 'test';
});

describe('GET /api/databases', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/databases');
    expect(res.status).toBe(401);
  });

  it('returns databases list for authenticated user', async () => {
    const mockDbs = [{ id: 'db-1', name: 'mydb', engine: 'postgresql', status: 'running' }];
    mockDbService.getUserDatabases.mockResolvedValueOnce(mockDbs);

    const res = await request(app)
      .get('/api/databases')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('databases');
    expect(res.body.total).toBe(1);
  });
});

describe('POST /api/databases', () => {
  it('returns 400 for invalid database name (uppercase)', async () => {
    const res = await request(app)
      .post('/api/databases')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'INVALID_NAME', engine: 'postgresql', version: '15', storage: 10, cpu: 1, memory: 512 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for reserved SQL keyword as name', async () => {
    const res = await request(app)
      .post('/api/databases')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'select', engine: 'postgresql', version: '15', storage: 10, cpu: 1, memory: 512 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported engine', async () => {
    const res = await request(app)
      .post('/api/databases')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'mydb', engine: 'oracle', version: '19', storage: 10, cpu: 1, memory: 512 });
    expect(res.status).toBe(400);
  });

  it('returns 403 when database quota exceeded', async () => {
    const maxDbs = Array.from({ length: 5 }, (_, i) => ({ id: `db-${i}` }));
    mockDbService.getUserDatabases.mockResolvedValueOnce(maxDbs);
    process.env.MAX_DATABASES_PER_USER = '5';

    const res = await request(app)
      .post('/api/databases')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'newdb', engine: 'postgresql', version: '15', storage: 10, cpu: 1, memory: 512 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Quota Exceeded');
  });
});

describe('DELETE /api/databases/:id', () => {
  it('returns 404 when database does not exist or not owned by user', async () => {
    mockDbService.getDatabaseById.mockResolvedValueOnce(null);

    const res = await request(app)
      .delete('/api/databases/nonexistent-id')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 on successful deletion', async () => {
    mockDbService.getDatabaseById.mockResolvedValueOnce({ id: 'db-1', name: 'mydb' });
    mockDbService.deleteDatabase.mockResolvedValueOnce(true);

    const res = await request(app)
      .delete('/api/databases/db-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/databases/:id/scale', () => {
  it('returns 400 for invalid scale values (cpu > 4)', async () => {
    const res = await request(app)
      .patch('/api/databases/db-1/scale')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ cpu: 999 });
    expect(res.status).toBe(400);
  });

  it('returns 404 when database not found', async () => {
    mockDbService.getDatabaseById.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/databases/nonexistent-id/scale')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ cpu: 2 });
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful scale', async () => {
    mockDbService.getDatabaseById.mockResolvedValueOnce({ id: 'db-1', name: 'mydb', engine: 'postgresql' });
    mockDbService.scaleDatabase.mockResolvedValueOnce({ id: 'db-1', cpu: 2 });

    const res = await request(app)
      .patch('/api/databases/db-1/scale')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ cpu: 2 });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/databases/:id/query', () => {
  it('returns 400 for non-SELECT queries (DROP)', async () => {
    const res = await request(app)
      .post('/api/databases/db-1/query')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ query: 'DROP TABLE users' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid Query');
  });

  it('returns 400 for non-SELECT queries (INSERT)', async () => {
    const res = await request(app)
      .post('/api/databases/db-1/query')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ query: 'INSERT INTO users VALUES (1)' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when database not found', async () => {
    mockDbService.getDatabaseById.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/databases/db-1/query')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ query: 'SELECT 1' });
    expect(res.status).toBe(404);
  });
});
