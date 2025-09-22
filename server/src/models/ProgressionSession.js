/**
 * T019: ProgressionSession model
 * Model for individual session progression records
 */

const knex = require('../utils/database');

class ProgressionSession {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.sessionId = data.session_id;
    this.sessionDate = data.session_date;
    this.startingDifficulty = data.starting_difficulty;
    this.endingDifficulty = data.ending_difficulty;
    this.xpEarned = data.xp_earned;
    this.questionsAnswered = data.questions_answered;
    this.correctAnswers = data.correct_answers;
    this.sessionAccuracy = data.session_accuracy;
    this.difficultyAdjustments = data.difficulty_adjustments;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create new progression session record
   * @param {Object} data - Session data
   * @returns {ProgressionSession} Created session instance
   */
  static async create(data) {
    // Validate required fields
    ProgressionSession.validate(data);

    const sessionAccuracy = (data.correctAnswers / data.questionsAnswered) * 100;

    const [id] = await knex('progression_sessions').insert({
      user_id: data.userId,
      session_id: data.sessionId || null,
      session_date: data.sessionDate || new Date().toISOString().split('T')[0],
      starting_difficulty: data.startingDifficulty,
      ending_difficulty: data.endingDifficulty,
      xp_earned: data.xpEarned,
      questions_answered: data.questionsAnswered,
      correct_answers: data.correctAnswers,
      session_accuracy: sessionAccuracy,
      difficulty_adjustments: data.difficultyAdjustments || 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    const created = await knex('progression_sessions').where('id', id).first();
    return new ProgressionSession(created);
  }

  /**
   * Find progression sessions by user ID
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array<ProgressionSession>} Array of session instances
   */
  static async findByUserId(userId, options = {}) {
    let query = knex('progression_sessions')
      .where('user_id', userId);

    if (options.startDate) {
      query = query.where('session_date', '>=', options.startDate);
    }

    if (options.endDate) {
      query = query.where('session_date', '<=', options.endDate);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.order || 'desc');
    } else {
      query = query.orderBy('created_at', 'desc');
    }

    const results = await query;
    return results.map(data => new ProgressionSession(data));
  }

  /**
   * Find session by ID
   * @param {number} id - Session ID
   * @returns {ProgressionSession|null} Session instance or null
   */
  static async findById(id) {
    const data = await knex('progression_sessions')
      .where('id', id)
      .first();

    return data ? new ProgressionSession(data) : null;
  }

  /**
   * Get user session statistics
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Session statistics
   */
  static async getUserStats(userId, options = {}) {
    let query = knex('progression_sessions')
      .where('user_id', userId);

    if (options.startDate) {
      query = query.where('session_date', '>=', options.startDate);
    }

    if (options.endDate) {
      query = query.where('session_date', '<=', options.endDate);
    }

    const stats = await query
      .select(
        knex.raw('COUNT(*) as total_sessions'),
        knex.raw('SUM(xp_earned) as total_xp_earned'),
        knex.raw('SUM(questions_answered) as total_questions'),
        knex.raw('SUM(correct_answers) as total_correct'),
        knex.raw('AVG(session_accuracy) as avg_accuracy'),
        knex.raw('MIN(session_date) as first_session'),
        knex.raw('MAX(session_date) as last_session')
      )
      .first();

    return {
      totalSessions: parseInt(stats.total_sessions) || 0,
      totalXPEarned: parseInt(stats.total_xp_earned) || 0,
      totalQuestions: parseInt(stats.total_questions) || 0,
      totalCorrect: parseInt(stats.total_correct) || 0,
      avgAccuracy: parseFloat(stats.avg_accuracy) || 0,
      firstSession: stats.first_session,
      lastSession: stats.last_session
    };
  }

  /**
   * Get recent session streak
   * @param {number} userId - User ID
   * @param {Date} fromDate - Start date for streak calculation
   * @returns {Array<ProgressionSession>} Recent sessions for streak calculation
   */
  static async getRecentSessions(userId, fromDate) {
    const sessions = await knex('progression_sessions')
      .where('user_id', userId)
      .where('session_date', '>=', fromDate.toISOString().split('T')[0])
      .orderBy('session_date', 'desc')
      .limit(30); // Last 30 sessions max

    return sessions.map(data => new ProgressionSession(data));
  }

  /**
   * Update session record
   * @param {Object} updates - Fields to update
   * @returns {ProgressionSession} Updated session instance
   */
  async update(updates) {
    const updateData = {};

    if (updates.endingDifficulty !== undefined) updateData.ending_difficulty = updates.endingDifficulty;
    if (updates.xpEarned !== undefined) updateData.xp_earned = updates.xpEarned;
    if (updates.difficultyAdjustments !== undefined) updateData.difficulty_adjustments = updates.difficultyAdjustments;

    updateData.updated_at = new Date();

    await knex('progression_sessions')
      .where('id', this.id)
      .update(updateData);

    // Refresh instance data
    const updated = await knex('progression_sessions').where('id', this.id).first();
    Object.assign(this, {
      endingDifficulty: updated.ending_difficulty,
      xpEarned: updated.xp_earned,
      difficultyAdjustments: updated.difficulty_adjustments,
      updatedAt: updated.updated_at
    });

    return this;
  }

  /**
   * Convert to API response format
   * @returns {Object} API-formatted session data
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      sessionDate: this.sessionDate,
      startingDifficulty: this.startingDifficulty,
      endingDifficulty: this.endingDifficulty,
      xpEarned: this.xpEarned,
      questionsAnswered: this.questionsAnswered,
      correctAnswers: this.correctAnswers,
      sessionAccuracy: this.sessionAccuracy,
      difficultyAdjustments: this.difficultyAdjustments,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate session data
   * @param {Object} data - Data to validate
   * @throws {Error} If validation fails
   */
  static validate(data) {
    if (!data.userId) {
      throw new Error('User ID is required');
    }

    if (!data.questionsAnswered || data.questionsAnswered < 1) {
      throw new Error('Questions answered must be at least 1');
    }

    if (data.correctAnswers < 0) {
      throw new Error('Correct answers must be non-negative');
    }

    if (data.correctAnswers > data.questionsAnswered) {
      throw new Error('Correct answers cannot exceed total questions');
    }

    if (data.startingDifficulty < 0 || data.startingDifficulty > 100) {
      throw new Error('Starting difficulty must be between 0 and 100');
    }

    if (data.endingDifficulty < 0 || data.endingDifficulty > 100) {
      throw new Error('Ending difficulty must be between 0 and 100');
    }

    if (data.xpEarned < 0) {
      throw new Error('XP earned must be non-negative');
    }
  }

  /**
   * Delete session record
   * @returns {boolean} Success status
   */
  async delete() {
    const deleted = await knex('progression_sessions')
      .where('id', this.id)
      .del();

    return deleted > 0;
  }

  /**
   * Get difficulty trend for user
   * @param {number} userId - User ID
   * @param {number} limit - Number of recent sessions to analyze
   * @returns {Object} Difficulty trend analysis
   */
  static async getDifficultyTrend(userId, limit = 10) {
    const sessions = await knex('progression_sessions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (sessions.length === 0) {
      return { trend: 'stable', avgDifficulty: 0, change: 0 };
    }

    const difficulties = sessions.map(s => s.ending_difficulty);
    const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;

    let trend = 'stable';
    if (sessions.length >= 3) {
      const recent = difficulties.slice(0, 3).reduce((sum, d) => sum + d, 0) / 3;
      const older = difficulties.slice(-3).reduce((sum, d) => sum + d, 0) / 3;
      const change = recent - older;

      if (change > 5) trend = 'increasing';
      else if (change < -5) trend = 'decreasing';
    }

    return {
      trend,
      avgDifficulty: Math.round(avgDifficulty),
      change: sessions.length >= 2 ? difficulties[0] - difficulties[difficulties.length - 1] : 0
    };
  }
}

module.exports = ProgressionSession;