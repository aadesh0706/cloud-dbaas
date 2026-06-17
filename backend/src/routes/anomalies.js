const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const AnomalyDetectionService = require('../services/AnomalyDetectionService');
const DatabaseService = require('../services/DatabaseService');
const logger = require('../utils/logger');

const anomalyService = new AnomalyDetectionService();
const databaseService = new DatabaseService();

// POST /api/anomalies/:dbId/baseline  — compute statistical baseline
router.post('/:dbId/baseline', authenticateToken, async (req, res) => {
  try {
    const database = await databaseService.getDatabaseById(req.params.dbId, req.user.userId);
    if (!database) return res.status(404).json({ error: 'Database not found' });

    const result = await anomalyService.computeBaseline(database);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Compute baseline error:', error);
    res.status(500).json({ error: 'Failed to compute baseline', message: error.message });
  }
});

// POST /api/anomalies/:dbId/scan  — run anomaly scan
router.post('/:dbId/scan', authenticateToken, async (req, res) => {
  try {
    const database = await databaseService.getDatabaseById(req.params.dbId, req.user.userId);
    if (!database) return res.status(404).json({ error: 'Database not found' });

    const result = await anomalyService.scanForAnomalies(database);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Scan anomalies error:', error);
    res.status(500).json({ error: 'Scan failed', message: error.message });
  }
});

// GET /api/anomalies/:dbId  — list recent anomalies
router.get('/:dbId', authenticateToken, async (req, res) => {
  try {
    const database = await databaseService.getDatabaseById(req.params.dbId, req.user.userId);
    if (!database) return res.status(404).json({ error: 'Database not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await anomalyService.getAnomalies(req.params.dbId, page, limit);
    res.json(result);
  } catch (error) {
    logger.error('Get anomalies error:', error);
    res.status(500).json({ error: 'Failed to fetch anomalies', message: error.message });
  }
});

// GET /api/anomalies/:dbId/baseline/status  — baseline status
router.get('/:dbId/baseline/status', authenticateToken, async (req, res) => {
  try {
    const database = await databaseService.getDatabaseById(req.params.dbId, req.user.userId);
    if (!database) return res.status(404).json({ error: 'Database not found' });

    const status = await anomalyService.getBaselineStatus(req.params.dbId);
    res.json(status);
  } catch (error) {
    logger.error('Baseline status error:', error);
    res.status(500).json({ error: 'Failed to get baseline status', message: error.message });
  }
});

// PATCH /api/anomalies/:anomalyId/acknowledge  — dismiss an anomaly
router.patch('/:anomalyId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const result = await anomalyService.acknowledgeAnomaly(req.params.anomalyId);
    if (!result) return res.status(404).json({ error: 'Anomaly not found' });
    res.json({ success: true, anomaly: result });
  } catch (error) {
    logger.error('Acknowledge anomaly error:', error);
    res.status(500).json({ error: 'Failed to acknowledge anomaly', message: error.message });
  }
});

// GET /api/anomalies/:dbId/stream  — SSE real-time anomaly feed (token via query param for EventSource)
router.get('/:dbId/stream', async (req, res) => {
  // EventSource cannot send headers, so accept token via query param
  if (req.query.token) req.headers.authorization = `Bearer ${req.query.token}`;
  return require('../middleware/auth')(req, res, async () => {
  try {
    const database = await databaseService.getDatabaseById(req.params.dbId, req.user.userId);
    if (!database) return res.status(404).json({ error: 'Database not found' });

    anomalyService.streamAnomalies(database, res);
  } catch (error) {
    logger.error('Anomaly stream error:', error);
    res.status(500).json({ error: 'Stream failed', message: error.message });
  }
  });
});

module.exports = router;
