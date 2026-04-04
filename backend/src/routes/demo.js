const express = require('express');
const router = express.Router();

// Static demo database instances
const demoDatabases = [
  {
    id: 'demo-db-001',
    name: 'blog_db',
    engine: 'mysql',
    version: '8.0',
    status: 'running',
    storage: 20,
    cpu: 1,
    memory: 1024,
    replicas: 1,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-db-002',
    name: 'analytics_db',
    engine: 'postgresql',
    version: '15',
    status: 'running',
    storage: 50,
    cpu: 2,
    memory: 2048,
    replicas: 1,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-db-003',
    name: 'content_db',
    engine: 'mongodb',
    version: '6.0',
    status: 'running',
    storage: 30,
    cpu: 1,
    memory: 1024,
    replicas: 1,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-db-004',
    name: 'cache_db',
    engine: 'redis',
    version: '7.0',
    status: 'running',
    storage: 5,
    cpu: 0.5,
    memory: 512,
    replicas: 1,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];

// Generate plausible fluctuating metric values
const generateMetrics = (databaseId) => ({
  databaseId,
  timestamp: new Date().toISOString(),
  cpu: { value: parseFloat((Math.random() * 40 + 10).toFixed(1)), unit: '%' },
  memory: { value: parseFloat((Math.random() * 300 + 200).toFixed(1)), unit: 'MB' },
  storage: { value: parseFloat((Math.random() * 5 + 2).toFixed(2)), unit: 'GB' },
  connections: { value: Math.floor(Math.random() * 20 + 5), unit: 'connections' },
  queries_per_second: { value: parseFloat((Math.random() * 100 + 20).toFixed(1)), unit: 'qps' },
  replication_lag: { value: parseFloat((Math.random() * 10).toFixed(1)), unit: 'ms' }
});

// GET /api/demo/info — platform overview
router.get('/info', (req, res) => {
  res.json({
    platform: 'Cloud DBaaS',
    version: '1.0.0',
    description: 'A fully-featured Database-as-a-Service platform supporting MySQL, PostgreSQL, MongoDB, and Redis.',
    features: [
      'MySQL 8.0, PostgreSQL 15, MongoDB 6.0, Redis 7.0 support',
      'Kubernetes-native deployments',
      'Real-time monitoring and metrics',
      'Automated backups with point-in-time restore',
      'AI Assistant for database management',
      'Schema explorer and query runner',
      'Performance benchmarking and analysis'
    ],
    stats: {
      totalDatabases: 142,
      activeUsers: 37,
      uptimePercent: 99.97,
      avgDeploymentTimeSeconds: 45
    }
  });
});

// GET /api/demo/databases — list of sample databases
router.get('/databases', (req, res) => {
  res.json({
    databases: demoDatabases,
    total: demoDatabases.length
  });
});

// GET /api/demo/databases/:id/metrics — sample metrics for a demo database
router.get('/databases/:id/metrics', (req, res) => {
  const db = demoDatabases.find(d => d.id === req.params.id);
  if (!db) {
    return res.status(404).json({ error: 'Demo database not found' });
  }
  res.json({
    database: db,
    metrics: generateMetrics(req.params.id),
    history: Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 5 * 60 * 1000).toISOString(),
      cpu: parseFloat((Math.random() * 40 + 10).toFixed(1)),
      memory: parseFloat((Math.random() * 300 + 200).toFixed(1))
    }))
  });
});

// GET /api/demo/backups — sample backup list
router.get('/backups', (req, res) => {
  res.json({
    backups: [
      {
        id: 'demo-backup-001',
        databaseId: 'demo-db-001',
        databaseName: 'blog_db',
        engine: 'mysql',
        type: 'full',
        status: 'completed',
        sizeMb: 1240.5,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 23.9 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'demo-backup-002',
        databaseId: 'demo-db-002',
        databaseName: 'analytics_db',
        engine: 'postgresql',
        type: 'schema',
        status: 'completed',
        sizeMb: 45.2,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 11.95 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    total: 2
  });
});

module.exports = router;
