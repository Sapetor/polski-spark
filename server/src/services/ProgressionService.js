/**
 * T021: ProgressionService with XP and level calculations
 * Service layer for progression management and calculations
 */

const UserProgression = require('../models/UserProgression');
const ProgressionSession = require('../models/ProgressionSession');
const {
  calculateSessionXP,
  calculateLevel,
  adjustDifficulty,
  calculateStreak,
  checkLevelUp,
  getLevelInfo
} = require('../utils/progressionCalculator');

class ProgressionService {
  /**
   * Get user progression data
   * @param {number} userId - User ID
   * @returns {Object} Formatted progression data
   */
  static async getUserProgression(userId) {
    const progression = await UserProgression.findOrCreateByUserId(userId);
    return progression.toJSON();
  }

  /**
   * Update user progression after session completion
   * @param {number} userId - User ID
   * @param {Object} sessionData - Session completion data
   * @returns {Object} Update results with XP earned, level changes, etc.
   */
  static async updateProgression(userId, sessionData) {
    try {
      // Validate session data
      ProgressionService.validateSessionData(sessionData);

      // Get current progression
      const progression = await UserProgression.findOrCreateByUserId(userId);
      const oldXP = progression.xp;
      const oldLevel = progression.level;
      const oldDifficulty = progression.currentDifficulty;

      // Calculate session metrics
      const sessionAccuracy = sessionData.correctAnswers / sessionData.questionsAnswered;
      const xpEarned = calculateSessionXP(
        sessionData.correctAnswers,
        sessionData.questionsAnswered,
        sessionData.startingDifficulty || progression.currentDifficulty
      );

      // Calculate new totals
      const newXP = oldXP + xpEarned;
      const newLevel = calculateLevel(newXP);
      const leveledUp = checkLevelUp(oldXP, newXP);

      // Adjust difficulty based on performance
      const newDifficulty = adjustDifficulty(
        oldDifficulty,
        sessionAccuracy,
        newLevel
      );

      // Calculate streak
      const today = new Date();
      const lastSessionDate = progression.lastSessionDate ? new Date(progression.lastSessionDate) : null;
      const newStreak = calculateStreak(lastSessionDate, today, progression.streak);

      // Update progression record
      await progression.update({
        level: newLevel,
        xp: newXP,
        streak: newStreak,
        currentDifficulty: newDifficulty,
        totalSessions: progression.totalSessions + 1,
        totalCorrectAnswers: progression.totalCorrectAnswers + sessionData.correctAnswers,
        totalQuestionsAnswered: progression.totalQuestionsAnswered + sessionData.questionsAnswered,
        lastSessionDate: today.toISOString().split('T')[0],
        levelUpDate: leveledUp ? new Date() : progression.levelUpDate
      });

      // Create session record
      await ProgressionSession.create({
        userId,
        sessionId: sessionData.sessionId,
        startingDifficulty: sessionData.startingDifficulty || oldDifficulty,
        endingDifficulty: newDifficulty,
        xpEarned,
        questionsAnswered: sessionData.questionsAnswered,
        correctAnswers: sessionData.correctAnswers,
        difficultyAdjustments: newDifficulty !== oldDifficulty ? 1 : 0
      });

      // Generate celebration data if applicable
      const celebrationData = ProgressionService.generateCelebrationData({
        leveledUp,
        oldLevel,
        newLevel,
        newStreak,
        xpEarned
      });

      return {
        success: true,
        xpEarned,
        levelUp: leveledUp,
        newLevel,
        newXp: newXP,
        streakUpdated: newStreak !== progression.streak,
        newStreak,
        difficultyAdjusted: newDifficulty !== oldDifficulty,
        newDifficulty,
        celebrationData
      };

    } catch (error) {
      console.error('Error updating progression:', error);
      throw error;
    }
  }

  /**
   * Get level progression information
   * @returns {Object} Level progression data for all levels
   */
  static async getLevelProgression() {
    const levels = [];

    for (let level = 1; level <= 50; level++) {
      const levelInfo = getLevelInfo(level);
      const xpRequired = level * 100;

      // Get difficulty bounds for this level
      let difficultyRange;
      if (level <= 2) {
        difficultyRange = { min: 0, max: 25 };
      } else if (level <= 5) {
        difficultyRange = { min: 15, max: 45 };
      } else if (level <= 10) {
        difficultyRange = { min: 35, max: 65 };
      } else {
        difficultyRange = { min: 55, max: 100 };
      }

      levels.push({
        level,
        xpRequired,
        difficultyRange,
        title: levelInfo.title,
        description: levelInfo.description
      });
    }

    return { levels };
  }

  /**
   * Get user progression history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Progression session history
   */
  static async getProgressionHistory(userId, options = {}) {
    const sessions = await ProgressionSession.findByUserId(userId, {
      limit: options.limit || 20,
      startDate: options.startDate,
      endDate: options.endDate,
      orderBy: 'created_at',
      order: 'desc'
    });

    return sessions.map(session => session.toJSON());
  }

  /**
   * Get user progression statistics
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Comprehensive progression statistics
   */
  static async getProgressionStats(userId, options = {}) {
    const [progression, sessionStats] = await Promise.all([
      UserProgression.findByUserId(userId),
      ProgressionSession.getUserStats(userId, options)
    ]);

    if (!progression) {
      return null;
    }

    return {
      progression: progression.toJSON(),
      sessionStats,
      trends: await ProgressionSession.getDifficultyTrend(userId, 10)
    };
  }

  /**
   * Reset user progression (admin function)
   * @param {number} userId - User ID
   * @returns {Object} Reset confirmation
   */
  static async resetProgression(userId) {
    const progression = await UserProgression.findByUserId(userId);

    if (!progression) {
      throw new Error('User progression not found');
    }

    await progression.update({
      level: 1,
      xp: 0,
      streak: 0,
      currentDifficulty: 10,
      totalSessions: 0,
      totalCorrectAnswers: 0,
      totalQuestionsAnswered: 0,
      lastSessionDate: null,
      levelUpDate: null
    });

    return {
      success: true,
      message: 'User progression reset to default values'
    };
  }

  /**
   * Validate session data
   * @param {Object} sessionData - Session data to validate
   * @throws {Error} If validation fails
   */
  static validateSessionData(sessionData) {
    if (!sessionData.questionsAnswered || sessionData.questionsAnswered < 1) {
      throw new Error('Questions answered must be at least 1');
    }

    if (sessionData.correctAnswers < 0) {
      throw new Error('Correct answers must be non-negative');
    }

    if (sessionData.correctAnswers > sessionData.questionsAnswered) {
      throw new Error('Correct answers cannot exceed total questions');
    }

    if (sessionData.sessionDuration && sessionData.sessionDuration < 1) {
      throw new Error('Session duration must be positive');
    }

    if (sessionData.startingDifficulty !== undefined) {
      if (sessionData.startingDifficulty < 0 || sessionData.startingDifficulty > 100) {
        throw new Error('Starting difficulty must be between 0 and 100');
      }
    }
  }

  /**
   * Generate celebration data for achievements
   * @param {Object} context - Achievement context
   * @returns {Object|null} Celebration data or null
   */
  static generateCelebrationData(context) {
    const { leveledUp, oldLevel, newLevel, newStreak, xpEarned } = context;

    if (leveledUp) {
      return {
        type: 'level_up',
        message: `Congratulations! You've reached Level ${newLevel}!`,
        milestone: newLevel
      };
    }

    // Streak milestones
    if ([7, 14, 30, 60, 100].includes(newStreak)) {
      return {
        type: 'streak_milestone',
        message: `Amazing! ${newStreak} day streak achieved!`,
        milestone: newStreak
      };
    }

    // XP milestones (every 500 XP)
    if (xpEarned >= 50 && Math.floor(xpEarned / 500) > 0) {
      return {
        type: 'xp_milestone',
        message: `Great session! You earned ${xpEarned} XP!`,
        milestone: xpEarned
      };
    }

    return null;
  }

  /**
   * Get progression leaderboard (top users by level/XP)
   * @param {Object} options - Query options
   * @returns {Array} Leaderboard data
   */
  static async getLeaderboard(options = {}) {
    const limit = options.limit || 10;
    const orderBy = options.orderBy || 'level';

    const progressions = await UserProgression.getAll({
      limit,
      orderBy: orderBy === 'level' ? 'level' : 'xp',
      order: 'desc'
    });

    return progressions.map((progression, index) => ({
      rank: index + 1,
      userId: progression.userId,
      level: progression.level,
      xp: progression.xp,
      streak: progression.streak,
      accuracy: progression.getAccuracy()
    }));
  }

  /**
   * Calculate projected progression for user
   * @param {number} userId - User ID
   * @param {number} sessionsPerWeek - Expected sessions per week
   * @param {number} avgAccuracy - Expected accuracy (0-1)
   * @returns {Object} Progression projection
   */
  static async getProgressionProjection(userId, sessionsPerWeek = 3, avgAccuracy = 0.7) {
    const progression = await UserProgression.findByUserId(userId);

    if (!progression) {
      throw new Error('User progression not found');
    }

    const currentXP = progression.xp;
    const currentLevel = progression.level;
    const avgXPPerSession = calculateSessionXP(10, 10, progression.currentDifficulty) * avgAccuracy;

    const weeksToNextLevel = Math.ceil(
      (calculateLevel(currentXP + 100) * 100 - currentXP) / (avgXPPerSession * sessionsPerWeek)
    );

    const projectedXPIn30Days = currentXP + (avgXPPerSession * sessionsPerWeek * 4.3);
    const projectedLevelIn30Days = calculateLevel(projectedXPIn30Days);

    return {
      currentLevel,
      currentXP,
      avgXPPerSession: Math.round(avgXPPerSession),
      weeksToNextLevel,
      projectedLevelIn30Days,
      projectedXPIn30Days: Math.round(projectedXPIn30Days)
    };
  }
}

module.exports = ProgressionService;