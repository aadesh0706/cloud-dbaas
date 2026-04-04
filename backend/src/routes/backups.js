const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const DatabaseService = process.env.NODE_ENV === 'production'
  ? require('../services/DatabaseService.production')
  : require('../services/DatabaseService');

const router = express.Router();
const dbService = new DatabaseService();

// POST / — create a new backup
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { databaseId, backupType = 'full' } = req.body;
    if (!databaseId) return res.status(400).json({ error: 'databaseId required' });
    const validTypes = ['full', 'schema', 'data'];
    if (!validTypes.includes(backupType)) return res.status(400).json({ error: 'Invalid backup type' });

    const userId = req.user.userId;
    const id = uuidv4();
    const sizeMb = (Math.random() * 4900 + 100).toFixed(2);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await dbService.pool.query(
      `INSERT INTO database_backups
         (id, database_id, user_id, type, status, size_mb, created_at, expires_at)
       VALUES ($1, $2, $3, $4, 'in_progress', $5, NOW(), $6)
       RETURNING *`,
      [id, databaseId, userId, backupType, sizeMb, expiresAt]
    );

    const backup = result.rows[0];

    // Simulate async backup completion
    setTimeout(async () => {
      try {
        await dbService.pool.query(
          `UPDATE database_backups SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [id]
        );
      } catch (err) {
        logger.error('Backup completion update failed:', err);
      }
    }, 2000);

    res.status(201).json({
      message: 'Backup initiated',
      backup: {
        id: backup.id,
        databaseId: backup.database_id,
        type: backup.type,
        status: backup.status,
        sizeMb: backup.size_mb,
        createdAt: backup.created_at,
        expiresAt: backup.expires_at
      }
    });
  } catch (error) {
    logger.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// GET / — list all backups for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await dbService.pool.query(
      `SELECT b.*, d.name AS database_name, d.engine
       FROM database_backups b
       LEFT JOIN databases d ON b.database_id = d.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    const backups = result.rows.map(b => ({
      id: b.id,
      databaseId: b.database_id,
      databaseName: b.database_name,
      engine: b.engine,
      type: b.type,
      status: b.status,
      sizeMb: b.size_mb,
      createdAt: b.created_at,
      completedAt: b.completed_at,
      expiresAt: b.expires_at
    }));

    res.json({ backups, total: backups.length });
  } catch (error) {
    logger.error('Get backups error:', error);
    res.status(500).json({ error: 'Failed to retrieve backups' });
  }
});

// DELETE /:id — delete a backup
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const result = await dbService.pool.query(
      `DELETE FROM database_backups WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Backup not found or access denied' });
    }
    res.json({ message: 'Backup deleted', id });
  } catch (error) {
    logger.error('Delete backup error:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// POST /:id/restore — restore a completed backup
router.post('/:id/restore', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const found = await dbService.pool.query(
      `SELECT * FROM database_backups WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (found.rowCount === 0) {
      return res.status(404).json({ error: 'Backup not found or access denied' });
    }
    const backup = found.rows[0];
    if (backup.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed backups can be restored' });
    }

    await dbService.pool.query(
      `UPDATE database_backups SET status = 'restoring' WHERE id = $1`,
      [id]
    );

    // Simulate async restore completion
    setTimeout(async () => {
      try {
        await dbService.pool.query(
          `UPDATE database_backups SET status = 'completed' WHERE id = $1`,
          [id]
        );
      } catch (err) {
        logger.error('Restore completion update failed:', err);
      }
    }, 3000);

    res.json({
      message: 'Restore initiated',
      backup: {
        id: backup.id,
        databaseId: backup.database_id,
        type: backup.type,
        status: 'restoring'
      }
    });
  } catch (error) {
    logger.error('Restore backup error:', error);
    res.status(500).json({ error: 'Failed to initiate restore' });
  }
});

module.exports = router;
