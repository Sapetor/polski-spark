/**
 * T005: Progression calculation utilities
 * Contains formulas for XP calculation, level progression, and difficulty adjustment
 */

/**
 * Calculate XP earned for a learning session
 * @param {number} correctAnswers - Number of correct answers
 * @param {number} totalQuestions - Total questions answered
 * @param {number} currentDifficulty - Current difficulty level (0-100)
 * @returns {number} XP earned for the session
 */
function calculateSessionXP(correctAnswers, totalQuestions, currentDifficulty) {
  const baseXP = 50;
  const difficultyMultiplier = currentDifficulty / 50; // Range: 0.0 - 2.0
  const accuracyBonus = correctAnswers / totalQuestions; // Range: 0.0 - 1.0

  const sessionXP = Math.floor(baseXP * difficultyMultiplier * accuracyBonus);

  // Ensure minimum XP for participation (1 XP if any questions answered)
  return Math.max(sessionXP, totalQuestions > 0 ? 1 : 0);
}

/**
 * Calculate level from total XP
 * @param {number} totalXP - Total accumulated XP
 * @returns {number} Current level (1-50)
 */
function calculateLevel(totalXP) {
  const level = Math.floor(totalXP / 100) + 1;
  return Math.min(level, 50); // Cap at level 50
}

/**
 * Calculate XP required for next level
 * @param {number} currentLevel - Current level
 * @returns {number} XP required to reach next level
 */
function calculateXPForNextLevel(currentLevel) {
  if (currentLevel >= 50) return 0; // Max level reached
  return currentLevel * 100;
}

/**
 * Calculate XP progress within current level
 * @param {number} totalXP - Total accumulated XP
 * @param {number} currentLevel - Current level
 * @returns {number} XP progress within current level
 */
function calculateXPProgress(totalXP, currentLevel) {
  const levelStartXP = (currentLevel - 1) * 100;
  return totalXP - levelStartXP;
}

/**
 * Adjust difficulty based on session performance
 * @param {number} currentDifficulty - Current difficulty (0-100)
 * @param {number} sessionAccuracy - Session accuracy (0.0-1.0)
 * @param {number} userLevel - User's current level
 * @returns {number} New difficulty level
 */
function adjustDifficulty(currentDifficulty, sessionAccuracy, userLevel) {
  let newDifficulty = currentDifficulty;

  // Adjust based on performance
  if (sessionAccuracy < 0.6) {
    newDifficulty -= 5; // Decrease difficulty for poor performance
  } else if (sessionAccuracy > 0.9) {
    newDifficulty += 5; // Increase difficulty for excellent performance
  }

  // Apply level-based bounds
  const bounds = getDifficultyBounds(userLevel);
  newDifficulty = Math.max(bounds.min, Math.min(bounds.max, newDifficulty));

  return newDifficulty;
}

/**
 * Get difficulty bounds for a given level
 * @param {number} level - User level
 * @returns {Object} {min, max} difficulty bounds
 */
function getDifficultyBounds(level) {
  if (level <= 2) {
    return { min: 0, max: 25 };
  } else if (level <= 5) {
    return { min: 15, max: 45 };
  } else if (level <= 10) {
    return { min: 35, max: 65 };
  } else {
    return { min: 55, max: 100 };
  }
}

/**
 * Calculate streak based on session dates
 * @param {Date} lastSessionDate - Date of last session
 * @param {Date} currentSessionDate - Date of current session
 * @param {number} currentStreak - Current streak count
 * @returns {number} New streak count
 */
function calculateStreak(lastSessionDate, currentSessionDate, currentStreak) {
  if (!lastSessionDate) {
    return 1; // First session
  }

  const timeDiff = currentSessionDate.getTime() - lastSessionDate.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  if (hoursDiff <= 24) {
    // Same day or within 24 hours - continue streak
    const daysDiff = Math.floor(hoursDiff / 24);
    return daysDiff === 0 ? currentStreak : currentStreak + 1;
  } else if (hoursDiff <= 48) {
    // Within 48 hours - increment streak (next day)
    return currentStreak + 1;
  } else {
    // More than 48 hours - reset streak
    return 1;
  }
}

/**
 * Calculate card difficulty score based on multiple factors
 * @param {Object} card - Card object with front, back, type
 * @returns {Object} Difficulty breakdown and total score
 */
function calculateCardDifficulty(card) {
  const vocabularyScore = calculateVocabularyScore(card.front, card.back);
  const grammarScore = calculateGrammarScore(card.front, card.back);
  const lengthScore = calculateLengthScore(card.front, card.back);
  const typeScore = calculateTypeScore(card.type);

  const totalDifficulty = vocabularyScore + grammarScore + lengthScore + typeScore;

  return {
    vocabularyScore,
    grammarScore,
    lengthScore,
    typeScore,
    totalDifficulty: Math.min(100, totalDifficulty) // Cap at 100
  };
}

/**
 * Calculate vocabulary complexity score (0-30)
 * @param {string} front - Front of card
 * @param {string} back - Back of card
 * @returns {number} Vocabulary score
 */
function calculateVocabularyScore(front, back) {
  const text = (front + ' ' + back).toLowerCase();
  const words = text.split(/\s+/).filter(word => word.length > 0);

  let score = 0;

  // Base score on word count
  score += Math.min(words.length * 2, 15);

  // Add complexity for longer words
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  score += Math.min(avgWordLength * 2, 15);

  return Math.min(30, Math.floor(score));
}

/**
 * Calculate grammar complexity score (0-40)
 * @param {string} front - Front of card
 * @param {string} back - Back of card
 * @returns {number} Grammar score
 */
function calculateGrammarScore(front, back) {
  const text = (front + ' ' + back).toLowerCase();

  let score = 10; // Base score

  // Look for grammatical indicators
  if (text.includes('ć') || text.includes('ę') || text.includes('ą')) score += 5; // Polish special chars
  if (text.match(/\b(się|by|aby|żeby)\b/)) score += 5; // Complex particles
  if (text.match(/\b(który|która|które|gdzie|kiedy)\b/)) score += 5; // Relative pronouns
  if (text.includes('?')) score += 3; // Questions
  if (text.includes('!')) score += 2; // Exclamations
  if (text.split(' ').length > 10) score += 10; // Long sentences

  return Math.min(40, score);
}

/**
 * Calculate length complexity score (0-20)
 * @param {string} front - Front of card
 * @param {string} back - Back of card
 * @returns {number} Length score
 */
function calculateLengthScore(front, back) {
  const totalLength = front.length + back.length;
  const wordCount = (front + ' ' + back).split(/\s+/).length;

  let score = 0;

  // Character length component
  score += Math.min(totalLength / 10, 10);

  // Word count component
  score += Math.min(wordCount / 2, 10);

  return Math.min(20, Math.floor(score));
}

/**
 * Calculate type difficulty score (0-10)
 * @param {string} type - Card type
 * @returns {number} Type score
 */
function calculateTypeScore(type) {
  const typeScores = {
    'multiple_choice': 2,
    'true_false': 3,
    'fill_blank': 6,
    'translate': 8,
    'speak': 7,
    'listen': 5,
    'write': 9,
    'match': 4
  };

  return typeScores[type] || 5; // Default score
}

/**
 * Check if user leveled up
 * @param {number} oldXP - XP before session
 * @param {number} newXP - XP after session
 * @returns {boolean} True if leveled up
 */
function checkLevelUp(oldXP, newXP) {
  const oldLevel = calculateLevel(oldXP);
  const newLevel = calculateLevel(newXP);
  return newLevel > oldLevel;
}

/**
 * Get level title and description
 * @param {number} level - User level
 * @returns {Object} {title, description}
 */
function getLevelInfo(level) {
  const titles = {
    1: 'Beginner',
    5: 'Novice',
    10: 'Student',
    15: 'Learner',
    20: 'Intermediate',
    25: 'Skilled',
    30: 'Advanced',
    35: 'Proficient',
    40: 'Expert',
    45: 'Master',
    50: 'Grandmaster'
  };

  let title = 'Beginner';
  for (const levelThreshold of Object.keys(titles).sort((a, b) => b - a)) {
    if (level >= parseInt(levelThreshold)) {
      title = titles[levelThreshold];
      break;
    }
  }

  return {
    title,
    description: `Level ${level} ${title}`
  };
}

module.exports = {
  calculateSessionXP,
  calculateLevel,
  calculateXPForNextLevel,
  calculateXPProgress,
  adjustDifficulty,
  getDifficultyBounds,
  calculateStreak,
  calculateCardDifficulty,
  checkLevelUp,
  getLevelInfo
};