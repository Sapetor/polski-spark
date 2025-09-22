/**
 * T020: CardDifficulty model
 * Model for card difficulty scoring and management
 */

const knex = require('../utils/database');
const { calculateCardDifficulty } = require('../utils/progressionCalculator');

class CardDifficulty {
  constructor(data) {
    this.id = data.id;
    this.cardId = data.card_id;
    this.vocabularyScore = data.vocabulary_score;
    this.grammarScore = data.grammar_score;
    this.lengthScore = data.length_score;
    this.typeScore = data.type_score;
    this.totalDifficulty = data.total_difficulty;
    this.calculatedAt = data.calculated_at || data.created_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Find difficulty by card ID
   * @param {number} cardId - Card ID
   * @returns {CardDifficulty|null} Difficulty instance or null
   */
  static async findByCardId(cardId) {
    const data = await knex('card_difficulty')
      .where('card_id', cardId)
      .first();

    return data ? new CardDifficulty(data) : null;
  }

  /**
   * Create or update difficulty for a card
   * @param {number} cardId - Card ID
   * @param {Object} card - Card data with front, back, type
   * @returns {CardDifficulty} Difficulty instance
   */
  static async createOrUpdate(cardId, card) {
    const difficulty = calculateCardDifficulty(card);

    // Check if difficulty already exists
    const existing = await CardDifficulty.findByCardId(cardId);

    if (existing) {
      // Update existing record
      await knex('card_difficulty')
        .where('card_id', cardId)
        .update({
          vocabulary_score: difficulty.vocabularyScore,
          grammar_score: difficulty.grammarScore,
          length_score: difficulty.lengthScore,
          type_score: difficulty.typeScore,
          total_difficulty: difficulty.totalDifficulty,
          updated_at: new Date()
        });

      const updated = await knex('card_difficulty').where('card_id', cardId).first();
      return new CardDifficulty(updated);
    } else {
      // Create new record
      const [id] = await knex('card_difficulty').insert({
        card_id: cardId,
        vocabulary_score: difficulty.vocabularyScore,
        grammar_score: difficulty.grammarScore,
        length_score: difficulty.lengthScore,
        type_score: difficulty.typeScore,
        total_difficulty: difficulty.totalDifficulty,
        created_at: new Date(),
        updated_at: new Date()
      });

      const created = await knex('card_difficulty').where('id', id).first();
      return new CardDifficulty(created);
    }
  }

  /**
   * Get cards within difficulty range
   * @param {number} deckId - Deck ID
   * @param {Object} options - Filter options
   * @returns {Array} Cards with difficulty data
   */
  static async getCardsByDifficultyRange(deckId, options = {}) {
    let query = knex('cards')
      .join('card_difficulty', 'cards.id', 'card_difficulty.card_id')
      .where('cards.deck_id', deckId)
      .select('cards.*', 'card_difficulty.*');

    if (options.minDifficulty !== undefined) {
      query = query.where('card_difficulty.total_difficulty', '>=', options.minDifficulty);
    }

    if (options.maxDifficulty !== undefined) {
      query = query.where('card_difficulty.total_difficulty', '<=', options.maxDifficulty);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'asc');
    } else {
      query = query.orderBy('card_difficulty.total_difficulty', 'asc');
    }

    const results = await query;

    return results.map(result => ({
      id: result.id,
      front: result.front,
      back: result.back,
      type: result.type,
      deckId: result.deck_id,
      difficulty: new CardDifficulty({
        id: result.card_id, // Use the difficulty record's ID
        card_id: result.card_id,
        vocabulary_score: result.vocabulary_score,
        grammar_score: result.grammar_score,
        length_score: result.length_score,
        type_score: result.type_score,
        total_difficulty: result.total_difficulty,
        created_at: result.calculated_at || result.created_at,
        updated_at: result.updated_at
      })
    }));
  }

  /**
   * Calculate and store difficulties for all cards in a deck
   * @param {number} deckId - Deck ID
   * @returns {number} Number of cards processed
   */
  static async calculateDeckDifficulties(deckId) {
    const cards = await knex('cards')
      .where('deck_id', deckId)
      .select('id', 'front', 'back', 'type');

    let processed = 0;

    for (const card of cards) {
      try {
        await CardDifficulty.createOrUpdate(card.id, card);
        processed++;
      } catch (error) {
        console.error(`Failed to calculate difficulty for card ${card.id}:`, error);
      }
    }

    return processed;
  }

  /**
   * Get difficulty statistics for a deck
   * @param {number} deckId - Deck ID
   * @returns {Object} Difficulty statistics
   */
  static async getDeckDifficultyStats(deckId) {
    const stats = await knex('cards')
      .join('card_difficulty', 'cards.id', 'card_difficulty.card_id')
      .where('cards.deck_id', deckId)
      .select(
        knex.raw('COUNT(*) as total_cards'),
        knex.raw('AVG(card_difficulty.total_difficulty) as avg_difficulty'),
        knex.raw('MIN(card_difficulty.total_difficulty) as min_difficulty'),
        knex.raw('MAX(card_difficulty.total_difficulty) as max_difficulty'),
        knex.raw('STDDEV(card_difficulty.total_difficulty) as difficulty_spread')
      )
      .first();

    return {
      totalCards: parseInt(stats.total_cards) || 0,
      avgDifficulty: parseFloat(stats.avg_difficulty) || 0,
      minDifficulty: parseInt(stats.min_difficulty) || 0,
      maxDifficulty: parseInt(stats.max_difficulty) || 0,
      difficultySpread: parseFloat(stats.difficulty_spread) || 0
    };
  }

  /**
   * Get difficulty distribution for a deck
   * @param {number} deckId - Deck ID
   * @returns {Array} Difficulty distribution by ranges
   */
  static async getDifficultyDistribution(deckId) {
    const distribution = await knex('cards')
      .join('card_difficulty', 'cards.id', 'card_difficulty.card_id')
      .where('cards.deck_id', deckId)
      .select(
        knex.raw(`
          CASE
            WHEN total_difficulty < 25 THEN 'Easy (0-24)'
            WHEN total_difficulty < 50 THEN 'Medium (25-49)'
            WHEN total_difficulty < 75 THEN 'Hard (50-74)'
            ELSE 'Expert (75-100)'
          END as difficulty_range
        `),
        knex.raw('COUNT(*) as count')
      )
      .groupBy('difficulty_range')
      .orderBy('count', 'desc');

    return distribution.map(item => ({
      range: item.difficulty_range,
      count: parseInt(item.count)
    }));
  }

  /**
   * Update difficulty calculation
   * @param {Object} updates - Fields to update
   * @returns {CardDifficulty} Updated difficulty instance
   */
  async update(updates) {
    const updateData = {};

    if (updates.vocabularyScore !== undefined) updateData.vocabulary_score = updates.vocabularyScore;
    if (updates.grammarScore !== undefined) updateData.grammarScore = updates.grammarScore;
    if (updates.lengthScore !== undefined) updateData.lengthScore = updates.lengthScore;
    if (updates.typeScore !== undefined) updateData.typeScore = updates.typeScore;

    // Recalculate total if any component changed
    if (Object.keys(updateData).length > 0) {
      updateData.total_difficulty =
        (updates.vocabularyScore ?? this.vocabularyScore) +
        (updates.grammarScore ?? this.grammarScore) +
        (updates.lengthScore ?? this.lengthScore) +
        (updates.typeScore ?? this.typeScore);
    }

    updateData.updated_at = new Date();

    await knex('card_difficulty')
      .where('id', this.id)
      .update(updateData);

    // Refresh instance data
    const updated = await knex('card_difficulty').where('id', this.id).first();
    Object.assign(this, {
      vocabularyScore: updated.vocabulary_score,
      grammarScore: updated.grammar_score,
      lengthScore: updated.length_score,
      typeScore: updated.type_score,
      totalDifficulty: updated.total_difficulty,
      updatedAt: updated.updated_at
    });

    return this;
  }

  /**
   * Convert to API response format
   * @returns {Object} API-formatted difficulty data
   */
  toJSON() {
    return {
      id: this.id,
      cardId: this.cardId,
      vocabularyScore: this.vocabularyScore,
      grammarScore: this.grammarScore,
      lengthScore: this.lengthScore,
      typeScore: this.typeScore,
      totalDifficulty: this.totalDifficulty,
      calculatedAt: this.calculatedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate difficulty data
   * @param {Object} data - Data to validate
   * @throws {Error} If validation fails
   */
  static validate(data) {
    if (data.vocabularyScore < 0 || data.vocabularyScore > 30) {
      throw new Error('Vocabulary score must be between 0 and 30');
    }

    if (data.grammarScore < 0 || data.grammarScore > 40) {
      throw new Error('Grammar score must be between 0 and 40');
    }

    if (data.lengthScore < 0 || data.lengthScore > 20) {
      throw new Error('Length score must be between 0 and 20');
    }

    if (data.typeScore < 0 || data.typeScore > 10) {
      throw new Error('Type score must be between 0 and 10');
    }

    const expectedTotal = data.vocabularyScore + data.grammarScore + data.lengthScore + data.typeScore;
    if (data.totalDifficulty !== expectedTotal) {
      throw new Error('Total difficulty must equal sum of component scores');
    }
  }

  /**
   * Delete difficulty record
   * @returns {boolean} Success status
   */
  async delete() {
    const deleted = await knex('card_difficulty')
      .where('id', this.id)
      .del();

    return deleted > 0;
  }

  /**
   * Recalculate all difficulties (maintenance function)
   * @param {Object} options - Calculation options
   * @returns {Object} Results summary
   */
  static async recalculateAll(options = {}) {
    let processed = 0;
    let errors = 0;

    let query = knex('cards').select('id', 'front', 'back', 'type', 'deck_id');

    if (options.deckId) {
      query = query.where('deck_id', options.deckId);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const cards = await query;

    for (const card of cards) {
      try {
        await CardDifficulty.createOrUpdate(card.id, card);
        processed++;
      } catch (error) {
        console.error(`Failed to recalculate difficulty for card ${card.id}:`, error);
        errors++;
      }
    }

    return { processed, errors, total: cards.length };
  }
}

module.exports = CardDifficulty;