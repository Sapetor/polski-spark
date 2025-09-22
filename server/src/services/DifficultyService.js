/**
 * T022: DifficultyService for card scoring and filtering
 * Service layer for card difficulty management and filtering
 */

const CardDifficulty = require('../models/CardDifficulty');
const knex = require('../utils/database');

class DifficultyService {
  /**
   * Get cards filtered by difficulty range
   * @param {number} deckId - Deck ID
   * @param {Object} options - Filter options
   * @returns {Array} Filtered cards with difficulty data
   */
  static async getCardsByDifficulty(deckId, options = {}) {
    try {
      // Validate deck exists
      const deck = await knex('decks').where('id', deckId).first();
      if (!deck) {
        throw new Error('Deck not found');
      }

      // Validate filter parameters
      DifficultyService.validateFilterOptions(options);

      // Set default options
      const filterOptions = {
        minDifficulty: options.minDifficulty,
        maxDifficulty: options.maxDifficulty,
        limit: Math.min(options.limit || 20, 100), // Cap at 100
        orderBy: options.orderBy || 'card_difficulty.total_difficulty',
        order: options.order || 'asc'
      };

      const cards = await CardDifficulty.getCardsByDifficultyRange(deckId, filterOptions);

      return cards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        type: card.type,
        difficulty: card.difficulty.toJSON()
      }));

    } catch (error) {
      console.error('Error getting cards by difficulty:', error);
      throw error;
    }
  }

  /**
   * Get difficulty data for a specific card
   * @param {number} cardId - Card ID
   * @returns {Object} Card difficulty data
   */
  static async getCardDifficulty(cardId) {
    try {
      // Validate card exists
      const card = await knex('cards').where('id', cardId).first();
      if (!card) {
        throw new Error('Card not found');
      }

      // Get difficulty data
      let difficulty = await CardDifficulty.findByCardId(cardId);

      // If no difficulty calculated, calculate it now
      if (!difficulty) {
        difficulty = await CardDifficulty.createOrUpdate(cardId, card);
      }

      return difficulty.toJSON();

    } catch (error) {
      console.error('Error getting card difficulty:', error);
      throw error;
    }
  }

  /**
   * Calculate or recalculate difficulty for cards in a deck
   * @param {number} deckId - Deck ID
   * @param {Object} options - Calculation options
   * @returns {Object} Calculation results
   */
  static async calculateDeckDifficulties(deckId, options = {}) {
    try {
      // Validate deck exists
      const deck = await knex('decks').where('id', deckId).first();
      if (!deck) {
        throw new Error('Deck not found');
      }

      const forceRecalculate = options.force || false;
      let processed = 0;
      let skipped = 0;
      let errors = 0;

      // Get cards that need difficulty calculation
      let query = knex('cards')
        .leftJoin('card_difficulty', 'cards.id', 'card_difficulty.card_id')
        .where('cards.deck_id', deckId)
        .select('cards.id', 'cards.front', 'cards.back', 'cards.type', 'card_difficulty.id as difficulty_id');

      if (!forceRecalculate) {
        query = query.whereNull('card_difficulty.id');
      }

      const cards = await query;

      for (const card of cards) {
        try {
          if (!forceRecalculate && card.difficulty_id) {
            skipped++;
            continue;
          }

          await CardDifficulty.createOrUpdate(card.id, {
            front: card.front,
            back: card.back,
            type: card.type
          });

          processed++;
        } catch (error) {
          console.error(`Error calculating difficulty for card ${card.id}:`, error);
          errors++;
        }
      }

      return {
        deckId,
        totalCards: cards.length,
        processed,
        skipped,
        errors,
        success: errors === 0
      };

    } catch (error) {
      console.error('Error calculating deck difficulties:', error);
      throw error;
    }
  }

  /**
   * Get difficulty statistics for a deck
   * @param {number} deckId - Deck ID
   * @returns {Object} Comprehensive difficulty statistics
   */
  static async getDeckDifficultyStats(deckId) {
    try {
      // Validate deck exists
      const deck = await knex('decks').where('id', deckId).first();
      if (!deck) {
        throw new Error('Deck not found');
      }

      const [stats, distribution] = await Promise.all([
        CardDifficulty.getDeckDifficultyStats(deckId),
        CardDifficulty.getDifficultyDistribution(deckId)
      ]);

      return {
        deckId,
        deckName: deck.name,
        ...stats,
        distribution
      };

    } catch (error) {
      console.error('Error getting deck difficulty stats:', error);
      throw error;
    }
  }

  /**
   * Get cards suitable for user's progression level
   * @param {number} deckId - Deck ID
   * @param {Object} userProgression - User progression data
   * @param {Object} options - Additional options
   * @returns {Array} Cards appropriate for user level
   */
  static async getCardsForUserLevel(deckId, userProgression, options = {}) {
    try {
      const difficultyRange = userProgression.difficultyRange || { min: 0, max: 25 };

      // Add some randomization to avoid monotony
      const variance = options.variance || 5;
      const minDifficulty = Math.max(0, difficultyRange.min - variance);
      const maxDifficulty = Math.min(100, difficultyRange.max + variance);

      const filterOptions = {
        minDifficulty,
        maxDifficulty,
        limit: options.limit || 20,
        orderBy: 'RANDOM()', // Randomize card selection
        order: 'asc'
      };

      return await DifficultyService.getCardsByDifficulty(deckId, filterOptions);

    } catch (error) {
      console.error('Error getting cards for user level:', error);
      throw error;
    }
  }

  /**
   * Update difficulty for a specific card
   * @param {number} cardId - Card ID
   * @param {Object} difficultyData - Manual difficulty override
   * @returns {Object} Updated difficulty data
   */
  static async updateCardDifficulty(cardId, difficultyData) {
    try {
      // Validate card exists
      const card = await knex('cards').where('id', cardId).first();
      if (!card) {
        throw new Error('Card not found');
      }

      // Validate difficulty data
      CardDifficulty.validate(difficultyData);

      // Get existing difficulty or create new one
      let difficulty = await CardDifficulty.findByCardId(cardId);

      if (difficulty) {
        await difficulty.update(difficultyData);
      } else {
        // Create new difficulty record
        await knex('card_difficulty').insert({
          card_id: cardId,
          vocabulary_score: difficultyData.vocabularyScore,
          grammar_score: difficultyData.grammarScore,
          length_score: difficultyData.lengthScore,
          type_score: difficultyData.typeScore,
          total_difficulty: difficultyData.totalDifficulty,
          created_at: new Date(),
          updated_at: new Date()
        });

        difficulty = await CardDifficulty.findByCardId(cardId);
      }

      return difficulty.toJSON();

    } catch (error) {
      console.error('Error updating card difficulty:', error);
      throw error;
    }
  }

  /**
   * Batch update difficulties for multiple cards
   * @param {Array} updates - Array of {cardId, difficultyData} objects
   * @returns {Object} Batch update results
   */
  static async batchUpdateDifficulties(updates) {
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (const update of updates) {
      try {
        await DifficultyService.updateCardDifficulty(update.cardId, update.difficultyData);
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          cardId: update.cardId,
          error: error.message
        });
      }
    }

    return {
      total: updates.length,
      successful,
      failed,
      errors
    };
  }

  /**
   * Get difficulty trends across all decks
   * @param {Object} options - Query options
   * @returns {Object} Difficulty trend analysis
   */
  static async getDifficultyTrends(options = {}) {
    try {
      const stats = await knex('card_difficulty')
        .join('cards', 'card_difficulty.card_id', 'cards.id')
        .join('decks', 'cards.deck_id', 'decks.id')
        .select(
          'decks.id as deck_id',
          'decks.name as deck_name',
          knex.raw('COUNT(*) as total_cards'),
          knex.raw('AVG(card_difficulty.total_difficulty) as avg_difficulty'),
          knex.raw('MIN(card_difficulty.total_difficulty) as min_difficulty'),
          knex.raw('MAX(card_difficulty.total_difficulty) as max_difficulty')
        )
        .groupBy('decks.id', 'decks.name')
        .orderBy('avg_difficulty', 'desc');

      return {
        deckStats: stats.map(stat => ({
          deckId: stat.deck_id,
          deckName: stat.deck_name,
          totalCards: parseInt(stat.total_cards),
          avgDifficulty: parseFloat(stat.avg_difficulty),
          minDifficulty: parseInt(stat.min_difficulty),
          maxDifficulty: parseInt(stat.max_difficulty)
        }))
      };

    } catch (error) {
      console.error('Error getting difficulty trends:', error);
      throw error;
    }
  }

  /**
   * Validate filter options
   * @param {Object} options - Options to validate
   * @throws {Error} If validation fails
   */
  static validateFilterOptions(options) {
    if (options.minDifficulty !== undefined) {
      if (options.minDifficulty < 0 || options.minDifficulty > 100) {
        throw new Error('Minimum difficulty must be between 0 and 100');
      }
    }

    if (options.maxDifficulty !== undefined) {
      if (options.maxDifficulty < 0 || options.maxDifficulty > 100) {
        throw new Error('Maximum difficulty must be between 0 and 100');
      }
    }

    if (options.minDifficulty !== undefined && options.maxDifficulty !== undefined) {
      if (options.minDifficulty > options.maxDifficulty) {
        throw new Error('Minimum difficulty cannot exceed maximum difficulty');
      }
    }

    if (options.limit !== undefined) {
      if (options.limit < 1 || options.limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
    }
  }

  /**
   * Delete difficulty data for a card
   * @param {number} cardId - Card ID
   * @returns {boolean} Success status
   */
  static async deleteCardDifficulty(cardId) {
    try {
      const difficulty = await CardDifficulty.findByCardId(cardId);

      if (!difficulty) {
        return false; // Already doesn't exist
      }

      return await difficulty.delete();

    } catch (error) {
      console.error('Error deleting card difficulty:', error);
      throw error;
    }
  }

  /**
   * Recalculate all difficulties (maintenance function)
   * @param {Object} options - Calculation options
   * @returns {Object} Recalculation results
   */
  static async recalculateAllDifficulties(options = {}) {
    try {
      return await CardDifficulty.recalculateAll(options);
    } catch (error) {
      console.error('Error recalculating all difficulties:', error);
      throw error;
    }
  }
}

module.exports = DifficultyService;