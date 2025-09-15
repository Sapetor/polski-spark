// Enhanced Spaced Repetition Algorithm for Polski Lokalny
// Based on SM-2 algorithm with improvements for language learning

/**
 * Calculate the next review interval based on spaced repetition algorithm
 * @param {Object} progress - Current user progress for the card
 * @param {boolean} correct - Whether the last answer was correct
 * @param {number} responseTime - Time taken to respond in milliseconds
 * @param {string} questionType - Type of question answered
 * @param {string} difficultyLevel - Card difficulty level
 * @returns {Object} Updated progress with new interval and ease factor
 */
function calculateNextReview(progress, correct, responseTime = null, questionType = 'flashcard', difficultyLevel = 'beginner') {
  // Initialize default values if progress is null
  if (!progress) {
    progress = {
      ease_factor: 2.5,
      interval: 1,
      repetitions: 0,
      correct_count: 0,
      incorrect_count: 0,
      average_response_time: 0,
      mastery_level: 'learning'
    };
  }

  let easeFactor = progress.ease_factor || 2.5;
  let interval = progress.interval || 1;
  let repetitions = progress.repetitions || 0;
  let correctCount = progress.correct_count || 0;
  let incorrectCount = progress.incorrect_count || 0;
  let avgResponseTime = progress.average_response_time || 0;
  let masteryLevel = progress.mastery_level || 'learning';

  // Update response time average
  if (responseTime !== null) {
    const totalResponses = correctCount + incorrectCount;
    if (totalResponses > 0) {
      avgResponseTime = ((avgResponseTime * totalResponses) + responseTime) / (totalResponses + 1);
    } else {
      avgResponseTime = responseTime;
    }
  }

  // Update counts
  if (correct) {
    correctCount++;
    repetitions++;
  } else {
    incorrectCount++;
    repetitions = 0; // Reset repetitions on incorrect answer
  }

  // Base ease factor adjustment based on correctness
  if (correct) {
    // Successful recall - maintain or increase ease
    if (easeFactor < 1.3) {
      easeFactor = 1.3; // Minimum ease factor
    }
    
    // Bonus for fast responses (language learning benefit)
    const responseBonus = calculateResponseTimeBonus(responseTime, questionType);
    easeFactor = Math.min(easeFactor + responseBonus, 3.0); // Cap at 3.0
  } else {
    // Failed recall - decrease ease factor
    easeFactor = Math.max(easeFactor - 0.2, 1.1); // Minimum ease of 1.1
    interval = 1; // Reset to 1 day
  }

  // Calculate new interval based on repetitions
  if (repetitions === 0) {
    interval = 1; // First review after mistake
  } else if (repetitions === 1) {
    interval = correct ? 1 : 1; // Still 1 day for first correct answer
  } else if (repetitions === 2) {
    interval = correct ? 6 : 1; // 6 days for second correct answer
  } else {
    // Use ease factor for subsequent reviews
    interval = Math.round(interval * easeFactor);
  }

  // Apply difficulty-based adjustments
  interval = applyDifficultyAdjustment(interval, difficultyLevel, correctCount, incorrectCount);

  // Apply question type modifiers
  interval = applyQuestionTypeModifier(interval, questionType, correct);

  // Ensure minimum and maximum intervals
  interval = Math.max(interval, 1); // Minimum 1 day
  interval = Math.min(interval, 365); // Maximum 1 year

  // Update mastery level
  masteryLevel = calculateMasteryLevel(correctCount, incorrectCount, avgResponseTime, interval);

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ease_factor: Math.round(easeFactor * 100) / 100, // Round to 2 decimal places
    interval: interval,
    repetitions: repetitions,
    next_review: nextReview,
    last_reviewed: new Date(),
    correct_count: correctCount,
    incorrect_count: incorrectCount,
    average_response_time: Math.round(avgResponseTime),
    mastery_level: masteryLevel
  };
}

/**
 * Calculate response time bonus for ease factor
 * @param {number} responseTime - Time in milliseconds
 * @param {string} questionType - Type of question
 * @returns {number} Bonus to add to ease factor (0 to 0.1)
 */
function calculateResponseTimeBonus(responseTime, questionType) {
  if (!responseTime) return 0;

  // Define expected response times by question type (in milliseconds)
  const expectedTimes = {
    'flashcard': 3000,        // 3 seconds
    'multiple_choice': 8000,   // 8 seconds
    'fill_blank': 10000,      // 10 seconds
    'translation_pl_en': 15000, // 15 seconds
    'translation_en_pl': 20000  // 20 seconds
  };

  const expectedTime = expectedTimes[questionType] || 10000;
  const timeRatio = responseTime / expectedTime;

  // Fast response bonus (under 70% of expected time)
  if (timeRatio < 0.7) {
    return 0.1; // Maximum bonus
  } else if (timeRatio < 1.0) {
    return 0.05; // Moderate bonus
  }

  return 0; // No bonus for slow responses
}

/**
 * Apply difficulty-based interval adjustments
 * @param {number} interval - Base interval
 * @param {string} difficultyLevel - Card difficulty
 * @param {number} correctCount - Number of correct answers
 * @param {number} incorrectCount - Number of incorrect answers
 * @returns {number} Adjusted interval
 */
function applyDifficultyAdjustment(interval, difficultyLevel, correctCount, incorrectCount) {
  const totalAttempts = correctCount + incorrectCount;
  const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;

  let multiplier = 1.0;

  switch (difficultyLevel) {
    case 'beginner':
      // Beginner cards: shorter intervals initially, normal progression
      if (correctCount < 3) {
        multiplier = 0.8;
      }
      break;
    
    case 'intermediate':
      // Intermediate cards: normal intervals with slight reduction for low accuracy
      if (accuracy < 0.7) {
        multiplier = 0.9;
      }
      break;
    
    case 'advanced':
      // Advanced cards: longer intervals for well-known cards, shorter for struggled ones
      if (accuracy > 0.8 && correctCount > 2) {
        multiplier = 1.2; // Reward good performance on hard cards
      } else if (accuracy < 0.6) {
        multiplier = 0.7; // More frequent review for struggled cards
      }
      break;
  }

  return Math.round(interval * multiplier);
}

/**
 * Apply question type-specific interval modifiers
 * @param {number} interval - Base interval
 * @param {string} questionType - Type of question
 * @param {boolean} correct - Whether answer was correct
 * @returns {number} Modified interval
 */
function applyQuestionTypeModifier(interval, questionType, correct) {
  if (!correct) return interval; // No modification for incorrect answers

  // Different question types have different retention characteristics
  const modifiers = {
    'flashcard': 1.0,         // Baseline
    'multiple_choice': 0.9,   // Slightly easier, reduce interval
    'fill_blank': 1.1,        // Good active recall, increase interval
    'translation_pl_en': 1.2, // Excellent for retention, increase interval
    'translation_en_pl': 1.3  // Best for production skills, highest increase
  };

  const modifier = modifiers[questionType] || 1.0;
  return Math.round(interval * modifier);
}

/**
 * Calculate mastery level based on performance metrics
 * @param {number} correctCount - Number of correct answers
 * @param {number} incorrectCount - Number of incorrect answers
 * @param {number} avgResponseTime - Average response time in ms
 * @param {number} interval - Current interval in days
 * @returns {string} Mastery level: 'learning', 'familiar', 'mastered'
 */
function calculateMasteryLevel(correctCount, incorrectCount, avgResponseTime, interval) {
  const totalAttempts = correctCount + incorrectCount;
  
  if (totalAttempts === 0) return 'learning';
  
  const accuracy = correctCount / totalAttempts;
  
  // Mastered: high accuracy, many correct answers, long intervals
  if (accuracy >= 0.85 && correctCount >= 5 && interval >= 30) {
    return 'mastered';
  }
  
  // Familiar: good accuracy, some correct answers, moderate intervals
  if (accuracy >= 0.7 && correctCount >= 3 && interval >= 7) {
    return 'familiar';
  }
  
  // Learning: everything else
  return 'learning';
}

/**
 * Get cards due for review for a specific user
 * @param {Object} db - Knex database instance
 * @param {number} userId - User ID
 * @param {number} deckId - Optional deck ID to filter by
 * @param {number} limit - Maximum number of cards to return
 * @returns {Array} Cards due for review
 */
async function getCardsForReview(db, userId, deckId = null, limit = 20) {
  try {
    let query = db('user_progress')
      .join('cards', 'user_progress.card_id', 'cards.id')
      .join('decks', 'cards.deck_id', 'decks.id')
      .where('user_progress.user_id', userId)
      .where('user_progress.next_review', '<=', new Date())
      .select(
        'cards.*',
        'user_progress.*',
        'decks.name as deck_name',
        'user_progress.id as progress_id'
      )
      .orderBy('user_progress.next_review', 'asc')
      .limit(limit);

    if (deckId) {
      query = query.where('cards.deck_id', deckId);
    }

    return await query;
  } catch (error) {
    console.error('Error getting cards for review:', error);
    return [];
  }
}

/**
 * Get new cards for learning (cards never studied by user)
 * @param {Object} db - Knex database instance
 * @param {number} userId - User ID
 * @param {number} deckId - Optional deck ID to filter by
 * @param {string} difficultyLevel - Optional difficulty filter
 * @param {number} limit - Maximum number of cards to return
 * @returns {Array} New cards for learning
 */
async function getNewCardsForLearning(db, userId, deckId = null, difficultyLevel = null, limit = 10) {
  try {
    let query = db('cards')
      .join('decks', 'cards.deck_id', 'decks.id')
      .leftJoin('user_progress', function() {
        this.on('cards.id', 'user_progress.card_id')
            .andOn('user_progress.user_id', userId);
      })
      .whereNull('user_progress.id') // Cards not yet studied
      .select('cards.*', 'decks.name as deck_name')
      .orderByRaw('RANDOM()')
      .limit(limit);

    if (deckId) {
      query = query.where('cards.deck_id', deckId);
    }

    if (difficultyLevel) {
      query = query.where('cards.difficulty_level', difficultyLevel);
    }

    return await query;
  } catch (error) {
    console.error('Error getting new cards for learning:', error);
    return [];
  }
}

/**
 * Generate an optimal study session mix
 * @param {Object} db - Knex database instance
 * @param {number} userId - User ID
 * @param {number} deckId - Optional deck ID
 * @param {Object} options - Session options
 * @returns {Object} Study session with cards and metadata
 */
async function generateStudySession(db, userId, deckId = null, options = {}) {
  const {
    totalCards = 20,
    newCardRatio = 0.3, // 30% new cards, 70% reviews
    difficultyLevel = null,
    questionTypes = ['flashcard', 'multiple_choice', 'fill_blank', 'translation_pl_en']
  } = options;

  const maxNewCards = Math.ceil(totalCards * newCardRatio);
  const maxReviewCards = totalCards - maxNewCards;

  // Get cards for review
  const reviewCards = await getCardsForReview(db, userId, deckId, maxReviewCards);
  
  // Get new cards to fill remaining slots
  const remainingSlots = totalCards - reviewCards.length;
  const newCardsNeeded = Math.min(remainingSlots, maxNewCards);
  const newCards = await getNewCardsForLearning(db, userId, deckId, difficultyLevel, newCardsNeeded);

  // Combine and shuffle cards
  const allCards = [...reviewCards, ...newCards];
  
  // Shuffle for variety
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }

  return {
    cards: allCards.slice(0, totalCards),
    metadata: {
      totalCards: allCards.length,
      reviewCards: reviewCards.length,
      newCards: newCards.length,
      deckId: deckId,
      sessionType: 'mixed',
      questionTypes: questionTypes
    }
  };
}

module.exports = {
  calculateNextReview,
  calculateResponseTimeBonus,
  applyDifficultyAdjustment,
  applyQuestionTypeModifier,
  calculateMasteryLevel,
  getCardsForReview,
  getNewCardsForLearning,
  generateStudySession
};