/**
 * T025-T026: Cards difficulty API routes
 * Routes for card difficulty management and filtering
 */

const express = require('express');
const router = express.Router();
const DifficultyService = require('../services/DifficultyService');

/**
 * T025: GET /api/decks/{deckId}/cards/by-difficulty
 * Get cards filtered by difficulty level
 */
router.get('/decks/:deckId/cards/by-difficulty', async (req, res) => {
  try {
    const deckId = parseInt(req.params.deckId);

    // Validate deck ID
    if (isNaN(deckId) || deckId <= 0) {
      return res.status(400).json({
        error: 'Invalid deck ID'
      });
    }

    // Parse query parameters
    const options = {};

    if (req.query.minDifficulty !== undefined) {
      options.minDifficulty = parseInt(req.query.minDifficulty);
      if (isNaN(options.minDifficulty)) {
        return res.status(400).json({
          error: 'Invalid minimum difficulty value'
        });
      }
    }

    if (req.query.maxDifficulty !== undefined) {
      options.maxDifficulty = parseInt(req.query.maxDifficulty);
      if (isNaN(options.maxDifficulty)) {
        return res.status(400).json({
          error: 'Invalid maximum difficulty value'
        });
      }
    }

    if (req.query.limit !== undefined) {
      options.limit = parseInt(req.query.limit);
      if (isNaN(options.limit)) {
        return res.status(400).json({
          error: 'Invalid limit value'
        });
      }
    }

    // Validate difficulty range
    if (options.minDifficulty !== undefined && options.maxDifficulty !== undefined) {
      if (options.minDifficulty > options.maxDifficulty) {
        return res.status(400).json({
          error: 'Minimum difficulty cannot exceed maximum difficulty'
        });
      }
    }

    // Validate limit range
    if (options.limit !== undefined && (options.limit < 1 || options.limit > 100)) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 100'
      });
    }

    const cards = await DifficultyService.getCardsByDifficulty(deckId, options);

    res.json(cards);

  } catch (error) {
    console.error('Error getting cards by difficulty:', error);

    if (error.message === 'Deck not found') {
      return res.status(404).json({
        error: 'Deck not found'
      });
    }

    if (error.message.includes('must be between')) {
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
 * T026: GET /api/cards/{cardId}/difficulty
 * Get difficulty score for a specific card
 */
router.get('/cards/:cardId/difficulty', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);

    // Validate card ID
    if (isNaN(cardId) || cardId <= 0) {
      return res.status(400).json({
        error: 'Invalid card ID'
      });
    }

    const difficulty = await DifficultyService.getCardDifficulty(cardId);

    res.json(difficulty);

  } catch (error) {
    console.error('Error getting card difficulty:', error);

    if (error.message === 'Card not found') {
      return res.status(404).json({
        error: 'Card not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/decks/{deckId}/cards/calculate-difficulties
 * Calculate or recalculate difficulty for cards in a deck
 */
router.post('/decks/:deckId/cards/calculate-difficulties', async (req, res) => {
  try {
    const deckId = parseInt(req.params.deckId);

    // Validate deck ID
    if (isNaN(deckId) || deckId <= 0) {
      return res.status(400).json({
        error: 'Invalid deck ID'
      });
    }

    const options = {
      force: req.body.force === true
    };

    const result = await DifficultyService.calculateDeckDifficulties(deckId, options);

    res.json(result);

  } catch (error) {
    console.error('Error calculating deck difficulties:', error);

    if (error.message === 'Deck not found') {
      return res.status(404).json({
        error: 'Deck not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/decks/{deckId}/difficulty-stats
 * Get difficulty statistics for a deck
 */
router.get('/decks/:deckId/difficulty-stats', async (req, res) => {
  try {
    const deckId = parseInt(req.params.deckId);

    // Validate deck ID
    if (isNaN(deckId) || deckId <= 0) {
      return res.status(400).json({
        error: 'Invalid deck ID'
      });
    }

    const stats = await DifficultyService.getDeckDifficultyStats(deckId);

    res.json(stats);

  } catch (error) {
    console.error('Error getting deck difficulty stats:', error);

    if (error.message === 'Deck not found') {
      return res.status(404).json({
        error: 'Deck not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/decks/{deckId}/cards/for-user/{userId}
 * Get cards suitable for user's progression level
 */
router.get('/decks/:deckId/cards/for-user/:userId', async (req, res) => {
  try {
    const deckId = parseInt(req.params.deckId);
    const userId = parseInt(req.params.userId);

    // Validate IDs
    if (isNaN(deckId) || deckId <= 0) {
      return res.status(400).json({
        error: 'Invalid deck ID'
      });
    }

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID'
      });
    }

    // Get user progression
    const ProgressionService = require('../services/ProgressionService');
    const userProgression = await ProgressionService.getUserProgression(userId);

    const options = {
      limit: parseInt(req.query.limit) || 20,
      variance: parseInt(req.query.variance) || 5
    };

    // Validate options
    if (options.limit < 1 || options.limit > 100) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 100'
      });
    }

    if (options.variance < 0 || options.variance > 50) {
      return res.status(400).json({
        error: 'Variance must be between 0 and 50'
      });
    }

    const cards = await DifficultyService.getCardsForUserLevel(deckId, userProgression, options);

    res.json(cards);

  } catch (error) {
    console.error('Error getting cards for user level:', error);

    if (error.message === 'Deck not found') {
      return res.status(404).json({
        error: 'Deck not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/cards/{cardId}/difficulty
 * Update difficulty for a specific card
 */
router.put('/cards/:cardId/difficulty', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);

    // Validate card ID
    if (isNaN(cardId) || cardId <= 0) {
      return res.status(400).json({
        error: 'Invalid card ID'
      });
    }

    const difficultyData = req.body;

    // Validate required fields
    const requiredFields = ['vocabularyScore', 'grammarScore', 'lengthScore', 'typeScore', 'totalDifficulty'];
    for (const field of requiredFields) {
      if (difficultyData[field] === undefined || difficultyData[field] === null) {
        return res.status(400).json({
          error: `Missing required field: ${field}`
        });
      }
    }

    const updatedDifficulty = await DifficultyService.updateCardDifficulty(cardId, difficultyData);

    res.json(updatedDifficulty);

  } catch (error) {
    console.error('Error updating card difficulty:', error);

    if (error.message === 'Card not found') {
      return res.status(404).json({
        error: 'Card not found'
      });
    }

    if (error.message.includes('must be between') || error.message.includes('must equal')) {
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
 * DELETE /api/cards/{cardId}/difficulty
 * Delete difficulty data for a card
 */
router.delete('/cards/:cardId/difficulty', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);

    // Validate card ID
    if (isNaN(cardId) || cardId <= 0) {
      return res.status(400).json({
        error: 'Invalid card ID'
      });
    }

    const deleted = await DifficultyService.deleteCardDifficulty(cardId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Card difficulty not found'
      });
    }

    res.json({
      success: true,
      message: 'Card difficulty deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting card difficulty:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/cards/difficulties/batch-update
 * Batch update difficulties for multiple cards
 */
router.post('/cards/difficulties/batch-update', async (req, res) => {
  try {
    const updates = req.body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        error: 'Updates array is required and must not be empty'
      });
    }

    if (updates.length > 100) {
      return res.status(400).json({
        error: 'Batch size cannot exceed 100 updates'
      });
    }

    // Validate each update
    for (const update of updates) {
      if (!update.cardId || !update.difficultyData) {
        return res.status(400).json({
          error: 'Each update must have cardId and difficultyData'
        });
      }
    }

    const result = await DifficultyService.batchUpdateDifficulties(updates);

    res.json(result);

  } catch (error) {
    console.error('Error batch updating difficulties:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/difficulty-trends
 * Get difficulty trends across all decks
 */
router.get('/difficulty-trends', async (req, res) => {
  try {
    const trends = await DifficultyService.getDifficultyTrends();
    res.json(trends);

  } catch (error) {
    console.error('Error getting difficulty trends:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/recalculate-all-difficulties
 * Recalculate all difficulties (admin function)
 */
router.post('/recalculate-all-difficulties', async (req, res) => {
  try {
    const options = {
      deckId: req.body.deckId,
      limit: req.body.limit
    };

    const result = await DifficultyService.recalculateAllDifficulties(options);

    res.json(result);

  } catch (error) {
    console.error('Error recalculating all difficulties:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;