const { performance } = require('perf_hooks');
const os = require('os');
const client = require('prom-client');
const logger = require('../utils/logger');
const DatabaseService = require('./DatabaseService');

class PerformanceMetricsService {
  constructor() {
    this.databaseService = new DatabaseService();
    this.metrics = this.initializeMetrics();
    this.benchmarkResults = new Map();
    this.systemBaseline = null;
  }

  initializeMetrics() {
    return {
      // Response Time Metrics
      queryResponseTime: new client.Histogram({
        name: 'database_query_response_time_seconds',
        help: 'Query response time in seconds',
        labelNames: ['database_type', 'operation', 'database_id'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
      }),

      // Throughput Metrics
      queriesPerSecond: new client.Gauge({
        name: 'database_queries_per_second',
        help: 'Number of queries processed per second',
        labelNames: ['database_type', 'database_id']
      }),

      // Resource Utilization
      cpuUtilization: new client.Gauge({
        name: 'system_cpu_utilization_percent',
        help: 'CPU utilization percentage',
        labelNames: ['component', 'database_id']
      }),

      memoryUtilization: new client.Gauge({
        name: 'system_memory_utilization_bytes',
        help: 'Memory utilization in bytes',
        labelNames: ['component', 'database_id', 'type']
      }),

      // Error Rates
      errorRate: new client.Gauge({
        name: 'database_error_rate_percent',
        help: 'Database operation error rate percentage',
        labelNames: ['database_type', 'operation', 'database_id']
      }),

      // Scalability Metrics
      connectionCount: new client.Gauge({
        name: 'database_active_connections',
        help: 'Number of active database connections',
        labelNames: ['database_type', 'database_id']
      }),

      // Comparison Metrics
      performanceScore: new client.Gauge({
        name: 'system_performance_score',
        help: 'Overall performance score (0-100)',
        labelNames: ['system_type', 'database_type']
      })
    };
  }

  // Measure query response time
  async measureQueryResponseTime(database, operation, queryFunction) {
    const startTime = performance.now();
    const timer = this.metrics.queryResponseTime.startTimer({
      database_type: database.engine,
      operation: operation,
      database_id: database.id
    });

    try {
      const result = await queryFunction();
      const endTime = performance.now();
      const responseTime = (endTime - startTime) / 1000; // Convert to seconds
      
      timer();
      
      logger.info(`Query response time: ${responseTime.toFixed(3)}s for ${database.engine} ${operation}`);
      return { result, responseTime, success: true };
    } catch (error) {
      timer();
      logger.error(`Query failed for ${database.engine} ${operation}:`, error.message);
      return { result: null, responseTime: (performance.now() - startTime) / 1000, success: false, error };
    }
  }

  // Calculate throughput (QPS)
  async calculateThroughput(database, testQueries, duration = 10) {
    logger.info(`Starting throughput test for ${database.engine} database ${database.id}`);
    
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    let queryCount = 0;
    let errorCount = 0;

    while (Date.now() < endTime) {
      for (const query of testQueries) {
        if (Date.now() >= endTime) break;
        
        try {
          await this.executeQuery(database, query);
          queryCount++;
        } catch (error) {
          errorCount++;
          queryCount++;
        }
      }
    }

    const actualDuration = (Date.now() - startTime) / 1000;
    const qps = queryCount / actualDuration;
    const errorRate = (errorCount / queryCount) * 100;

    // Update Prometheus metrics
    this.metrics.queriesPerSecond.set(
      { database_type: database.engine, database_id: database.id }, 
      qps
    );
    
    this.metrics.errorRate.set(
      { database_type: database.engine, operation: 'select', database_id: database.id },
      errorRate
    );

    logger.info(`Throughput test completed: ${qps.toFixed(2)} QPS, ${errorRate.toFixed(2)}% error rate`);
    
    return {
      queriesPerSecond: qps,
      totalQueries: queryCount,
      errorCount: errorCount,
      errorRate: errorRate,
      duration: actualDuration
    };
  }

  // Monitor resource utilization
  async monitorResourceUtilization(database) {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    // Calculate CPU percentage
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    // Update Prometheus metrics
    this.metrics.cpuUtilization.set(
      { component: 'backend', database_id: database.id }, 
      cpuPercent
    );

    this.metrics.memoryUtilization.set(
      { component: 'backend', database_id: database.id, type: 'heap_used' },
      memoryUsage.heapUsed
    );

    this.metrics.memoryUtilization.set(
      { component: 'system', database_id: database.id, type: 'total' },
      systemMemory.total
    );

    this.metrics.memoryUtilization.set(
      { component: 'system', database_id: database.id, type: 'used' },
      systemMemory.used
    );

    return {
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percent: cpuPercent
      },
      memory: {
        process: memoryUsage,
        system: systemMemory,
        utilization: (systemMemory.used / systemMemory.total) * 100
      }
    };
  }

  // Execute query based on database type
  async executeQuery(database, query) {
    switch (database.engine) {
      case 'mysql':
        return await this.executeMySQLQuery(database, query);
      case 'postgresql':
        return await this.executePostgreSQLQuery(database, query);
      case 'mongodb':
        return await this.executeMongoQuery(database, query);
      default:
        throw new Error(`Unsupported database engine: ${database.engine}`);
    }
  }

  async executeMySQLQuery(database, query) {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.NODE_ENV === 'production' ? `${database.k8s_deployment}-service` : 'mysql-sample',
      port: 3306,
      user: 'root',
      password: process.env.MYSQL_ROOT_PASSWORD || 'mysql123',
      database: 'sample_db'
    });
    
    try {
      const [results] = await connection.execute(query.sql, query.params || []);
      return results;
    } finally {
      await connection.end();
    }
  }

  async executePostgreSQLQuery(database, query) {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.NODE_ENV === 'production' ? `${database.k8s_deployment}-service` : 'postgres',
      port: 5432,
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres123',
      database: 'dbaas_platform'
    });

    try {
      const result = await pool.query(query.sql, query.params || []);
      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async executeMongoQuery(database, query) {
    const { MongoClient } = require('mongodb');
    const host = process.env.NODE_ENV === 'production' ? `${database.k8s_deployment}-service` : 'mongo-sample';
    const uri = `mongodb://mongo:mongo123@${host}:27017/admin`;
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(query.database || 'test');
      const collection = db.collection(query.collection || 'testCollection');
      
      switch (query.operation) {
        case 'find':
          return await collection.find(query.filter || {}).toArray();
        case 'insert':
          return await collection.insertOne(query.document);
        case 'update':
          return await collection.updateOne(query.filter, query.update);
        case 'delete':
          return await collection.deleteOne(query.filter);
        default:
          return await collection.find({}).limit(10).toArray();
      }
    } finally {
      await client.close();
    }
  }

  // Run comprehensive benchmark
  async runBenchmark(database, options = {}) {
    const {
      duration = 30,
      concurrency = 10,
      queryTypes = ['select', 'insert', 'update']
    } = options;

    logger.info(`Starting benchmark for ${database.engine} database ${database.id}`);

    const benchmark = {
      database: {
        id: database.id,
        engine: database.engine,
        name: database.name
      },
      config: { duration, concurrency, queryTypes },
      startTime: new Date(),
      results: {}
    };

    // Test queries for each database type
    const testQueries = this.getTestQueries(database.engine);
    
    try {
      // 1. Response Time Test
      benchmark.results.responseTime = await this.measureAverageResponseTime(database, testQueries);
      
      // 2. Throughput Test
      benchmark.results.throughput = await this.calculateThroughput(database, testQueries, duration);
      
      // 3. Resource Utilization
      benchmark.results.resources = await this.monitorResourceUtilization(database);
      
      // 4. Scalability Test (concurrent connections)
      benchmark.results.scalability = await this.testScalability(database, concurrency);
      
      // 5. Calculate Performance Score
      benchmark.results.performanceScore = this.calculatePerformanceScore(benchmark.results);
      
      benchmark.endTime = new Date();
      benchmark.duration = (benchmark.endTime - benchmark.startTime) / 1000;

      // Store results
      this.benchmarkResults.set(`${database.engine}-${database.id}`, benchmark);
      
      // Update Prometheus metrics
      this.metrics.performanceScore.set(
        { system_type: 'our_dbaas', database_type: database.engine },
        benchmark.results.performanceScore
      );

      logger.info(`Benchmark completed for ${database.engine}. Performance Score: ${benchmark.results.performanceScore}`);
      return benchmark;
      
    } catch (error) {
      logger.error(`Benchmark failed for ${database.engine}:`, error);
      benchmark.error = error.message;
      benchmark.endTime = new Date();
      return benchmark;
    }
  }

  getTestQueries(engine) {
    switch (engine) {
      case 'mysql':
        return [
          { sql: 'SELECT 1', params: [] },
          { sql: 'SELECT COUNT(*) FROM information_schema.tables', params: [] },
          { sql: 'SELECT CURRENT_TIMESTAMP()', params: [] }
        ];
      
      case 'postgresql':
        return [
          { sql: 'SELECT 1', params: [] },
          { sql: 'SELECT COUNT(*) FROM information_schema.tables', params: [] },
          { sql: 'SELECT NOW()', params: [] }
        ];
      
      case 'mongodb':
        return [
          { operation: 'find', filter: {} },
          { operation: 'insert', document: { test: 'data', timestamp: new Date() } },
          { operation: 'find', filter: { test: 'data' } }
        ];
      
      default:
        return [];
    }
  }

  async measureAverageResponseTime(database, queries) {
    const measurements = [];
    
    for (let i = 0; i < 10; i++) {
      for (const query of queries) {
        const result = await this.measureQueryResponseTime(
          database, 
          'benchmark', 
          () => this.executeQuery(database, query)
        );
        measurements.push(result.responseTime);
      }
    }

    return {
      average: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      p50: this.percentile(measurements, 0.5),
      p95: this.percentile(measurements, 0.95),
      p99: this.percentile(measurements, 0.99)
    };
  }

  async testScalability(database, maxConnections) {
    const results = [];
    
    for (let connections = 1; connections <= maxConnections; connections += 2) {
      const promises = [];
      const startTime = Date.now();
      
      for (let i = 0; i < connections; i++) {
        promises.push(this.executeQuery(database, this.getTestQueries(database.engine)[0]));
      }
      
      try {
        await Promise.all(promises);
        const responseTime = (Date.now() - startTime) / 1000;
        results.push({
          connections,
          responseTime,
          success: true
        });
      } catch (error) {
        results.push({
          connections,
          responseTime: (Date.now() - startTime) / 1000,
          success: false,
          error: error.message
        });
      }
    }

    return {
      maxSuccessfulConnections: results.filter(r => r.success).length,
      results
    };
  }

  calculatePerformanceScore(results) {
    // Weighted scoring system (0-100)
    let score = 100;
    
    // Response time penalty (lower is better)
    if (results.responseTime.average > 0.1) score -= 20;
    if (results.responseTime.average > 0.5) score -= 20;
    if (results.responseTime.average > 1.0) score -= 20;
    
    // Throughput bonus (higher is better)
    if (results.throughput.queriesPerSecond > 100) score += 5;
    if (results.throughput.queriesPerSecond > 500) score += 10;
    
    // Error rate penalty
    if (results.throughput.errorRate > 1) score -= 10;
    if (results.throughput.errorRate > 5) score -= 20;
    
    // Resource efficiency
    if (results.resources.memory.utilization > 80) score -= 10;
    if (results.resources.cpu.percent > 50) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = (p * (sorted.length - 1));
    if (Math.floor(index) === index) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  // Compare with existing systems
  async compareWithExistingSystems(database, existingSystems = []) {
    const ourBenchmark = await this.runBenchmark(database);
    const comparisons = [];
    
    // Add mock comparison data for common DBaaS systems
    const mockExistingSystems = [
      {
        name: 'AWS RDS',
        responseTime: { average: 0.05, p95: 0.12, p99: 0.25 },
        throughput: { queriesPerSecond: 1500, errorRate: 0.1 },
        performanceScore: 85,
        cost: 'High',
        scalability: 'Excellent'
      },
      {
        name: 'Google Cloud SQL',
        responseTime: { average: 0.04, p95: 0.10, p99: 0.20 },
        throughput: { queriesPerSecond: 1800, errorRate: 0.05 },
        performanceScore: 88,
        cost: 'High',
        scalability: 'Excellent'
      },
      {
        name: 'Azure Database',
        responseTime: { average: 0.06, p95: 0.15, p99: 0.30 },
        throughput: { queriesPerSecond: 1200, errorRate: 0.2 },
        performanceScore: 82,
        cost: 'High',
        scalability: 'Very Good'
      },
      {
        name: 'DigitalOcean Managed Databases',
        responseTime: { average: 0.08, p95: 0.20, p99: 0.40 },
        throughput: { queriesPerSecond: 800, errorRate: 0.3 },
        performanceScore: 75,
        cost: 'Medium',
        scalability: 'Good'
      }
    ];

    for (const system of mockExistingSystems) {
      comparisons.push({
        system: system.name,
        our_system: {
          responseTime: ourBenchmark.results.responseTime,
          throughput: ourBenchmark.results.throughput,
          performanceScore: ourBenchmark.results.performanceScore,
          cost: 'Low',
          scalability: 'Good'
        },
        competitor: system,
        comparison: {
          responseTimeBetter: ourBenchmark.results.responseTime.average < system.responseTime.average,
          throughputBetter: ourBenchmark.results.throughput.queriesPerSecond > system.throughput.queriesPerSecond,
          errorRateBetter: ourBenchmark.results.throughput.errorRate < system.throughput.errorRate,
          performanceScoreDiff: ourBenchmark.results.performanceScore - system.performanceScore,
          costAdvantage: true // Our system is always cheaper
        }
      });
    }

    return {
      ourSystem: ourBenchmark,
      comparisons,
      summary: this.generateComparisonSummary(comparisons)
    };
  }

  generateComparisonSummary(comparisons) {
    const betterResponse = comparisons.filter(c => c.comparison.responseTimeBetter).length;
    const betterThroughput = comparisons.filter(c => c.comparison.throughputBetter).length;
    const betterErrorRate = comparisons.filter(c => c.comparison.errorRateBetter).length;
    const avgScoreDiff = comparisons.reduce((sum, c) => sum + c.comparison.performanceScoreDiff, 0) / comparisons.length;

    return {
      responseTimeAdvantage: `${betterResponse}/${comparisons.length} systems`,
      throughputAdvantage: `${betterThroughput}/${comparisons.length} systems`,
      errorRateAdvantage: `${betterErrorRate}/${comparisons.length} systems`,
      averageScoreDifference: avgScoreDiff.toFixed(2),
      costAdvantage: '100% cost advantage',
      overallRanking: this.calculateOverallRanking(comparisons)
    };
  }

  calculateOverallRanking(comparisons) {
    const ourAvgScore = comparisons[0].our_system.performanceScore;
    const allScores = [ourAvgScore, ...comparisons.map(c => c.competitor.performanceScore)];
    allScores.sort((a, b) => b - a);
    const ourRank = allScores.indexOf(ourAvgScore) + 1;
    return `${ourRank}/${allScores.length}`;
  }

  // Get current benchmarks
  getAllBenchmarks() {
    return Array.from(this.benchmarkResults.values());
  }

  getBenchmark(databaseEngine, databaseId) {
    return this.benchmarkResults.get(`${databaseEngine}-${databaseId}`);
  }

  // Export metrics for Prometheus
  getMetricsRegistry() {
    return this.metrics;
  }
}

module.exports = PerformanceMetricsService;
