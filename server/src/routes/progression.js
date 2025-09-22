/**
 * T023-T024: Progression API routes
 * Routes for user progression tracking and management
 */

const express = require('express');
const router = express.Router();
const ProgressionService = require('../services/ProgressionService');

/**
 * T023: GET /api/users/{userId}/progression
 * Get user progression data
 */
router.get('/users/:userId/progression', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Validate user ID
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    // Check if user exists
    const knex = require('../utils/database');
    const user = await knex('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const progression = await ProgressionService.getUserProgression(userId);

    res.json(progression);

  } catch (error) {
    console.error('Error getting user progression:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * T024: POST /api/users/{userId}/progression/update
 * Update user progression after session completion
 */
router.post('/users/:userId/progression/update', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Validate user ID
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    // Check if user exists
    const knex = require('../utils/database');
    const user = await knex('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Validate request body
    const sessionData = req.body;
    if (!sessionData) {
      return res.status(400).json({
        error: 'Session data is required'
      });
    }

    // Validate required fields
    const requiredFields = ['questionsAnswered', 'correctAnswers', 'sessionDuration'];
    for (const field of requiredFields) {
      if (sessionData[field] === undefined || sessionData[field] === null) {
        return res.status(400).json({
          error: `Missing required field: ${field}`
        });
      }
    }

    // Validate field values
    if (sessionData.questionsAnswered < 1) {
      return res.status(400).json({
        error: 'Questions answered must be at least 1'
      });
    }

    if (sessionData.correctAnswers < 0) {
      return res.status(400).json({
        error: 'Correct answers must be non-negative'
      });
    }

    if (sessionData.correctAnswers > sessionData.questionsAnswered) {
      return res.status(400).json({
        error: 'Correct answers cannot exceed total questions'
      });
    }

    if (sessionData.sessionDuration < 1) {
      return res.status(400).json({
        error: 'Session duration must be positive'
      });
    }

    // Optional field validation
    if (sessionData.startingDifficulty !== undefined) {
      if (sessionData.startingDifficulty < 0 || sessionData.startingDifficulty > 100) {
        return res.status(400).json({
          error: 'Starting difficulty must be between 0 and 100'
        });
      }
    }

    if (sessionData.averageCardDifficulty !== undefined) {
      if (sessionData.averageCardDifficulty < 0 || sessionData.averageCardDifficulty > 100) {
        return res.status(400).json({
          error: 'Average card difficulty must be between 0 and 100'
        });
      }
    }

    const result = await ProgressionService.updateProgression(userId, sessionData);

    res.json(result);

  } catch (error) {
    console.error('Error updating user progression:', error);

    // Return specific error messages for validation errors
    if (error.message.includes('must be') || error.message.includes('cannot exceed')) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * Test route
 */
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ message: 'Progression routes are working!' });
});

console.log('Progression routes file loaded - setting up routes');

/**
 * T027: GET /api/progression/levels
 * Get level progression information
 */
router.get('/levels', async (req, res) => {
  try {
    const levelProgression = await ProgressionService.getLevelProgression();
    res.json(levelProgression);

  } catch (error) {
    console.error('Error getting level progression:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/users/{userId}/progression/history
 * Get user progression history
 */
router.get('/users/:userId/progression/history', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const options = {
      limit: parseInt(req.query.limit) || 20,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    // Validate limit
    if (options.limit < 1 || options.limit > 100) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 100'
      });
    }

    const history = await ProgressionService.getProgressionHistory(userId, options);

    res.json(history);

  } catch (error) {
    console.error('Error getting progression history:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/users/{userId}/progression/stats
 * Get comprehensive progression statistics
 */
router.get('/users/:userId/progression/stats', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const stats = await ProgressionService.getProgressionStats(userId, options);

    if (!stats) {
      return res.status(404).json({
        error: 'User progression not found'
      });
    }

    res.json(stats);

  } catch (error) {
    console.error('Error getting progression stats:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/progression/leaderboard
 * Get progression leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 10,
      orderBy: req.query.orderBy || 'level'
    };

    // Validate options
    if (options.limit < 1 || options.limit > 50) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 50'
      });
    }

    if (!['level', 'xp'].includes(options.orderBy)) {
      return res.status(400).json({
        error: 'Order by must be "level" or "xp"'
      });
    }

    const leaderboard = await ProgressionService.getLeaderboard(options);

    res.json(leaderboard);

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/users/{userId}/progression/reset
 * Reset user progression (admin function)
 */
router.post('/users/:userId/progression/reset', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    // Note: In a real application, this would require admin authorization
    const result = await ProgressionService.resetProgression(userId);

    res.json(result);

  } catch (error) {
    console.error('Error resetting progression:', error);

    if (error.message === 'User progression not found') {
      return res.status(404).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/users/{userId}/progression/projection
 * Get progression projection
 */
router.get('/users/:userId/progression/projection', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const sessionsPerWeek = parseFloat(req.query.sessionsPerWeek) || 3;
    const avgAccuracy = parseFloat(req.query.avgAccuracy) || 0.7;

    // Validate parameters
    if (sessionsPerWeek < 0.1 || sessionsPerWeek > 50) {
      return res.status(400).json({
        error: 'Sessions per week must be between 0.1 and 50'
      });
    }

    if (avgAccuracy < 0 || avgAccuracy > 1) {
      return res.status(400).json({
        error: 'Average accuracy must be between 0 and 1'
      });
    }

    const projection = await ProgressionService.getProgressionProjection(
      userId,
      sessionsPerWeek,
      avgAccuracy
    );

    res.json(projection);

  } catch (error) {
    console.error('Error getting progression projection:', error);

    if (error.message === 'User progression not found') {
      return res.status(404).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;