/**
 * T018: UserProgression model
 * Model for user progression data with CRUD operations
 */

const knex = require('../utils/database');
const {
  calculateLevel,
  calculateXPForNextLevel,
  calculateXPProgress,
  getDifficultyBounds
} = require('../utils/progressionCalculator');

class UserProgression {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.level = data.level;
    this.xp = data.xp;
    this.streak = data.streak;
    this.currentDifficulty = data.current_difficulty;
    this.totalSessions = data.total_sessions;
    this.totalCorrectAnswers = data.total_correct_answers;
    this.totalQuestionsAnswered = data.total_questions_answered;
    this.lastSessionDate = data.last_session_date;
    this.levelUpDate = data.level_up_date;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Find user progression by user ID
   * @param {number} userId - User ID
   * @returns {UserProgression|null} User progression instance or null
   */
  static async findByUserId(userId) {
    const data = await knex('user_progression')
      .where('user_id', userId)
      .first();

    return data ? new UserProgression(data) : null;
  }

  /**
   * Find or create user progression record
   * @param {number} userId - User ID
   * @returns {UserProgression} User progression instance
   */
  static async findOrCreateByUserId(userId) {
    let progression = await UserProgression.findByUserId(userId);

    if (!progression) {
      progression = await UserProgression.create({
        userId,
        level: 1,
        xp: 0,
        streak: 0,
        currentDifficulty: 10,
        totalSessions: 0,
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0
      });
    }

    return progression;
  }

  /**
   * Create new user progression record
   * @param {Object} data - Progression data
   * @returns {UserProgression} Created progression instance
   */
  static async create(data) {
    const [id] = await knex('user_progression').insert({
      user_id: data.userId,
      level: data.level || 1,
      xp: data.xp || 0,
      streak: data.streak || 0,
      current_difficulty: data.currentDifficulty || 10,
      total_sessions: data.totalSessions || 0,
      total_correct_answers: data.totalCorrectAnswers || 0,
      total_questions_answered: data.totalQuestionsAnswered || 0,
      last_session_date: data.lastSessionDate || null,
      level_up_date: data.levelUpDate || null,
      created_at: new Date(),
      updated_at: new Date()
    });

    const created = await knex('user_progression').where('id', id).first();
    return new UserProgression(created);
  }

  /**
   * Update progression record
   * @param {Object} updates - Fields to update
   * @returns {UserProgression} Updated progression instance
   */
  async update(updates) {
    const updateData = {};

    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.xp !== undefined) updateData.xp = updates.xp;
    if (updates.streak !== undefined) updateData.streak = updates.streak;
    if (updates.currentDifficulty !== undefined) updateData.current_difficulty = updates.currentDifficulty;
    if (updates.totalSessions !== undefined) updateData.total_sessions = updates.totalSessions;
    if (updates.totalCorrectAnswers !== undefined) updateData.total_correct_answers = updates.totalCorrectAnswers;
    if (updates.totalQuestionsAnswered !== undefined) updateData.total_questions_answered = updates.totalQuestionsAnswered;
    if (updates.lastSessionDate !== undefined) updateData.last_session_date = updates.lastSessionDate;
    if (updates.levelUpDate !== undefined) updateData.level_up_date = updates.levelUpDate;

    updateData.updated_at = new Date();

    await knex('user_progression')
      .where('id', this.id)
      .update(updateData);

    // Refresh instance data
    const updated = await knex('user_progression').where('id', this.id).first();
    Object.assign(this, {
      level: updated.level,
      xp: updated.xp,
      streak: updated.streak,
      currentDifficulty: updated.current_difficulty,
      totalSessions: updated.total_sessions,
      totalCorrectAnswers: updated.total_correct_answers,
      totalQuestionsAnswered: updated.total_questions_answered,
      lastSessionDate: updated.last_session_date,
      levelUpDate: updated.level_up_date,
      updatedAt: updated.updated_at
    });

    return this;
  }

  /**
   * Calculate accuracy percentage
   * @returns {number} Accuracy percentage (0-100)
   */
  getAccuracy() {
    if (this.totalQuestionsAnswered === 0) return 0;
    return Math.round((this.totalCorrectAnswers / this.totalQuestionsAnswered) * 100 * 100) / 100;
  }

  /**
   * Get XP required to reach next level
   * @returns {number} XP needed for next level
   */
  getXPToNextLevel() {
    return calculateXPForNextLevel(this.level);
  }

  /**
   * Get XP progress within current level
   * @returns {number} XP progress in current level
   */
  getXPProgress() {
    return calculateXPProgress(this.xp, this.level);
  }

  /**
   * Get difficulty range for current level
   * @returns {Object} {min, max} difficulty bounds
   */
  getDifficultyRange() {
    return getDifficultyBounds(this.level);
  }

  /**
   * Convert to API response format
   * @returns {Object} API-formatted progression data
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      level: this.level,
      xp: this.xp,
      streak: this.streak,
      currentDifficulty: this.currentDifficulty,
      totalSessions: this.totalSessions,
      totalCorrectAnswers: this.totalCorrectAnswers,
      totalQuestionsAnswered: this.totalQuestionsAnswered,
      lastSessionDate: this.lastSessionDate,
      levelUpDate: this.levelUpDate,
      accuracy: this.getAccuracy(),
      xpToNextLevel: this.getXPToNextLevel(),
      difficultyRange: this.getDifficultyRange(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate progression data constraints
   * @param {Object} data - Data to validate
   * @throws {Error} If validation fails
   */
  static validate(data) {
    if (data.level !== undefined) {
      if (data.level < 1 || data.level > 50) {
        throw new Error('Level must be between 1 and 50');
      }
    }

    if (data.xp !== undefined) {
      if (data.xp < 0) {
        throw new Error('XP must be non-negative');
      }
    }

    if (data.streak !== undefined) {
      if (data.streak < 0) {
        throw new Error('Streak must be non-negative');
      }
    }

    if (data.currentDifficulty !== undefined) {
      if (data.currentDifficulty < 0 || data.currentDifficulty > 100) {
        throw new Error('Difficulty must be between 0 and 100');
      }
    }

    if (data.totalCorrectAnswers !== undefined && data.totalQuestionsAnswered !== undefined) {
      if (data.totalCorrectAnswers > data.totalQuestionsAnswered) {
        throw new Error('Correct answers cannot exceed total questions');
      }
    }
  }

  /**
   * Delete progression record
   * @returns {boolean} Success status
   */
  async delete() {
    const deleted = await knex('user_progression')
      .where('id', this.id)
      .del();

    return deleted > 0;
  }

  /**
   * Get all progressions (for admin/testing)
   * @param {Object} options - Query options
   * @returns {Array<UserProgression>} Array of progression instances
   */
  static async getAll(options = {}) {
    let query = knex('user_progression');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'asc');
    }

    const results = await query;
    return results.map(data => new UserProgression(data));
  }
}

module.exports = UserProgression;