const { Pool } = require('pg');
const logger = require('../utils/logger');

class ProjectService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }

  async getUserProjects(userId) {
    try {
      const result = await this.pool.query(
        `SELECT p.*, 
         COUNT(d.id) as database_count,
         MAX(d.created_at) as last_database_created
         FROM projects p 
         LEFT JOIN databases d ON p.id = d.project_id 
         WHERE p.user_id = $1 
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [userId]
      );
      
      return result.rows.map(this.formatProjectResponse);
    } catch (error) {
      logger.error('Get user projects error:', error);
      throw error;
    }
  }

  async getProjectById(id, userId) {
    try {
      const result = await this.pool.query(
        `SELECT p.*,
         COUNT(d.id) as database_count,
         MAX(d.created_at) as last_database_created
         FROM projects p 
         LEFT JOIN databases d ON p.id = d.project_id 
         WHERE p.id = $1 AND p.user_id = $2
         GROUP BY p.id`,
        [id, userId]
      );
      
      return result.rows.length > 0 ? this.formatProjectResponse(result.rows[0]) : null;
    } catch (error) {
      logger.error('Get project by ID error:', error);
      throw error;
    }
  }

  async createProject(projectData) {
    try {
      const result = await this.pool.query(
        `INSERT INTO projects (id, name, description, tags, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [
          projectData.id,
          projectData.name,
          projectData.description || null,
          JSON.stringify(projectData.tags || []),
          projectData.userId
        ]
      );

      return this.formatProjectResponse(result.rows[0]);
    } catch (error) {
      logger.error('Create project error:', error);
      throw error;
    }
  }

  async updateProject(id, updateData) {
    try {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updateData.name) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updateData.description);
      }
      if (updateData.tags) {
        updateFields.push(`tags = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updateData.tags));
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);

      const result = await this.pool.query(
        `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        updateValues
      );

      return this.formatProjectResponse(result.rows[0]);
    } catch (error) {
      logger.error('Update project error:', error);
      throw error;
    }
  }

  async deleteProject(id, userId) {
    try {
      await this.pool.query(
        'DELETE FROM projects WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    } catch (error) {
      logger.error('Delete project error:', error);
      throw error;
    }
  }

  async getProjectDatabases(projectId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM databases WHERE project_id = $1 ORDER BY created_at DESC',
        [projectId]
      );
      
      return result.rows.map(db => ({
        id: db.id,
        name: db.name,
        engine: db.engine,
        status: db.status,
        createdAt: db.created_at
      }));
    } catch (error) {
      logger.error('Get project databases error:', error);
      throw error;
    }
  }

  async getProjectStats(projectId) {
    try {
      const result = await this.pool.query(
        `SELECT 
         COUNT(*) as total_databases,
         COUNT(CASE WHEN status = 'running' THEN 1 END) as running_databases,
         COUNT(CASE WHEN status = 'creating' THEN 1 END) as creating_databases,
         COUNT(CASE WHEN status = 'error' THEN 1 END) as error_databases,
         SUM(storage_gb) as total_storage,
         SUM(cpu_cores) as total_cpu,
         SUM(memory_mb) as total_memory,
         AVG(cpu_cores) as avg_cpu,
         AVG(memory_mb) as avg_memory
         FROM databases 
         WHERE project_id = $1`,
        [projectId]
      );

      const stats = result.rows[0];
      
      return {
        totalDatabases: parseInt(stats.total_databases),
        runningDatabases: parseInt(stats.running_databases),
        creatingDatabases: parseInt(stats.creating_databases),
        errorDatabases: parseInt(stats.error_databases),
        totalStorage: parseFloat(stats.total_storage) || 0,
        totalCpu: parseFloat(stats.total_cpu) || 0,
        totalMemory: parseFloat(stats.total_memory) || 0,
        avgCpu: parseFloat(stats.avg_cpu) || 0,
        avgMemory: parseFloat(stats.avg_memory) || 0
      };
    } catch (error) {
      logger.error('Get project stats error:', error);
      throw error;
    }
  }

  formatProjectResponse(project) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      tags: typeof project.tags === 'string' ? JSON.parse(project.tags) : project.tags,
      databaseCount: parseInt(project.database_count) || 0,
      lastDatabaseCreated: project.last_database_created,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    };
  }
}

module.exports = ProjectService;
