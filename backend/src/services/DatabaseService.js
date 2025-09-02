const { Pool } = require('pg');
const k8s = require('@kubernetes/client-node');
const yaml = require('yaml');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    // Initialize Kubernetes client only in production
    if (process.env.NODE_ENV === 'production') {
      const kc = new k8s.KubeConfig();
      kc.loadFromCluster();
      this.k8sAppsV1Api = kc.makeApiClient(k8s.AppsV1Api);
      this.k8sCoreV1Api = kc.makeApiClient(k8s.CoreV1Api);
      this.useKubernetes = true;
    } else {
      // Development mode - use Docker containers
      this.useKubernetes = false;
      logger.info('Running in development mode - using Docker containers instead of Kubernetes');
    }
  }

  async getUserDatabases(userId) {
    try {
      const result = await this.pool.query(
        `SELECT d.*, p.name as project_name 
         FROM databases d 
         LEFT JOIN projects p ON d.project_id = p.id 
         WHERE d.user_id = $1 
         ORDER BY d.created_at DESC`,
        [userId]
      );
      
      return result.rows.map(this.formatDatabaseResponse);
    } catch (error) {
      logger.error('Get user databases error:', error);
      throw error;
    }
  }

  async getDatabaseById(id, userId) {
    try {
      const result = await this.pool.query(
        `SELECT d.*, p.name as project_name 
         FROM databases d 
         LEFT JOIN projects p ON d.project_id = p.id 
         WHERE d.id = $1 AND d.user_id = $2`,
        [id, userId]
      );
      
      return result.rows.length > 0 ? this.formatDatabaseResponse(result.rows[0]) : null;
    } catch (error) {
      logger.error('Get database by ID error:', error);
      throw error;
    }
  }

  async createDatabase(config) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert database record
      const dbResult = await client.query(
        `INSERT INTO databases (id, name, engine, version, storage_gb, cpu_cores, memory_mb, 
         replicas, user_id, project_id, status, k8s_namespace, k8s_deployment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'creating', $11, $12, NOW())
         RETURNING *`,
        [
          config.id,
          config.name,
          config.engine,
          config.version,
          config.storage,
          config.cpu,
          config.memory,
          config.replicas,
          config.userId,
          config.projectId || null,
          `dbaas-${config.userId}`,
          `${config.engine}-${config.id}`
        ]
      );

      const database = dbResult.rows[0];

      if (this.useKubernetes) {
        // Production: Create Kubernetes namespace if it doesn't exist
        await this.createNamespaceIfNotExists(`dbaas-${config.userId}`);
        // Deploy database to Kubernetes
        await this.deployDatabaseToK8s(database);
      } else {
        // Development: Simulate database deployment
        logger.info(`Development mode: Simulating ${config.engine} database deployment for ${config.name}`);
      }

      await client.query('COMMIT');
      
      // Update status to 'running' asynchronously
      setTimeout(async () => {
        try {
          await this.pool.query(
            'UPDATE databases SET status = $1 WHERE id = $2',
            ['running', config.id]
          );
          logger.info(`Database ${config.name} status updated to running`);
        } catch (error) {
          logger.error('Failed to update database status:', error);
        }
      }, 2000); // Reduced from 5000ms for faster development feedback

      return this.formatDatabaseResponse(database);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Create database error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteDatabase(id, userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const database = await this.getDatabaseById(id, userId);
      if (!database) {
        throw new Error('Database not found');
      }

      if (this.useKubernetes) {
        // Production: Delete from Kubernetes
        await this.deleteDatabaseFromK8s(database);
      } else {
        // Development: Simulate deletion
        logger.info(`Development mode: Simulating deletion of ${database.name} database`);
      }

      // Update status to 'deleting'
      await client.query(
        'UPDATE databases SET status = $1, deleted_at = NOW() WHERE id = $2',
        ['deleting', id]
      );

      await client.query('COMMIT');
      
      // Actually delete the record after cleanup
      setTimeout(async () => {
        try {
          await this.pool.query('DELETE FROM databases WHERE id = $1', [id]);
          logger.info(`Database ${database.name} deleted from records`);
        } catch (error) {
          logger.error('Failed to delete database record:', error);
        }
      }, 3000); // Reduced timeout for development

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Delete database error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async scaleDatabase(id, scaleConfig) {
    try {
      const database = await this.pool.query(
        'SELECT * FROM databases WHERE id = $1',
        [id]
      );

      if (database.rows.length === 0) {
        throw new Error('Database not found');
      }

      const db = database.rows[0];

      // Update database record
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (scaleConfig.cpu) {
        updateFields.push(`cpu_cores = $${paramIndex++}`);
        updateValues.push(scaleConfig.cpu);
      }
      if (scaleConfig.memory) {
        updateFields.push(`memory_mb = $${paramIndex++}`);
        updateValues.push(scaleConfig.memory);
      }
      if (scaleConfig.storage) {
        updateFields.push(`storage_gb = $${paramIndex++}`);
        updateValues.push(scaleConfig.storage);
      }
      if (scaleConfig.replicas) {
        updateFields.push(`replicas = $${paramIndex++}`);
        updateValues.push(scaleConfig.replicas);
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      const result = await this.pool.query(
        `UPDATE databases SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      // Update Kubernetes deployment
      await this.updateK8sDeployment(db, scaleConfig);

      return this.formatDatabaseResponse(result.rows[0]);
      
    } catch (error) {
      logger.error('Scale database error:', error);
      throw error;
    }
  }

  async generateConnectionUrl(database) {
    try {
      // Generate temporary credentials
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Create temporary user in the database (this would be done via K8s job)
      const tempUsername = `temp_${Date.now()}`;

      // Store temporary credentials
      await this.pool.query(
        `INSERT INTO temp_credentials (database_id, username, password_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [database.id, tempUsername, tempPassword, expiresAt]
      );

      let host, port, databaseName, username, password;
      
      if (this.useKubernetes) {
        // Production: Use Kubernetes service endpoint
        const serviceName = `${database.engine}-${database.id}`;
        const namespace = database.k8s_namespace;
        host = `${serviceName}.${namespace}.svc.cluster.local`;
        port = this.getDefaultPort(database.engine);
        databaseName = database.name;
        username = tempUsername;
        password = tempPassword;
      } else {
        // Development: Use Docker sample containers with default credentials
        host = 'localhost';
        port = this.getDockerPort(database.engine);
        
        // Use default credentials for sample containers
        if (database.engine === 'mysql') {
          databaseName = 'sample_db'; // Default database in mysql-sample
          username = 'root';
          password = 'mysql123';
        } else if (database.engine === 'postgresql') {
          databaseName = 'dbaas_platform'; // Use the main database
          username = 'postgres';
          password = 'postgres123'; // Use the configured password
        } else if (database.engine === 'mongodb') {
          databaseName = database.name;
          username = 'mongo';
          password = 'mongo123';
        }
      }

      return {
        host,
        port,
        database: databaseName,
        username,
        password,
        expiresAt,
        connectionString: this.buildConnectionString(database.engine, {
          host,
          port,
          database: databaseName,
          username,
          password
        })
      };
      
    } catch (error) {
      logger.error('Generate connection URL error:', error);
      throw error;
    }
  }

  async getK8sStatus(namespace, deploymentName) {
    try {
      if (!this.useKubernetes) {
        // Development mode: Return mock status
        return {
          replicas: 1,
          readyReplicas: 1,
          availableReplicas: 1,
          conditions: ['Available'],
          pods: [
            {
              name: `${deploymentName}-dev`,
              status: 'Running',
              ready: true
            }
          ]
        };
      }

      const deployment = await this.k8sAppsV1Api.readNamespacedDeployment(deploymentName, namespace);
      const pods = await this.k8sCoreV1Api.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${deploymentName}`
      );

      return {
        replicas: deployment.body.status.replicas || 0,
        readyReplicas: deployment.body.status.readyReplicas || 0,
        availableReplicas: deployment.body.status.availableReplicas || 0,
        pods: pods.body.items.map(pod => ({
          name: pod.metadata.name,
          status: pod.status.phase,
          ready: pod.status.conditions?.find(c => c.type === 'Ready')?.status === 'True',
          restarts: pod.status.containerStatuses?.[0]?.restartCount || 0
        }))
      };
    } catch (error) {
      logger.error('Get K8s status error:', error);
      return {
        replicas: 0,
        readyReplicas: 0,
        availableReplicas: 0,
        pods: []
      };
    }
  }

  async createNamespaceIfNotExists(namespaceName) {
    try {
      await this.k8sCoreV1Api.readNamespace(namespaceName);
    } catch (error) {
      if (error.response?.statusCode === 404) {
        const namespace = {
          metadata: {
            name: namespaceName,
            labels: {
              'app': 'dbaas-platform',
              'managed-by': 'dbaas-controller'
            }
          }
        };
        
        await this.k8sCoreV1Api.createNamespace(namespace);
        logger.info(`Created namespace: ${namespaceName}`);
      } else {
        throw error;
      }
    }
  }

  async deployDatabaseToK8s(database) {
    try {
      const namespace = database.k8s_namespace;
      const deploymentName = database.k8s_deployment;

      // Create ConfigMap for database configuration
      const configMap = this.createConfigMap(database);
      await this.k8sCoreV1Api.createNamespacedConfigMap(namespace, configMap);

      // Create PersistentVolumeClaim
      const pvc = this.createPVC(database);
      await this.k8sCoreV1Api.createNamespacedPersistentVolumeClaim(namespace, pvc);

      // Create Secret for credentials
      const secret = this.createSecret(database);
      await this.k8sCoreV1Api.createNamespacedSecret(namespace, secret);

      // Create Service
      const service = this.createService(database);
      await this.k8sCoreV1Api.createNamespacedService(namespace, service);

      // Create Deployment
      const deployment = this.createDeployment(database);
      await this.k8sAppsV1Api.createNamespacedDeployment(namespace, deployment);

      logger.info(`Deployed ${database.engine} database to K8s: ${deploymentName}`);
      
    } catch (error) {
      logger.error('Deploy to K8s error:', error);
      throw error;
    }
  }

  async deleteDatabaseFromK8s(database) {
    try {
      const namespace = database.k8s_namespace;
      const deploymentName = database.k8s_deployment;

      // Delete in reverse order
      await this.k8sAppsV1Api.deleteNamespacedDeployment(deploymentName, namespace);
      await this.k8sCoreV1Api.deleteNamespacedService(deploymentName, namespace);
      await this.k8sCoreV1Api.deleteNamespacedSecret(`${deploymentName}-secret`, namespace);
      await this.k8sCoreV1Api.deleteNamespacedPersistentVolumeClaim(`${deploymentName}-pvc`, namespace);
      await this.k8sCoreV1Api.deleteNamespacedConfigMap(`${deploymentName}-config`, namespace);

      logger.info(`Deleted K8s resources for database: ${deploymentName}`);
      
    } catch (error) {
      logger.error('Delete from K8s error:', error);
      throw error;
    }
  }

  createDeployment(database) {
    const { engine, k8s_deployment: name, cpu_cores, memory_mb, replicas } = database;
    
    const images = {
      mysql: 'mysql:8.0',
      postgresql: 'postgres:15',
      mongodb: 'mongo:6.0'
    };

    return {
      metadata: {
        name,
        labels: {
          app: name,
          engine,
          'managed-by': 'dbaas-platform'
        }
      },
      spec: {
        replicas,
        selector: {
          matchLabels: { app: name }
        },
        template: {
          metadata: {
            labels: { app: name, engine }
          },
          spec: {
            containers: [{
              name: engine,
              image: images[engine],
              ports: [{ containerPort: this.getDefaultPort(engine) }],
              env: this.getEnvVars(database),
              resources: {
                requests: {
                  memory: `${memory_mb}Mi`,
                  cpu: `${cpu_cores * 1000}m`
                },
                limits: {
                  memory: `${memory_mb * 1.5}Mi`,
                  cpu: `${cpu_cores * 1.2 * 1000}m`
                }
              },
              volumeMounts: [{
                name: 'data',
                mountPath: this.getDataPath(engine)
              }]
            }],
            volumes: [{
              name: 'data',
              persistentVolumeClaim: {
                claimName: `${name}-pvc`
              }
            }]
          }
        }
      }
    };
  }

  createService(database) {
    const { k8s_deployment: name, engine } = database;
    
    return {
      metadata: {
        name,
        labels: {
          app: name,
          engine
        }
      },
      spec: {
        selector: { app: name },
        ports: [{
          port: this.getDefaultPort(engine),
          targetPort: this.getDefaultPort(engine)
        }],
        type: 'ClusterIP'
      }
    };
  }

  createPVC(database) {
    const { k8s_deployment: name, storage_gb } = database;
    
    return {
      metadata: {
        name: `${name}-pvc`,
        labels: {
          app: name
        }
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: `${storage_gb}Gi`
          }
        }
      }
    };
  }

  createSecret(database) {
    const { k8s_deployment: name } = database;
    const password = crypto.randomBytes(16).toString('hex');
    
    return {
      metadata: {
        name: `${name}-secret`,
        labels: {
          app: name
        }
      },
      type: 'Opaque',
      data: {
        password: Buffer.from(password).toString('base64'),
        rootPassword: Buffer.from(password).toString('base64')
      }
    };
  }

  createConfigMap(database) {
    const { k8s_deployment: name, engine } = database;
    
    const configs = {
      mysql: {
        'my.cnf': `
[mysqld]
bind-address = 0.0.0.0
max_connections = 200
innodb_buffer_pool_size = 128M
`
      },
      postgresql: {
        'postgresql.conf': `
listen_addresses = '*'
max_connections = 100
shared_buffers = 128MB
`
      },
      mongodb: {
        'mongod.conf': `
net:
  bindIp: 0.0.0.0
  port: 27017
storage:
  dbPath: /data/db
`
      }
    };

    return {
      metadata: {
        name: `${name}-config`,
        labels: {
          app: name
        }
      },
      data: configs[engine] || {}
    };
  }

  getEnvVars(database) {
    const { engine, name, k8s_deployment } = database;
    
    const envVars = {
      mysql: [
        { name: 'MYSQL_DATABASE', value: name },
        { name: 'MYSQL_ROOT_PASSWORD', valueFrom: { secretKeyRef: { name: `${k8s_deployment}-secret`, key: 'rootPassword' } }}
      ],
      postgresql: [
        { name: 'POSTGRES_DB', value: name },
        { name: 'POSTGRES_PASSWORD', valueFrom: { secretKeyRef: { name: `${k8s_deployment}-secret`, key: 'password' } }}
      ],
      mongodb: [
        { name: 'MONGO_INITDB_DATABASE', value: name },
        { name: 'MONGO_INITDB_ROOT_PASSWORD', valueFrom: { secretKeyRef: { name: `${k8s_deployment}-secret`, key: 'rootPassword' } }}
      ]
    };

    return envVars[engine] || [];
  }

  getDefaultPort(engine) {
    const ports = {
      mysql: 3306,
      postgresql: 5432,
      mongodb: 27017
    };
    return ports[engine] || 5432;
  }

  getDockerPort(engine) {
    // Docker host ports for development environment
    const ports = {
      mysql: 3306,        // mysql-sample container port
      postgresql: 5432,   // postgres container port  
      mongodb: 27017      // mongo-sample container port
    };
    return ports[engine] || 5432;
  }

  getDataPath(engine) {
    const paths = {
      mysql: '/var/lib/mysql',
      postgresql: '/var/lib/postgresql/data',
      mongodb: '/data/db'
    };
    return paths[engine] || '/data';
  }

  buildConnectionString(engine, config) {
    const { host, port, database, username, password } = config;
    
    const connectionStrings = {
      mysql: `mysql://${username}:${password}@${host}:${port}/${database}`,
      postgresql: `postgresql://${username}:${password}@${host}:${port}/${database}`,
      mongodb: `mongodb://${username}:${password}@${host}:${port}/${database}`
    };

    return connectionStrings[engine] || '';
  }

  formatDatabaseResponse(db) {
    return {
      id: db.id,
      name: db.name,
      engine: db.engine,
      version: db.version,
      status: db.status,
      storage: db.storage_gb,
      cpu: db.cpu_cores,
      memory: db.memory_mb,
      replicas: db.replicas,
      projectName: db.project_name,
      createdAt: db.created_at,
      updatedAt: db.updated_at
    };
  }
}

module.exports = DatabaseService;
