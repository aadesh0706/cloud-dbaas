const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const ProjectService = require('../services/ProjectService');
const logger = require('../utils/logger');

const router = express.Router();
const projectService = new ProjectService();

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string().max(20)).max(10).optional()
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(50),
  description: Joi.string().max(500),
  tags: Joi.array().items(Joi.string().max(20)).max(10)
});

// Get all projects for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const projects = await projectService.getUserProjects(userId);
    
    res.json({
      projects,
      total: projects.length
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve projects'
    });
  }
});

// Get specific project details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const project = await projectService.getProjectById(id, userId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project Not Found',
        message: 'Project does not exist or access denied'
      });
    }

    // Get project databases
    const databases = await projectService.getProjectDatabases(id);
    
    res.json({
      project: {
        ...project,
        databases,
        databaseCount: databases.length
      }
    });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve project details'
    });
  }
});

// Create new project
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Validate input
    const { error, value } = createProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const userId = req.user.userId;
    const projectData = {
      ...value,
      userId,
      id: uuidv4()
    };

    // Check user's project quota
    const userProjects = await projectService.getUserProjects(userId);
    const maxProjects = process.env.MAX_PROJECTS_PER_USER || 10;
    
    if (userProjects.length >= maxProjects) {
      return res.status(403).json({
        error: 'Quota Exceeded',
        message: `Maximum ${maxProjects} projects allowed per user`
      });
    }

    const project = await projectService.createProject(projectData);
    
    logger.info(`Project created: ${project.name} for user ${userId}`);
    
    res.status(201).json({
      message: 'Project created successfully',
      project
    });

  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create project'
    });
  }
});

// Update project
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Validate input
    const { error, value } = updateProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const project = await projectService.getProjectById(id, userId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project Not Found',
        message: 'Project does not exist or access denied'
      });
    }

    const updatedProject = await projectService.updateProject(id, value);
    
    logger.info(`Project updated: ${project.name} by user ${userId}`);
    
    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });

  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update project'
    });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const project = await projectService.getProjectById(id, userId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project Not Found',
        message: 'Project does not exist or access denied'
      });
    }

    // Check if project has databases
    const databases = await projectService.getProjectDatabases(id);
    if (databases.length > 0) {
      return res.status(400).json({
        error: 'Project Has Dependencies',
        message: 'Cannot delete project with active databases. Please delete all databases first.'
      });
    }

    await projectService.deleteProject(id, userId);
    
    logger.info(`Project deleted: ${project.name} by user ${userId}`);
    
    res.json({
      message: 'Project deleted successfully',
      id
    });

  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete project'
    });
  }
});

// Get project statistics
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const project = await projectService.getProjectById(id, userId);
    
    if (!project) {
      return res.status(404).json({
        error: 'Project Not Found',
        message: 'Project does not exist or access denied'
      });
    }

    const stats = await projectService.getProjectStats(id);
    
    res.json({
      projectId: id,
      stats
    });

  } catch (error) {
    logger.error('Get project stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve project statistics'
    });
  }
});

module.exports = router;
