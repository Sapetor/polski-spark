/**
 * T034: Session middleware for progression integration
 * Middleware to integrate progression updates with session completion
 */

const ProgressionService = require('../services/ProgressionService');
const DifficultyService = require('../services/DifficultyService');

/**
 * Middleware to automatically update progression when sessions complete
 */
const updateProgressionOnSessionComplete = async (req, res, next) => {
  // Store original res.json to intercept responses
  const originalJson = res.json;

  res.json = async function(data) {
    try {
      // Check if this is a session completion response
      if (shouldUpdateProgression(req, data)) {
        const progressionUpdate = await handleSessionProgression(req, data);

        // Add progression data to response
        if (progressionUpdate) {
          data.progression = progressionUpdate;
        }
      }
    } catch (error) {
      console.error('Error updating progression:', error);
      // Don't fail the request if progression update fails
    }

    // Call original res.json with potentially modified data
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Determine if progression should be updated based on request and response
 */
function shouldUpdateProgression(req, responseData) {
  // Check for session completion indicators
  const isSessionComplete = (
    // Learning session completion
    (req.path.includes('/complete') || req.path.includes('/finish')) ||
    // Question checking that indicates session activity
    (req.path.includes('/check-answer') && responseData.sessionComplete) ||
    // Explicit session data in response
    (responseData.sessionStats || responseData.sessionSummary)
  );

  // Must have user identification
  const hasUserId = req.params.userId || req.body.userId || responseData.userId;

  // Must have session performance data
  const hasSessionData = (
    responseData.totalQuestions &&
    responseData.correctAnswers !== undefined
  ) || (
    responseData.sessionStats &&
    responseData.sessionStats.totalQuestions &&
    responseData.sessionStats.correctAnswers !== undefined
  );

  return isSessionComplete && hasUserId && hasSessionData;
}

/**
 * Handle progression update for completed session
 */
async function handleSessionProgression(req, responseData) {
  try {
    const userId = req.params.userId || req.body.userId || responseData.userId;

    if (!userId) {
      console.warn('No user ID available for progression update');
      return null;
    }

    // Extract session data from response
    const sessionData = extractSessionData(req, responseData);

    if (!sessionData) {
      console.warn('No valid session data for progression update');
      return null;
    }

    // Update progression
    const progressionResult = await ProgressionService.updateProgression(userId, sessionData);

    console.log(`Progression updated for user ${userId}:`, {
      xpEarned: progressionResult.xpEarned,
      levelUp: progressionResult.levelUp,
      newLevel: progressionResult.newLevel,
      newStreak: progressionResult.newStreak
    });

    return progressionResult;

  } catch (error) {
    console.error('Error in handleSessionProgression:', error);
    return null;
  }
}

/**
 * Extract session data from request and response
 */
function extractSessionData(req, responseData) {
  let sessionData = {};

  // Try to extract from response data first
  if (responseData.sessionStats) {
    sessionData = {
      questionsAnswered: responseData.sessionStats.totalQuestions,
      correctAnswers: responseData.sessionStats.correctAnswers,
      sessionDuration: responseData.sessionStats.duration || 300, // Default 5 minutes
    };
  } else if (responseData.totalQuestions) {
    sessionData = {
      questionsAnswered: responseData.totalQuestions,
      correctAnswers: responseData.correctAnswers,
      sessionDuration: responseData.duration || 300,
    };
  }

  // Try to extract from request body
  if (!sessionData.questionsAnswered && req.body) {
    if (req.body.sessionData) {
      sessionData = { ...req.body.sessionData };
    } else if (req.body.questionsAnswered) {
      sessionData = {
        questionsAnswered: req.body.questionsAnswered,
        correctAnswers: req.body.correctAnswers,
        sessionDuration: req.body.sessionDuration || req.body.duration || 300,
      };
    }
  }

  // Add optional fields if available
  if (req.body.startingDifficulty) {
    sessionData.startingDifficulty = req.body.startingDifficulty;
  }

  if (req.body.averageCardDifficulty) {
    sessionData.averageCardDifficulty = req.body.averageCardDifficulty;
  }

  // Calculate average difficulty if cards are available
  if (responseData.cards && Array.isArray(responseData.cards)) {
    const cardsWithDifficulty = responseData.cards.filter(card => card.difficulty);
    if (cardsWithDifficulty.length > 0) {
      const avgDifficulty = cardsWithDifficulty.reduce(
        (sum, card) => sum + (card.difficulty.totalDifficulty || 0),
        0
      ) / cardsWithDifficulty.length;
      sessionData.averageCardDifficulty = avgDifficulty;
    }
  }

  // Validate session data
  if (!sessionData.questionsAnswered || sessionData.correctAnswers === undefined) {
    return null;
  }

  return sessionData;
}

/**
 * Middleware to add difficulty-based card selection to deck endpoints
 */
const enhanceCardSelectionWithDifficulty = async (req, res, next) => {
  // Store original res.json to intercept responses
  const originalJson = res.json;

  res.json = async function(data) {
    try {
      // Check if this is a cards response that should be enhanced with difficulty
      if (shouldEnhanceWithDifficulty(req, data)) {
        const enhancedData = await enhanceCardsWithDifficulty(req, data);
        if (enhancedData) {
          data = enhancedData;
        }
      }
    } catch (error) {
      console.error('Error enhancing cards with difficulty:', error);
      // Don't fail the request if enhancement fails
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Determine if card response should be enhanced with difficulty
 */
function shouldEnhanceWithDifficulty(req, responseData) {
  return (
    // Deck card endpoints
    req.path.includes('/decks/') &&
    req.path.includes('/cards') &&
    // Has user context for difficulty matching
    (req.params.userId || req.query.userId) &&
    // Has cards in response
    Array.isArray(responseData) ||
    (responseData.cards && Array.isArray(responseData.cards))
  );
}

/**
 * Enhance card selection with difficulty-based filtering
 */
async function enhanceCardsWithDifficulty(req, responseData) {
  try {
    const userId = req.params.userId || req.query.userId;
    const deckId = req.params.deckId;

    if (!userId || !deckId) {
      return null;
    }

    // Get user progression for difficulty targeting
    const userProgression = await ProgressionService.getUserProgression(userId);

    // Get cards appropriate for user level
    const appropriateCards = await DifficultyService.getCardsForUserLevel(
      deckId,
      userProgression,
      {
        limit: req.query.limit || 20,
        variance: req.query.variance || 5
      }
    );

    // Replace response data with difficulty-enhanced cards
    if (Array.isArray(responseData)) {
      return appropriateCards;
    } else if (responseData.cards) {
      return {
        ...responseData,
        cards: appropriateCards,
        progressionEnhanced: true,
        userLevel: userProgression.level,
        targetDifficultyRange: userProgression.difficultyRange
      };
    }

    return null;

  } catch (error) {
    console.error('Error enhancing cards with difficulty:', error);
    return null;
  }
}

/**
 * Middleware to calculate card difficulties for new deck uploads
 */
const calculateDifficultiesOnUpload = async (req, res, next) => {
  // Store original res.json to intercept responses
  const originalJson = res.json;

  res.json = async function(data) {
    try {
      // Check if this is a successful deck upload
      if (isDeckUploadSuccess(req, data)) {
        await handleDeckDifficultyCalculation(req, data);
      }
    } catch (error) {
      console.error('Error calculating difficulties on upload:', error);
      // Don't fail the request if difficulty calculation fails
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Determine if this is a successful deck upload
 */
function isDeckUploadSuccess(req, responseData) {
  return (
    req.path.includes('/upload') &&
    req.method === 'POST' &&
    responseData.success &&
    (responseData.deckId || responseData.deck?.id)
  );
}

/**
 * Handle difficulty calculation for newly uploaded deck
 */
async function handleDeckDifficultyCalculation(req, responseData) {
  try {
    const deckId = responseData.deckId || responseData.deck?.id;

    if (!deckId) {
      console.warn('No deck ID available for difficulty calculation');
      return;
    }

    // Start difficulty calculation in background
    console.log(`Starting difficulty calculation for deck ${deckId}`);

    // Don't await this - let it run in background
    DifficultyService.calculateDeckDifficulties(deckId)
      .then(result => {
        console.log(`Difficulty calculation completed for deck ${deckId}:`, result);
      })
      .catch(error => {
        console.error(`Error calculating difficulties for deck ${deckId}:`, error);
      });

  } catch (error) {
    console.error('Error in handleDeckDifficultyCalculation:', error);
  }
}

module.exports = {
  updateProgressionOnSessionComplete,
  enhanceCardSelectionWithDifficulty,
  calculateDifficultiesOnUpload
};