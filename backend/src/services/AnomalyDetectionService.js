const OpenAI = require('openai');
const pool = require('../utils/db');
const DatabaseService = require('./DatabaseService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AnomalyDetectionService {
  constructor() {
    this.pool = pool;
    this.databaseService = new DatabaseService();
    this.ai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });
    this.model = 'meta/llama-3.3-70b-instruct';
  }

  async computeBaseline(database) {
    try {
      logger.info(`Computing anomaly baseline for database: ${database.name}`);
      const schema = await this.databaseService.getDatabaseSchema(database);
      const tables = (schema.tables || schema.collections || []).slice(0, 20);

      if (tables.length === 0) {
        return { message: 'No tables found in this database', tables: 0 };
      }

      let processed = 0;
      for (const table of tables) {
        const tableName = typeof table === 'string' ? table : table.name;
        try {
          const stats = await this.getTableStats(database, tableName);

          await this.pool.query(
            `INSERT INTO anomaly_baselines (database_id, table_name, column_name, baseline_stats, updated_at)
             VALUES ($1, $2, '__volume__', $3, NOW())
             ON CONFLICT (database_id, table_name, column_name)
             DO UPDATE SET baseline_stats = $3, updated_at = NOW()`,
            [database.id, tableName, JSON.stringify({ row_count: stats.row_count, computed_at: stats.computed_at })]
          );

          for (const [colName, colStats] of Object.entries(stats.columns || {})) {
            await this.pool.query(
              `INSERT INTO anomaly_baselines (database_id, table_name, column_name, baseline_stats, updated_at)
               VALUES ($1, $2, $3, $4, NOW())
               ON CONFLICT (database_id, table_name, column_name)
               DO UPDATE SET baseline_stats = $4, updated_at = NOW()`,
              [database.id, tableName, colName, JSON.stringify(colStats)]
            );
          }
          processed++;
        } catch (err) {
          logger.warn(`Baseline skipped for table ${tableName}: ${err.message}`);
        }
      }

      return {
        message: `Baseline computed for ${processed} of ${tables.length} tables`,
        tables: processed,
        computed_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Compute baseline error:', error);
      throw error;
    }
  }

  async getTableStats(database, tableName) {
    const { engine } = database;
    let connection;

    try {
      connection = await this.databaseService.createDatabaseConnection(database);

      if (engine === 'mysql') {
        const [[countRow]] = await connection.query(`SELECT COUNT(*) AS cnt FROM \`${tableName}\``);
        const rowCount = parseInt(countRow.cnt) || 0;

        const [numericCols] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
           AND DATA_TYPE IN ('int','bigint','float','double','decimal','tinyint','smallint','mediumint')
           LIMIT 8`,
          [tableName]
        );

        const columnStats = {};
        for (const col of numericCols) {
          try {
            const [[s]] = await connection.query(
              `SELECT AVG(\`${col.COLUMN_NAME}\`) AS mean,
                      STDDEV(\`${col.COLUMN_NAME}\`) AS std,
                      SUM(CASE WHEN \`${col.COLUMN_NAME}\` IS NULL THEN 1 ELSE 0 END) AS null_count
               FROM \`${tableName}\``
            );
            columnStats[col.COLUMN_NAME] = {
              mean: parseFloat(s.mean) || 0,
              std: parseFloat(s.std) || 0,
              null_rate: rowCount > 0 ? (parseInt(s.null_count) || 0) / rowCount : 0
            };
          } catch (_) {}
        }
        return { row_count: rowCount, columns: columnStats, computed_at: new Date().toISOString() };

      } else if (engine === 'postgresql') {
        const cr = await connection.query(`SELECT COUNT(*) AS cnt FROM "${tableName}"`);
        const rowCount = parseInt(cr.rows[0].cnt) || 0;

        const numCols = await connection.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = $1 AND table_schema = 'public'
           AND data_type IN ('integer','bigint','numeric','real','double precision','smallint')
           LIMIT 8`,
          [tableName]
        );

        const columnStats = {};
        for (const col of numCols.rows) {
          try {
            const s = await connection.query(
              `SELECT AVG("${col.column_name}") AS mean,
                      STDDEV("${col.column_name}") AS std,
                      COUNT(*) FILTER (WHERE "${col.column_name}" IS NULL) AS null_count
               FROM "${tableName}"`
            );
            columnStats[col.column_name] = {
              mean: parseFloat(s.rows[0].mean) || 0,
              std: parseFloat(s.rows[0].std) || 0,
              null_rate: rowCount > 0 ? (parseInt(s.rows[0].null_count) || 0) / rowCount : 0
            };
          } catch (_) {}
        }
        return { row_count: rowCount, columns: columnStats, computed_at: new Date().toISOString() };

      } else if (engine === 'mongodb') {
        const db = connection.db(database.name || 'test');
        const rowCount = await db.collection(tableName).countDocuments();
        return { row_count: rowCount, columns: {}, computed_at: new Date().toISOString() };
      }

      return { row_count: 0, columns: {}, computed_at: new Date().toISOString() };
    } finally {
      if (connection) {
        try {
          if (engine === 'mysql') await connection.end();
          else if (engine === 'postgresql') await connection.end();
          else if (engine === 'mongodb') await connection.close();
        } catch (_) {}
      }
    }
  }

  async scanForAnomalies(database) {
    try {
      const baselineRows = await this.pool.query(
        `SELECT table_name, column_name, baseline_stats FROM anomaly_baselines WHERE database_id = $1`,
        [database.id]
      );

      if (baselineRows.rows.length === 0) {
        return { anomalies: [], message: 'No baseline found. Compute baseline first.' };
      }

      const schema = await this.databaseService.getDatabaseSchema(database);
      const tables = (schema.tables || schema.collections || []).slice(0, 20);
      const anomalies = [];

      for (const table of tables) {
        const tableName = typeof table === 'string' ? table : table.name;
        try {
          const liveStats = await this.getTableStats(database, tableName);
          const volumeBaseline = baselineRows.rows.find(
            r => r.table_name === tableName && r.column_name === '__volume__'
          );

          if (volumeBaseline) {
            const base = volumeBaseline.baseline_stats;
            const baseCount = base.row_count || 0;

            if (baseCount > 0) {
              const ratio = liveStats.row_count / baseCount;
              if (ratio > 2.0 || (ratio < 0.5 && liveStats.row_count !== baseCount)) {
                const anomalyType = ratio >= 2.0 ? 'volume_burst' : 'volume_drop';
                const severity = ratio >= 5.0 ? 'critical' : ratio >= 2.0 ? 'high' : 'medium';
                const explanation = await this.explainAnomaly(
                  { type: anomalyType, tableName, observed: liveStats.row_count, expected: baseCount, severity },
                  database
                );
                const a = this.buildAnomaly(database.id, tableName, null, anomalyType, severity,
                  liveStats.row_count, { min: baseCount * 0.5, max: baseCount * 1.5, mean: baseCount }, explanation);
                await this.saveAnomaly(a);
                anomalies.push(a);
              }
            }
          }

          for (const colRow of baselineRows.rows.filter(r => r.table_name === tableName && r.column_name !== '__volume__')) {
            const colName = colRow.column_name;
            const colBase = colRow.baseline_stats;
            const liveCol = (liveStats.columns || {})[colName];
            if (!liveCol) continue;

            // Null surge
            const nullDelta = liveCol.null_rate - (colBase.null_rate || 0);
            if (nullDelta > 0.2 && liveCol.null_rate > 0.3) {
              const explanation = await this.explainAnomaly(
                { type: 'null_surge', tableName, columnName: colName, observed: liveCol.null_rate, expected: colBase.null_rate, severity: 'high' },
                database
              );
              const a = this.buildAnomaly(database.id, tableName, colName, 'null_surge', 'high',
                liveCol.null_rate, { min: 0, max: colBase.null_rate + 0.1, mean: colBase.null_rate }, explanation);
              await this.saveAnomaly(a);
              anomalies.push(a);
            }

            // Value spike (z-score)
            if (colBase.std > 0) {
              const zScore = Math.abs((liveCol.mean || 0) - colBase.mean) / colBase.std;
              if (zScore > 3) {
                const severity = zScore > 5 ? 'critical' : 'high';
                const explanation = await this.explainAnomaly(
                  { type: 'value_spike', tableName, columnName: colName, observed: liveCol.mean, expected: colBase.mean, zScore, severity },
                  database
                );
                const expectedRange = {
                  min: colBase.mean - 3 * colBase.std,
                  max: colBase.mean + 3 * colBase.std,
                  mean: colBase.mean
                };
                const a = this.buildAnomaly(database.id, tableName, colName, 'value_spike', severity,
                  liveCol.mean, expectedRange, explanation);
                await this.saveAnomaly(a);
                anomalies.push(a);
              }
            }
          }
        } catch (err) {
          logger.warn(`Scan skipped for table ${tableName}: ${err.message}`);
        }
      }

      return { anomalies, scanned_at: new Date().toISOString() };
    } catch (error) {
      logger.error('Scan for anomalies error:', error);
      throw error;
    }
  }

  buildAnomaly(databaseId, tableName, columnName, type, severity, observed, expectedRange, explanation) {
    return {
      id: uuidv4(),
      database_id: databaseId,
      table_name: tableName,
      column_name: columnName,
      anomaly_type: type,
      severity,
      observed_value: observed,
      expected_range: expectedRange,
      ai_explanation: explanation,
      is_acknowledged: false,
      detected_at: new Date().toISOString()
    };
  }

  async saveAnomaly(anomaly) {
    try {
      await this.pool.query(
        `INSERT INTO detected_anomalies
         (id, database_id, table_name, column_name, anomaly_type, severity,
          observed_value, expected_range, ai_explanation, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [anomaly.id, anomaly.database_id, anomaly.table_name, anomaly.column_name,
         anomaly.anomaly_type, anomaly.severity, anomaly.observed_value,
         JSON.stringify(anomaly.expected_range), anomaly.ai_explanation]
      );
    } catch (err) {
      logger.warn('Save anomaly error:', err.message);
    }
  }

  async explainAnomaly(anomaly, database) {
    try {
      const colPart = anomaly.columnName ? `, column "${anomaly.columnName}"` : '';
      let userPrompt;

      if (anomaly.type === 'value_spike') {
        userPrompt = `Table "${anomaly.tableName}"${colPart}: average value is now ${Number(anomaly.observed).toFixed(2)} but baseline was ${Number(anomaly.expected).toFixed(2)}. Explain in 2 sentences what this data change means for the business and what to investigate.`;
      } else if (anomaly.type === 'null_surge') {
        userPrompt = `Table "${anomaly.tableName}"${colPart}: NULL rate jumped from ${(anomaly.expected * 100).toFixed(0)}% to ${(anomaly.observed * 100).toFixed(0)}%. Explain in 2 sentences the likely business cause and what to check.`;
      } else if (anomaly.type === 'volume_burst') {
        userPrompt = `Table "${anomaly.tableName}" grew from ${anomaly.expected} to ${anomaly.observed} rows unexpectedly. Explain in 2 sentences what could cause this sudden growth and what to investigate.`;
      } else {
        userPrompt = `Table "${anomaly.tableName}" dropped from ${anomaly.expected} to ${anomaly.observed} rows. Explain in 2 sentences the likely cause and urgency.`;
      }

      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a database health expert for a ${database.engine} database named "${database.name}". Explain data anomalies in plain business language. Be specific and actionable. Do not mention "z-score" or statistical terms.`
          },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 150
      });

      return response.choices[0]?.message?.content?.trim() || this.fallbackExplanation(anomaly);
    } catch (err) {
      logger.warn('LLM explanation fallback:', err.message);
      return this.fallbackExplanation(anomaly);
    }
  }

  fallbackExplanation(anomaly) {
    const col = anomaly.columnName ? ` (column: ${anomaly.columnName})` : '';
    const map = {
      volume_burst: `The "${anomaly.tableName}" table grew from ${anomaly.expected} to ${anomaly.observed} rows — a ${((anomaly.observed / anomaly.expected) * 100 - 100).toFixed(0)}% spike. This may indicate a bulk import, runaway process, or missing DELETE operations.`,
      volume_drop: `The "${anomaly.tableName}" table dropped from ${anomaly.expected} to ${anomaly.observed} rows. Data may have been deleted or a scheduled sync job failed.`,
      null_surge: `${anomaly.tableName}${col} NULL rate jumped from ${(anomaly.expected * 100).toFixed(0)}% to ${(anomaly.observed * 100).toFixed(0)}%. An upstream data source may be failing to populate this field.`,
      value_spike: `${anomaly.tableName}${col} average is ${Number(anomaly.observed).toFixed(2)}, far from the baseline of ${Number(anomaly.expected).toFixed(2)}. Check for data entry errors or unusual recent transactions.`
    };
    return map[anomaly.type] || 'An unusual data pattern was detected. Manual investigation is recommended.';
  }

  async getAnomalies(databaseId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows, countResult] = await Promise.all([
      this.pool.query(
        `SELECT * FROM detected_anomalies WHERE database_id = $1 ORDER BY detected_at DESC LIMIT $2 OFFSET $3`,
        [databaseId, limit, offset]
      ),
      this.pool.query(`SELECT COUNT(*) FROM detected_anomalies WHERE database_id = $1`, [databaseId])
    ]);
    return { anomalies: rows.rows, total: parseInt(countResult.rows[0].count), page, limit };
  }

  async acknowledgeAnomaly(anomalyId) {
    const result = await this.pool.query(
      `UPDATE detected_anomalies SET is_acknowledged = TRUE WHERE id = $1 RETURNING *`,
      [anomalyId]
    );
    return result.rows[0];
  }

  async getBaselineStatus(databaseId) {
    const result = await this.pool.query(
      `SELECT table_name, column_name, updated_at FROM anomaly_baselines
       WHERE database_id = $1 ORDER BY updated_at DESC`,
      [databaseId]
    );
    const tables = [...new Set(result.rows.map(r => r.table_name))];
    return {
      table_count: tables.length,
      tables,
      last_computed: result.rows[0]?.updated_at || null,
      column_count: result.rows.filter(r => r.column_name !== '__volume__').length
    };
  }

  streamAnomalies(database, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    send({ type: 'connected', message: 'Anomaly monitor active', timestamp: new Date().toISOString() });

    const runScan = async () => {
      try {
        const result = await this.scanForAnomalies(database);
        if (result.anomalies.length > 0) {
          result.anomalies.forEach(a => send({ type: 'anomaly', data: a }));
        } else {
          send({ type: 'heartbeat', message: 'All tables normal', timestamp: new Date().toISOString() });
        }
      } catch (err) {
        send({ type: 'error', message: err.message });
      }
    };

    const timer = setInterval(runScan, 60000);
    res.on('close', () => {
      clearInterval(timer);
      logger.info(`Anomaly stream closed for database: ${database.id}`);
    });
  }
}

module.exports = AnomalyDetectionService;
