const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();
const backups = new Map();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { databaseId, backupType = 'full' } = req.body;
    if (!databaseId) return res.status(400).json({ error: 'databaseId required' });
    const validTypes = ['full', 'schema', 'data'];
    if (!validTypes.includes(backupType)) return res.status(400).json({ error: 'Invalid type' });
    const backup = {
      id: uuidv4(), databaseId, userId: req.user.userId, type: backupType,
      status: 'in_progress', size: Math.floor(Math.random() * 5000) + 100,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString()
    };
    backups.set(backup.id, backup);
    setTimeout(() => { const b = backups.get(backup.id); if(b){ b.status='completed'; b.completedAt=new Date().toISOString(); }}, 2000);
    res.status(201).json({ message: 'Backup initiated', backup: { id: backup.id, type: backup.type, status: backup.status, size: backup.size, createdAt: backup.createdAt }});
  } catch (error) { logger.error(error); res.status(500).json({ error: 'Failed' }); }
});

router.get('/', authMiddleware, async (req, res) => {
  const userBackups = Array.from(backups.values()).filter(b => b.userId === req.user.userId);
  res.json({ backups: userBackups.map(b => ({ id: b.id, databaseId: b.databaseId, type: b.type, status: b.status, size: b.size, createdAt: b.createdAt })), total: userBackups.length });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const backup = backups.get(req.params.id);
  if (!backup || backup.userId !== req.user.userId) return res.status(404).json({ error: 'Not found' });
  backups.delete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
