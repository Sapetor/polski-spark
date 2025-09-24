const express = require('express');
const knex = require('knex');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const cors = require('cors');
const { classifyCardDifficulty, classifyAllCards } = require('./utils/cardClassifier');
const { generateQuestion, generateEnhancedQuestion, checkAnswer, checkEnhancedAnswer } = require('./utils/questionGenerator');
const {
  calculateNextReview,
  getCardsForReview,
  getNewCardsForLearning,
  generateStudySession
} = require('./utils/spacedRepetition');

// Import new Anki utilities
const AnkiValidator = require('./utils/ankiValidator');
const AnkiParser = require('./utils/ankiParser');
const ImportTracker = require('./utils/importTracker');

const app = express();
const port = 3001; // Using a different port than React's default 3000

// Knex configuration for SQLite3
const knexConfig = require('./knexfile.js');
const db = knex(knexConfig.development);

// Initialize Anki utilities
const ankiValidator = new AnkiValidator();
const ankiParser = new AnkiParser(knexConfig.development);
const importTracker = new ImportTracker(db);

// Ensure the data and uploads directories exist
const dataDir = path.resolve(__dirname, 'data');
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json());

// Import progression routes with error handling
try {
  console.log('Loading progression routes...');
  const progressionRoutes = require('./src/routes/progression');
  app.use('/api', progressionRoutes);
  console.log('Progression routes loaded successfully');
} catch (error) {
  console.error('Error loading progression routes:', error);
}

try {
  console.log('Loading card routes...');
  const cardRoutes = require('./src/routes/cards');
  app.use('/api', cardRoutes);
  console.log('Card routes loaded successfully');
} catch (error) {
  console.error('Error loading card routes:', error);
}

// Basic route
app.get('/', (req, res) => {
  res.send('Polski Lokalny Backend is running!');
});

// Simple test route
app.get('/api/test-simple', (req, res) => {
  res.json({ message: 'Simple test working!' });
});

// Test progression route directly in main server
app.get('/api/progression/test', async (req, res) => {
  try {
    // Test database connection
    const UserProgression = require('./src/models/UserProgression');

    // Create a test user progression
    const testUserId = 1;
    let progression = await UserProgression.findByUserId(testUserId);

    if (!progression) {
      progression = await UserProgression.create({
        userId: testUserId,
        level: 1,
        xp: 0,
        streak: 0,
        currentDifficulty: 10
      });
    }

    res.json({
      message: 'Progression system is working!',
      progression: progression.toJSON()
    });
  } catch (error) {
    console.error('Progression test error:', error);
    res.status(500).json({
      error: 'Progression system error',
      details: error.message
    });
  }
});

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await db('users')
      .leftJoin('user_progression', 'users.id', 'user_progression.user_id')
      .select(
        'users.id',
        'users.name',
        'users.created_at',
        'users.updated_at',
        db.raw('COALESCE(user_progression.xp, 0) as xp'),
        db.raw('COALESCE(user_progression.level, 1) as level'),
        db.raw('COALESCE(user_progression.streak, 0) as streak')
      );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const [userId] = await db('users').insert({ name });
    const user = await db('users').where({ id: userId }).first();
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'User with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all decks
app.get('/api/decks', async (req, res) => {
  try {
    const decks = await db('decks').select('*');
    res.json(decks);
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

// Update deck name
app.put('/api/decks/:deckId', async (req, res) => {
  try {
    const { deckId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Deck name is required' });
    }

    const updated = await db('decks')
      .where({ id: deckId })
      .update({
        name: name.trim(),
        updated_at: new Date()
      });

    if (updated === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Return the updated deck
    const deck = await db('decks').where({ id: deckId }).first();
    res.json(deck);
  } catch (error) {
    console.error('Error updating deck:', error);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// Get cards for a specific deck
app.get('/api/decks/:deckId/cards', async (req, res) => {
  try {
    const { deckId } = req.params;
    const cards = await db('cards').where({ deck_id: deckId }).select('*');
    res.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get user progress
app.get('/api/users/:userId/progress', async (req, res) => {
  try {
    const { userId } = req.params;
    const progress = await db('user_progress')
      .join('cards', 'user_progress.card_id', 'cards.id')
      .join('decks', 'cards.deck_id', 'decks.id')
      .where({ user_id: userId })
      .select('user_progress.*', 'cards.front', 'cards.back', 'decks.name as deck_name');
    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

// Update user progress
app.post('/api/users/:userId/progress', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cardId, ease, interval, repetitions } = req.body;
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    await db('user_progress')
      .insert({
        user_id: userId,
        card_id: cardId,
        ease_factor: ease,
        interval,
        repetitions,
        next_review: nextReview,
        last_reviewed: new Date()
      })
      .onConflict(['user_id', 'card_id'])
      .merge();
    
    res.status(200).json({ message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Classify existing cards
app.post('/api/classify-cards', async (req, res) => {
  try {
    console.log('Starting card classification...');
    const updatedCount = await classifyAllCards(db);
    res.status(200).json({ 
      message: 'Card classification completed',
      cardsUpdated: updatedCount
    });
  } catch (error) {
    console.error('Error classifying cards:', error);
    res.status(500).json({ error: 'Failed to classify cards' });
  }
});

// Get cards by difficulty level
app.get('/api/decks/:deckId/cards/:difficulty', async (req, res) => {
  try {
    const { deckId, difficulty } = req.params;
    const cards = await db('cards')
      .where({ deck_id: deckId, difficulty_level: difficulty })
      .select('*');
    res.json(cards);
  } catch (error) {
    console.error('Error fetching cards by difficulty:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get cards by topic category
app.get('/api/decks/:deckId/topics/:topic/cards', async (req, res) => {
  try {
    const { deckId, topic } = req.params;
    const cards = await db('cards')
      .where({ deck_id: deckId, topic_category: topic })
      .select('*');
    res.json(cards);
  } catch (error) {
    console.error('Error fetching cards by topic:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get deck statistics
app.get('/api/decks/:deckId/stats', async (req, res) => {
  try {
    const { deckId } = req.params;
    
    const totalCards = await db('cards').where({ deck_id: deckId }).count('* as count').first();
    const difficultyStats = await db('cards')
      .where({ deck_id: deckId })
      .groupBy('difficulty_level')
      .select('difficulty_level')
      .count('* as count');
    
    const topicStats = await db('cards')
      .where({ deck_id: deckId })
      .groupBy('topic_category')
      .select('topic_category')
      .count('* as count');
    
    res.json({
      totalCards: totalCards.count,
      difficultyDistribution: difficultyStats,
      topicDistribution: topicStats
    });
  } catch (error) {
    console.error('Error fetching deck stats:', error);
    res.status(500).json({ error: 'Failed to fetch deck statistics' });
  }
});

// Generate a lesson with mixed question types
app.get('/api/decks/:deckId/lesson', async (req, res) => {
  try {
    const { deckId } = req.params;
    const { 
      difficulty = 'beginner', 
      questionTypes = 'multiple_choice,fill_blank,translation_pl_en',
      count = 10,
      userId = null,
      useSpacedRepetition = 'false'
    } = req.query;
    
    const requestedTypes = questionTypes.split(',');
    const cardCount = parseInt(count);
    let cards = [];
    
    // Use spaced repetition if user is provided and requested
    if (userId && useSpacedRepetition === 'true') {
      try {
        console.log('🎯 Using spaced repetition with cardCount:', cardCount);
        const session = await generateStudySession(db, parseInt(userId), parseInt(deckId), {
          totalCards: cardCount,
          newCardRatio: 0.3,
          difficultyLevel: difficulty,
          questionTypes: requestedTypes
        });
        console.log('📊 Spaced repetition session:', session.metadata);
        cards = session.cards;
      } catch (spacedRepetitionError) {
        console.log('Spaced repetition failed, falling back to random selection:', spacedRepetitionError);
        // Fall back to random selection
        cards = await db('cards')
          .where({ deck_id: deckId, difficulty_level: difficulty })
          .orderByRaw('RANDOM()')
          .limit(cardCount * 2);
      }
    } else {
      // Original random selection method
      cards = await db('cards')
        .where({ deck_id: deckId, difficulty_level: difficulty })
        .orderByRaw('RANDOM()')
        .limit(cardCount * 2); // Get extra cards for distractors
    }
    
    if (cards.length === 0) {
      return res.status(404).json({ error: 'No cards found for this difficulty level' });
    }
    
    // Generate questions
    const questions = [];
    const usedCards = new Set();
    
    for (let i = 0; i < Math.min(cardCount, cards.length); i++) {
      const card = cards[i];
      usedCards.add(card.id);
      
      // Randomly select question type
      const questionType = requestedTypes[Math.floor(Math.random() * requestedTypes.length)];
      
      // Get other cards for distractors (exclude used cards)
      const otherCards = cards.filter(c => !usedCards.has(c.id));
      
      // Use enhanced question generation for Anki cards
      const question = generateEnhancedQuestion(card, questionType, otherCards);
      questions.push({
        ...question,
        difficulty: card.difficulty_level,
        topic: card.topic_category
      });
    }
    
    res.json({
      deckId: parseInt(deckId),
      difficulty,
      totalQuestions: questions.length,
      questions,
      spacedRepetition: userId && useSpacedRepetition === 'true'
    });
  } catch (error) {
    console.error('Error generating lesson:', error);
    res.status(500).json({ error: 'Failed to generate lesson' });
  }
});

// Check answer for a question
app.post('/api/check-answer', async (req, res) => {
  try {
    const { question, userAnswer, userId, cardId, timeTaken } = req.body;

    if (!question || !userAnswer || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use enhanced answer checking for all question types
    const result = checkEnhancedAnswer(question, userAnswer);

    // Check if this is a grammar question (no cardId) or a vocabulary question
    const isGrammarQuestion = !cardId || question.grammarTopic;

    let currentProgress = null;
    let card = null;
    let updatedProgress = null;

    if (!isGrammarQuestion) {
      // For vocabulary questions, get card progress
      currentProgress = await db('user_progress')
        .where({ user_id: userId, card_id: cardId })
        .first();

      // Get card info for difficulty level
      card = await db('cards').where({ id: cardId }).first();
    }

    // Only do spaced repetition and progress tracking for vocabulary questions
    if (!isGrammarQuestion) {
      // Calculate new spaced repetition schedule
      updatedProgress = calculateNextReview(
        currentProgress,
        result.correct,
        timeTaken,
        question.type,
        card?.difficulty_level || 'beginner'
      );

      // Update or insert user progress
      try {
        if (currentProgress) {
          await db('user_progress')
            .where({ user_id: userId, card_id: cardId })
            .update(updatedProgress);
        } else {
          await db('user_progress').insert({
            user_id: userId,
            card_id: cardId,
            ...updatedProgress
          });
        }
      } catch (progressError) {
        console.error('Error updating user progress:', progressError);
        // Continue even if progress update fails
      }

      // Record the exercise result for vocabulary questions
      try {
        await db('exercise_results').insert({
          user_id: userId,
          card_id: cardId,
          question_type: question.type,
          correct: result.correct,
          user_answer: userAnswer,
          correct_answer: question.correctAnswer,
          time_taken_ms: timeTaken || null
        });
      } catch (insertError) {
        console.error('Error recording exercise result:', insertError);
        // Continue even if recording fails
      }
    }

    // Update user progression
    try {
      console.log('Starting progression update for user:', userId);
      const ProgressionService = require('./src/services/ProgressionService');
      console.log('ProgressionService loaded successfully');

      // Prepare session data for progression update
      const sessionData = {
        questionsAnswered: 1,
        correctAnswers: result.correct ? 1 : 0,
        sessionDuration: timeTaken || 5000, // Default 5 seconds
        averageCardDifficulty: card?.difficulty_score || 25
      };
      console.log('Session data prepared:', sessionData);

      // Update progression
      console.log('Calling ProgressionService.updateProgression...');
      const progressionUpdate = await ProgressionService.updateProgression(userId, sessionData);
      console.log('Progression update result:', progressionUpdate);

      if (progressionUpdate) {
        console.log(`Progression updated for user ${userId}:`, {
          xpEarned: progressionUpdate.xpEarned,
          levelUp: progressionUpdate.levelUp,
          newLevel: progressionUpdate.newLevel
        });

        // Add progression info to result
        result.progression = {
          xpEarned: progressionUpdate.xpEarned,
          levelUp: progressionUpdate.levelUp,
          newLevel: progressionUpdate.newLevel,
          newXP: progressionUpdate.newXP,
          streak: progressionUpdate.newStreak
        };
      } else {
        console.log('No progression update returned');
      }
    } catch (progressionError) {
      console.error('Error updating progression:', progressionError);
      console.error('Error stack:', progressionError.stack);
      // Continue even if progression update fails
    }

    // Add spaced repetition info to result (only for vocabulary questions)
    if (!isGrammarQuestion && updatedProgress) {
      result.spacedRepetition = {
        nextReview: updatedProgress.next_review,
        interval: updatedProgress.interval,
        masteryLevel: updatedProgress.mastery_level,
        easeFactor: updatedProgress.ease_factor
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error checking answer:', error);
    res.status(500).json({ error: 'Failed to check answer' });
  }
});

// Get available question types
app.get('/api/question-types', async (req, res) => {
  try {
    const questionTypes = await db('question_types').where({ active: true }).select('*');
    res.json(questionTypes);
  } catch (error) {
    console.error('Error fetching question types:', error);
    res.status(500).json({ error: 'Failed to fetch question types' });
  }
});

// Get cards due for review
app.get('/api/users/:userId/reviews', async (req, res) => {
  try {
    const { userId } = req.params;
    const { deckId, limit = 20 } = req.query;
    
    const reviewCards = await getCardsForReview(
      db, 
      parseInt(userId), 
      deckId ? parseInt(deckId) : null, 
      parseInt(limit)
    );
    
    res.json({
      userId: parseInt(userId),
      deckId: deckId ? parseInt(deckId) : null,
      totalReviews: reviewCards.length,
      cards: reviewCards
    });
  } catch (error) {
    console.error('Error fetching review cards:', error);
    res.status(500).json({ error: 'Failed to fetch review cards' });
  }
});

// Generate optimized study session with spaced repetition
app.get('/api/users/:userId/study-session', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      deckId, 
      totalCards = 20, 
      newCardRatio = 0.3, 
      difficultyLevel,
      questionTypes = 'multiple_choice,fill_blank,translation_pl_en' 
    } = req.query;
    
    const questionTypeArray = questionTypes.split(',');
    
    const session = await generateStudySession(db, parseInt(userId), 
      deckId ? parseInt(deckId) : null, {
        totalCards: parseInt(totalCards),
        newCardRatio: parseFloat(newCardRatio),
        difficultyLevel,
        questionTypes: questionTypeArray
      });
    
    res.json({
      ...session,
      userId: parseInt(userId),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating study session:', error);
    res.status(500).json({ error: 'Failed to generate study session' });
  }
});

// Get yesterday's vocabulary for review
app.get('/api/users/:userId/review-words', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    // Get yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Get cards that were practiced yesterday
    const reviewCards = await db('exercise_results')
      .join('cards', 'exercise_results.card_id', 'cards.id')
      .join('decks', 'cards.deck_id', 'decks.id')
      .where('exercise_results.user_id', userId)
      .whereBetween('exercise_results.created_at', [yesterday, yesterdayEnd])
      .groupBy('cards.id', 'cards.front', 'cards.back', 'cards.difficulty_level', 'decks.name')
      .select(
        'cards.id as cardId',
        'cards.front',
        'cards.back',
        'cards.difficulty_level as difficulty',
        'decks.name as deckName',
        db.raw('COUNT(*) as practice_count'),
        db.raw('SUM(CASE WHEN exercise_results.correct THEN 1 ELSE 0 END) as correct_count'),
        db.raw('AVG(CASE WHEN exercise_results.correct THEN 1.0 ELSE 0.0 END) as accuracy')
      )
      .orderBy('practice_count', 'desc')
      .limit(limit);

    res.json({
      userId: parseInt(userId),
      reviewDate: yesterday.toISOString().split('T')[0],
      totalWords: reviewCards.length,
      words: reviewCards.map(card => ({
        cardId: card.cardId,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        deckName: card.deckName,
        practiceCount: card.practice_count,
        correctCount: card.correct_count,
        accuracy: Math.round(card.accuracy * 100)
      }))
    });
  } catch (error) {
    console.error('Error fetching review words:', error);
    res.status(500).json({ error: 'Failed to fetch review words' });
  }
});

// Start a review lesson with yesterday's words
app.post('/api/users/:userId/review-lesson', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      questionTypes = 'multiple_choice,fill_blank,translation_pl_en',
      count = 10
    } = req.body;

    const requestedTypes = questionTypes.split(',');
    const cardCount = parseInt(count);

    // Get yesterday's vocabulary
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Get cards practiced yesterday, prioritizing incorrectly answered ones
    const reviewCards = await db('exercise_results')
      .join('cards', 'exercise_results.card_id', 'cards.id')
      .where('exercise_results.user_id', userId)
      .whereBetween('exercise_results.created_at', [yesterday, yesterdayEnd])
      .groupBy('cards.id', 'cards.front', 'cards.back', 'cards.difficulty_level', 'cards.topic_category')
      .select(
        'cards.*',
        db.raw('AVG(CASE WHEN exercise_results.correct THEN 1.0 ELSE 0.0 END) as accuracy'),
        db.raw('COUNT(*) as practice_count')
      )
      .orderBy('accuracy', 'asc') // Start with words that were answered incorrectly
      .orderBy('practice_count', 'desc')
      .limit(cardCount * 2); // Get extra for distractors

    if (reviewCards.length === 0) {
      return res.status(404).json({ error: 'No words practiced yesterday' });
    }

    // Generate questions using the enhanced question generator
    const questions = [];
    const usedCards = new Set();

    for (let i = 0; i < Math.min(cardCount, reviewCards.length); i++) {
      const card = reviewCards[i];
      usedCards.add(card.id);

      // Randomly select question type
      const questionType = requestedTypes[Math.floor(Math.random() * requestedTypes.length)];

      // Get other cards for distractors
      const otherCards = reviewCards.filter(c => !usedCards.has(c.id));

      const question = generateEnhancedQuestion(card, questionType, otherCards);
      questions.push({
        ...question,
        difficulty: card.difficulty_level,
        topic: card.topic_category,
        reviewInfo: {
          accuracy: Math.round(card.accuracy * 100),
          practiceCount: card.practice_count
        }
      });
    }

    res.json({
      lessonType: 'review',
      reviewDate: yesterday.toISOString().split('T')[0],
      totalQuestions: questions.length,
      questions,
      metadata: {
        wordsReviewed: reviewCards.length,
        averageAccuracy: Math.round(
          reviewCards.reduce((sum, card) => sum + card.accuracy, 0) / reviewCards.length * 100
        )
      }
    });
  } catch (error) {
    console.error('Error generating review lesson:', error);
    res.status(500).json({ error: 'Failed to generate review lesson' });
  }
});

// Generate random quiz from all learned words
app.post('/api/users/:userId/random-quiz', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      questionTypes = 'multiple_choice,fill_blank,translation_pl_en',
      count = 15,
      difficulty = 'all',
      deckIds = null
    } = req.body;

    const requestedTypes = questionTypes.split(',');
    const cardCount = parseInt(count);

    // Base query for cards the user has practiced
    let query = db('exercise_results')
      .join('cards', 'exercise_results.card_id', 'cards.id')
      .join('decks', 'cards.deck_id', 'decks.id')
      .where('exercise_results.user_id', userId);

    // Apply deck filter if specified
    if (deckIds && deckIds.length > 0) {
      query = query.whereIn('cards.deck_id', deckIds);
    }

    // Apply difficulty filter if not 'all'
    if (difficulty !== 'all') {
      query = query.where('cards.difficulty_level', difficulty);
    }

    // Get cards with performance stats, prioritizing cards with mixed performance
    const learntCards = await query
      .groupBy('cards.id', 'cards.front', 'cards.back', 'cards.difficulty_level', 'cards.topic_category', 'decks.name')
      .select(
        'cards.*',
        'decks.name as deckName',
        db.raw('COUNT(*) as practice_count'),
        db.raw('AVG(CASE WHEN exercise_results.correct THEN 1.0 ELSE 0.0 END) as accuracy'),
        db.raw('MAX(exercise_results.created_at) as last_practiced')
      )
      .having('practice_count', '>=', 1) // Only include cards practiced at least once
      .orderByRaw('ABS(accuracy - 0.75) ASC') // Prioritize cards with ~75% accuracy (not too easy, not too hard)
      .orderBy('last_practiced', 'desc')
      .limit(cardCount * 3); // Get extra for variety

    if (learntCards.length === 0) {
      return res.status(404).json({ error: 'No learned words found. Practice some lessons first!' });
    }

    // Randomly select cards from the learnt set
    const shuffledCards = learntCards.sort(() => Math.random() - 0.5);
    const selectedCards = shuffledCards.slice(0, Math.min(cardCount, learntCards.length));

    // Generate questions
    const questions = [];
    const usedCards = new Set();

    for (let i = 0; i < selectedCards.length; i++) {
      const card = selectedCards[i];
      usedCards.add(card.id);

      // Randomly select question type
      const questionType = requestedTypes[Math.floor(Math.random() * requestedTypes.length)];

      // Get other cards for distractors
      const otherCards = learntCards.filter(c => !usedCards.has(c.id));

      const question = generateEnhancedQuestion(card, questionType, otherCards);
      questions.push({
        ...question,
        difficulty: card.difficulty_level,
        topic: card.topic_category,
        quizInfo: {
          accuracy: Math.round(card.accuracy * 100),
          practiceCount: card.practice_count,
          deckName: card.deckName,
          lastPracticed: card.last_practiced
        }
      });
    }

    // Calculate quiz statistics
    const avgAccuracy = Math.round(
      selectedCards.reduce((sum, card) => sum + card.accuracy, 0) / selectedCards.length * 100
    );

    const difficultyDistribution = selectedCards.reduce((dist, card) => {
      dist[card.difficulty_level] = (dist[card.difficulty_level] || 0) + 1;
      return dist;
    }, {});

    res.json({
      lessonType: 'random_quiz',
      totalQuestions: questions.length,
      questions,
      metadata: {
        wordsIncluded: selectedCards.length,
        totalWordsLearned: learntCards.length,
        averageAccuracy: avgAccuracy,
        difficultyDistribution,
        uniqueDecks: [...new Set(selectedCards.map(card => card.deckName))]
      }
    });
  } catch (error) {
    console.error('Error generating random quiz:', error);
    res.status(500).json({ error: 'Failed to generate random quiz' });
  }
});

// Generate grammar practice lesson
app.post('/api/users/:userId/grammar-practice', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      grammarTopics = ['word_order', 'cases', 'verb_forms'],
      count = 10,
      difficulty = 'beginner'
    } = req.body;

    // Get some vocabulary words to use in grammar exercises
    const vocabularyCards = await db('exercise_results')
      .join('cards', 'exercise_results.card_id', 'cards.id')
      .where('exercise_results.user_id', userId)
      .where('cards.difficulty_level', difficulty)
      .groupBy('cards.id', 'cards.front', 'cards.back')
      .select('cards.front', 'cards.back')
      .limit(50);

    // If user hasn't practiced enough words, get some random ones
    if (vocabularyCards.length < 10) {
      const additionalCards = await db('cards')
        .where('difficulty_level', difficulty)
        .orderByRaw('RANDOM()')
        .limit(20)
        .select('front', 'back');
      vocabularyCards.push(...additionalCards);
    }

    if (vocabularyCards.length === 0) {
      return res.status(404).json({ error: 'No vocabulary found for grammar practice' });
    }

    // Generate grammar exercises
    const questions = [];
    const grammarRules = getGrammarRules(difficulty);

    // Create pool of all possible topic+rule combinations
    const topicRuleCombinations = [];
    grammarTopics.forEach(topic => {
      grammarRules[topic].forEach(rule => {
        topicRuleCombinations.push({ topic, rule });
      });
    });

    // Shuffle the combinations to ensure randomness
    for (let i = topicRuleCombinations.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topicRuleCombinations[i], topicRuleCombinations[j]] = [topicRuleCombinations[j], topicRuleCombinations[i]];
    }

    // Use unique combinations up to the requested count
    const questionsToGenerate = Math.min(parseInt(count), topicRuleCombinations.length);

    for (let i = 0; i < questionsToGenerate; i++) {
      const { topic, rule } = topicRuleCombinations[i];

      // Use some vocabulary in the exercise
      const words = vocabularyCards.slice(i * 2, (i * 2) + 4).map(card => ({
        polish: card.front,
        english: card.back
      }));

      const question = generateGrammarQuestion(topic, rule, words, difficulty);
      questions.push({
        ...question,
        grammarTopic: topic,
        difficulty: difficulty,
        explanation: rule.explanation,
        cardId: null // Grammar questions don't have a cardId
      });
    }

    res.json({
      lessonType: 'grammar_practice',
      totalQuestions: questions.length,
      questions,
      metadata: {
        grammarTopics: grammarTopics,
        difficulty: difficulty,
        vocabularyWordsUsed: Math.min(vocabularyCards.length, count * 2)
      }
    });
  } catch (error) {
    console.error('Error generating grammar practice:', error);
    res.status(500).json({ error: 'Failed to generate grammar practice' });
  }
});

// Grammar rules and patterns
function getGrammarRules(difficulty) {
  const rules = {
    beginner: {
      word_order: [
        {
          pattern: 'Subject + Verb + Object',
          explanation: 'Basic Polish word order: Subject comes first, then verb, then object.',
          examples: ['Kot je rybę (Cat eats fish)', 'Maria czyta książkę (Maria reads a book)']
        },
        {
          pattern: 'Question word + Verb + Subject',
          explanation: 'In questions, the question word comes first, followed by the verb.',
          examples: ['Co robisz? (What are you doing?)', 'Gdzie mieszkasz? (Where do you live?)']
        }
      ],
      cases: [
        {
          pattern: 'Nominative (mianownik)',
          explanation: 'The nominative case is used for the subject of the sentence.',
          examples: ['Pies szczeka (Dog barks)', 'Dziecko płacze (Child cries)']
        },
        {
          pattern: 'Accusative (biernik)',
          explanation: 'The accusative case is used for direct objects.',
          examples: ['Czytam książkę (I read a book)', 'Kupuję chleb (I buy bread)']
        }
      ],
      verb_forms: [
        {
          pattern: 'Present tense - ja',
          explanation: 'First person singular present tense usually ends in -ę or -ę',
          examples: ['robię (I do)', 'jestem (I am)', 'mam (I have)']
        },
        {
          pattern: 'Present tense - ty',
          explanation: 'Second person singular present tense usually ends in -sz',
          examples: ['robisz (you do)', 'jesteś (you are)', 'masz (you have)']
        }
      ]
    },
    intermediate: {
      genitive_case: [
        {
          pattern: 'Genitive for possession',
          explanation: 'The genitive case shows ownership or relationship.',
          examples: ['dom mojego brata (my brother\'s house)', 'książka nauczyciela (teacher\'s book)']
        },
        {
          pattern: 'Genitive with numbers',
          explanation: 'Numbers 5 and above require genitive plural.',
          examples: ['pięć książek (five books)', 'dziesięć kotów (ten cats)']
        }
      ],
      dative_case: [
        {
          pattern: 'Dative for indirect objects',
          explanation: 'The dative case shows to whom or for whom something is done.',
          examples: ['daję książkę bratu (I give a book to my brother)', 'kupuję prezent mamie (I buy a gift for mom)']
        },
        {
          pattern: 'Dative with verbs',
          explanation: 'Some verbs always take dative objects.',
          examples: ['pomagam ci (I help you)', 'dziękuję tobie (I thank you)']
        }
      ],
      instrumental_case: [
        {
          pattern: 'Instrumental for tools',
          explanation: 'The instrumental case shows what tool or method is used.',
          examples: ['piszę długopisem (I write with a pen)', 'jadę autobusem (I go by bus)']
        },
        {
          pattern: 'Instrumental with być',
          explanation: 'Use instrumental for professions and states with być.',
          examples: ['jestem nauczycielem (I am a teacher)', 'ona jest lekarką (she is a doctor)']
        }
      ],
      locative_case: [
        {
          pattern: 'Locative for location',
          explanation: 'The locative case shows location, always with prepositions.',
          examples: ['mieszkam w domu (I live at home)', 'jestem na uniwersytecie (I am at university)']
        },
        {
          pattern: 'Locative for topics',
          explanation: 'Use locative when talking about something.',
          examples: ['mówię o tobie (I talk about you)', 'myślę o przyszłości (I think about the future)']
        }
      ]
    },
    advanced: {
      aspects: [
        {
          pattern: 'Perfective vs Imperfective',
          explanation: 'Polish verbs have aspects that show how actions unfold in time.',
          examples: ['czytam (I am reading - ongoing)', 'przeczytam (I will read - completed)']
        },
        {
          pattern: 'Aspectual pairs',
          explanation: 'Most verbs come in pairs with the same meaning but different aspects.',
          examples: ['robić/zrobić (to do)', 'pisać/napisać (to write)']
        }
      ],
      conditional_mood: [
        {
          pattern: 'Conditional formation',
          explanation: 'The conditional mood uses past tense + conditional particles.',
          examples: ['robiłbym (I would do)', 'mogłaby (she could)']
        },
        {
          pattern: 'Conditional uses',
          explanation: 'Use conditional for hypothetical situations and polite requests.',
          examples: ['Gdybym miał czas... (If I had time...)', 'Czy mógłbyś pomóc? (Could you help?)']
        }
      ]
    }
  };

  return rules[difficulty] || rules.beginner;
}

function generateGrammarQuestion(topic, rule, words, difficulty) {
  switch (topic) {
    case 'word_order':
      return generateWordOrderQuestion(rule, words);
    case 'cases':
      return generateCaseQuestion(rule, words);
    case 'verb_forms':
      return generateVerbFormQuestion(rule, words);
    case 'genitive_case':
      return generateGenitiveQuestion(rule, words);
    case 'dative_case':
      return generateDativeQuestion(rule, words);
    case 'instrumental_case':
      return generateInstrumentalQuestion(rule, words);
    case 'locative_case':
      return generateLocativeQuestion(rule, words);
    case 'aspects':
      return generateAspectQuestion(rule, words);
    case 'conditional_mood':
      return generateConditionalQuestion(rule, words);
    default:
      return generateWordOrderQuestion(rule, words);
  }
}

function generateWordOrderQuestion(rule, words) {
  // Use predefined simple vocabulary for grammar exercises
  const subjects = [
    { polish: 'kot', english: 'cat' },
    { polish: 'pies', english: 'dog' },
    { polish: 'Maria', english: 'Maria' },
    { polish: 'Anna', english: 'Anna' },
    { polish: 'Jan', english: 'Jan' }
  ];

  const objects = [
    { polish: 'rybę', english: 'a fish' },
    { polish: 'książkę', english: 'a book' },
    { polish: 'jabłko', english: 'an apple' },
    { polish: 'wodę', english: 'water' },
    { polish: 'chleb', english: 'bread' }
  ];

  // Define logical subject-verb-object combinations
  const sentences = [
    { subject: { polish: 'kot', english: 'cat' }, verb: { polish: 'je', english: 'eats' }, object: { polish: 'rybę', english: 'a fish' } },
    { subject: { polish: 'Maria', english: 'Maria' }, verb: { polish: 'czyta', english: 'reads' }, object: { polish: 'książkę', english: 'a book' } },
    { subject: { polish: 'Jan', english: 'Jan' }, verb: { polish: 'kupuje', english: 'buys' }, object: { polish: 'chleb', english: 'bread' } },
    { subject: { polish: 'Anna', english: 'Anna' }, verb: { polish: 'ma', english: 'has' }, object: { polish: 'jabłko', english: 'an apple' } },
    { subject: { polish: 'pies', english: 'dog' }, verb: { polish: 'je', english: 'eats' }, object: { polish: 'chleb', english: 'bread' } },
    { subject: { polish: 'Maria', english: 'Maria' }, verb: { polish: 'ma', english: 'has' }, object: { polish: 'wodę', english: 'water' } },
    { subject: { polish: 'Jan', english: 'Jan' }, verb: { polish: 'czyta', english: 'reads' }, object: { polish: 'książkę', english: 'a book' } },
    { subject: { polish: 'kot', english: 'cat' }, verb: { polish: 'ma', english: 'has' }, object: { polish: 'wodę', english: 'water' } }
  ];

  // Select a random logical sentence
  const sentence = sentences[Math.floor(Math.random() * sentences.length)];
  const subject = sentence.subject;
  const verb = sentence.verb;
  const object = sentence.object;

  const correctSentence = `${subject.polish} ${verb.polish} ${object.polish}`;
  const scrambledWords = [subject.polish, verb.polish, object.polish];

  return {
    type: 'word_order',
    question: `Arrange these words to form a correct Polish sentence:`,
    scrambledWords: scrambledWords.sort(() => Math.random() - 0.5),
    correctAnswer: correctSentence,
    options: [
      correctSentence,
      `${verb.polish} ${subject.polish} ${object.polish}`,
      `${object.polish} ${verb.polish} ${subject.polish}`,
      `${object.polish} ${subject.polish} ${verb.polish}`
    ].sort(() => Math.random() - 0.5),
    hint: `Remember: ${rule.pattern}`,
    translation: `${subject.english} ${verb.english} ${object.english}`
  };
}

function generateCaseQuestion(rule, words) {
  // Use predefined simple nouns for case practice
  const simpleNouns = [
    { polish: 'kot', english: 'cat' },
    { polish: 'pies', english: 'dog' },
    { polish: 'książka', english: 'book' },
    { polish: 'mama', english: 'mom' },
    { polish: 'tata', english: 'dad' },
    { polish: 'woda', english: 'water' }
  ];

  const word = simpleNouns[Math.floor(Math.random() * simpleNouns.length)];
  const isNominative = rule.pattern.includes('Nominative');

  if (isNominative) {
    // Nominative case question
    const options = [
      word.polish, // correct (nominative)
      word.polish + 'a', // fake accusative
      word.polish + 'em', // fake instrumental
      word.polish + 'ie' // fake dative
    ].filter((option, index, arr) => arr.indexOf(option) === index); // Remove duplicates

    // Ensure we have 4 unique options
    while (options.length < 4) {
      options.push(word.polish + 'ów');
    }

    return {
      type: 'case_selection',
      question: `Which case form should be used for the subject "${word.english}"?`,
      correctAnswer: word.polish,
      options: options.slice(0, 4).sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `The subject is in nominative case`
    };
  } else {
    // Accusative case question
    const accusativeForm = word.polish.endsWith('a') ? word.polish.slice(0, -1) + 'ę' : word.polish;
    const options = [
      accusativeForm, // correct (accusative)
      word.polish, // nominative
      word.polish + 'em', // fake instrumental
      word.polish + 'ie' // fake dative
    ].filter((option, index, arr) => arr.indexOf(option) === index); // Remove duplicates

    // Ensure we have 4 unique options
    while (options.length < 4) {
      options.push(word.polish + 'ów');
    }

    return {
      type: 'case_selection',
      question: `Which case form should be used for the direct object "${word.english}"?`,
      correctAnswer: accusativeForm,
      options: options.slice(0, 4).sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `The direct object is in accusative case`
    };
  }
}

function generateVerbFormQuestion(rule, words) {
  const baseVerb = ['robić', 'mieć', 'być', 'jeść'][Math.floor(Math.random() * 4)];
  const forms = getVerbForms(baseVerb);

  const person = rule.pattern.includes('ja') ? 'ja' : 'ty';
  const correctForm = person === 'ja' ? forms.ja : forms.ty;

  let options = [
    correctForm,
    forms.ja,
    forms.ty,
    forms.on
  ].filter((form, index, arr) => arr.indexOf(form) === index); // Remove duplicates

  // Ensure we have 4 unique options by adding more verb forms if needed
  if (options.length < 4) {
    const extraForms = ['robię', 'jestem', 'mam', 'jem', 'robisz', 'jesteś', 'masz', 'jesz'];
    for (const form of extraForms) {
      if (!options.includes(form) && options.length < 4) {
        options.push(form);
      }
    }
  }

  return {
    type: 'verb_conjugation',
    question: `How do you conjugate "${baseVerb}" for "${person}" (${person === 'ja' ? 'I' : 'you'})?`,
    correctAnswer: correctForm,
    options: options.slice(0, 4).sort(() => Math.random() - 0.5),
    hint: rule.explanation,
    translation: `${person === 'ja' ? 'I' : 'You'} ${getVerbTranslation(baseVerb)}`
  };
}

function getVerbForms(verb) {
  const forms = {
    'robić': { ja: 'robię', ty: 'robisz', on: 'robi' },
    'mieć': { ja: 'mam', ty: 'masz', on: 'ma' },
    'być': { ja: 'jestem', ty: 'jesteś', on: 'jest' },
    'jeść': { ja: 'jem', ty: 'jesz', on: 'je' }
  };
  return forms[verb] || forms['robić'];
}

function getVerbTranslation(verb) {
  const translations = {
    'je': 'eats',
    'czyta': 'reads',
    'kupuje': 'buys',
    'ma': 'has',
    'robić': 'do/make',
    'mieć': 'have',
    'być': 'be',
    'jeść': 'eat'
  };
  return translations[verb] || 'does';
}

function getSimpleWord(word) {
  if (!word) return null;

  // If it's already a simple object with polish/english, return it
  if (word.polish && word.english) {
    return word;
  }

  // If it's a card object, extract the simple words (single words only)
  if (word.front && word.back) {
    const polish = word.front.split(' ')[0].trim(); // Take only first word
    const english = word.back.split(' ')[0].trim(); // Take only first word

    // Only return if both are simple single words (no spaces, reasonable length)
    if (polish.length > 0 && polish.length < 15 && english.length > 0 && english.length < 15 &&
        !polish.includes(' ') && !english.includes(' ')) {
      return { polish, english };
    }
  }

  return null;
}

// New question generation functions for intermediate and advanced topics

function generateGenitiveQuestion(rule, words) {
  const genitiveNouns = [
    { nominative: 'kot', genitive: 'kota', english: 'cat' },
    { nominative: 'pies', genitive: 'psa', english: 'dog' },
    { nominative: 'książka', genitive: 'książki', english: 'book' },
    { nominative: 'dom', genitive: 'domu', english: 'house' },
    { nominative: 'mama', genitive: 'mamy', english: 'mom' },
    { nominative: 'brat', genitive: 'brata', english: 'brother' }
  ];

  const noun = genitiveNouns[Math.floor(Math.random() * genitiveNouns.length)];

  if (rule.pattern.includes('possession')) {
    return {
      type: 'case_selection',
      question: `What is the genitive form of "${noun.nominative}" (${noun.english}) in "my ${noun.english}'s house"?`,
      correctAnswer: noun.genitive,
      options: [
        noun.genitive,
        noun.nominative,
        noun.nominative + 'em',
        noun.nominative + 'ie'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `dom mojego ${noun.genitive} (my ${noun.english}'s house)`
    };
  } else {
    return {
      type: 'case_selection',
      question: `What is the genitive plural form for "five ${noun.english}s"?`,
      correctAnswer: noun.genitive.endsWith('a') ? noun.genitive.slice(0, -1) + 'ów' : noun.genitive + 'ów',
      options: [
        noun.genitive.endsWith('a') ? noun.genitive.slice(0, -1) + 'ów' : noun.genitive + 'ów',
        noun.nominative,
        noun.genitive,
        noun.nominative + 'y'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `pięć ${noun.genitive.endsWith('a') ? noun.genitive.slice(0, -1) + 'ów' : noun.genitive + 'ów'} (five ${noun.english}s)`
    };
  }
}

function generateDativeQuestion(rule, words) {
  const dativeNouns = [
    { nominative: 'brat', dative: 'bratu', english: 'brother' },
    { nominative: 'mama', dative: 'mamie', english: 'mom' },
    { nominative: 'ojciec', dative: 'ojcu', english: 'father' },
    { nominative: 'siostra', dative: 'siostrze', english: 'sister' },
    { nominative: 'dziecko', dative: 'dziecku', english: 'child' }
  ];

  const noun = dativeNouns[Math.floor(Math.random() * dativeNouns.length)];

  if (rule.pattern.includes('indirect')) {
    return {
      type: 'case_selection',
      question: `What is the dative form of "${noun.nominative}" (${noun.english}) in "I give a book to my ${noun.english}"?`,
      correctAnswer: noun.dative,
      options: [
        noun.dative,
        noun.nominative,
        noun.nominative + 'a',
        noun.nominative + 'em'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `daję książkę ${noun.dative} (I give a book to my ${noun.english})`
    };
  } else {
    const verbs = ['pomagam', 'dziękuję', 'ufam'];
    const verbTranslations = ['help', 'thank', 'trust'];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const verbTranslation = verbTranslations[verbs.indexOf(verb)];

    return {
      type: 'case_selection',
      question: `Complete: "${verb} ___" (I ${verbTranslation} ${noun.english})`,
      correctAnswer: noun.dative,
      options: [
        noun.dative,
        noun.nominative,
        noun.nominative + 'a',
        noun.nominative + 'em'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `${verb} ${noun.dative} (I ${verbTranslation} ${noun.english})`
    };
  }
}

function generateInstrumentalQuestion(rule, words) {
  const instrumentalNouns = [
    { nominative: 'długopis', instrumental: 'długopisem', english: 'pen' },
    { nominative: 'autobus', instrumental: 'autobusem', english: 'bus' },
    { nominative: 'łyżka', instrumental: 'łyżką', english: 'spoon' },
    { nominative: 'ręka', instrumental: 'ręką', english: 'hand' },
    { nominative: 'okno', instrumental: 'oknem', english: 'window' }
  ];

  const noun = instrumentalNouns[Math.floor(Math.random() * instrumentalNouns.length)];

  if (rule.pattern.includes('tools')) {
    return {
      type: 'case_selection',
      question: `What is the instrumental form of "${noun.nominative}" (${noun.english}) in "I write with a ${noun.english}"?`,
      correctAnswer: noun.instrumental,
      options: [
        noun.instrumental,
        noun.nominative,
        noun.nominative + 'a',
        noun.nominative + 'ie'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `piszę ${noun.instrumental} (I write with a ${noun.english})`
    };
  } else {
    const professions = [
      { polish: 'nauczycielem', english: 'teacher' },
      { polish: 'lekarzem', english: 'doctor' },
      { polish: 'studentem', english: 'student' }
    ];
    const profession = professions[Math.floor(Math.random() * professions.length)];

    return {
      type: 'case_selection',
      question: `Complete: "jestem ___" (I am a ${profession.english})`,
      correctAnswer: profession.polish,
      options: [
        profession.polish,
        profession.english,
        'nauczyciel',
        'lekarz'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `jestem ${profession.polish} (I am a ${profession.english})`
    };
  }
}

function generateLocativeQuestion(rule, words) {
  const locativeNouns = [
    { nominative: 'dom', locative: 'domu', preposition: 'w', english: 'house' },
    { nominative: 'szkola', locative: 'szkole', preposition: 'w', english: 'school' },
    { nominative: 'uniwersytet', locative: 'uniwersytecie', preposition: 'na', english: 'university' },
    { nominative: 'ulica', locative: 'ulicy', preposition: 'na', english: 'street' },
    { nominative: 'okno', locative: 'oknie', preposition: 'przy', english: 'window' }
  ];

  const noun = locativeNouns[Math.floor(Math.random() * locativeNouns.length)];

  if (rule.pattern.includes('location')) {
    return {
      type: 'case_selection',
      question: `What is the locative form of "${noun.nominative}" (${noun.english}) in "${noun.preposition} ${noun.english}"?`,
      correctAnswer: noun.locative,
      options: [
        noun.locative,
        noun.nominative,
        noun.nominative + 'a',
        noun.nominative + 'em'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `${noun.preposition} ${noun.locative} (${noun.preposition === 'w' ? 'in/at' : noun.preposition === 'na' ? 'at/on' : 'by'} the ${noun.english})`
    };
  } else {
    return {
      type: 'case_selection',
      question: `Complete: "mówię o ___" (I talk about ${noun.english})`,
      correctAnswer: noun.locative,
      options: [
        noun.locative,
        noun.nominative,
        noun.nominative + 'a',
        noun.nominative + 'em'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `mówię o ${noun.locative} (I talk about ${noun.english})`
    };
  }
}

function generateAspectQuestion(rule, words) {
  const aspectPairs = [
    { imperfective: 'robić', perfective: 'zrobić', english: 'do/make' },
    { imperfective: 'pisać', perfective: 'napisać', english: 'write' },
    { imperfective: 'czytać', perfective: 'przeczytać', english: 'read' },
    { imperfective: 'kupować', perfective: 'kupić', english: 'buy' }
  ];

  const pair = aspectPairs[Math.floor(Math.random() * aspectPairs.length)];

  if (rule.pattern.includes('pairs')) {
    return {
      type: 'multiple_choice',
      question: `What is the perfective aspect of "${pair.imperfective}" (${pair.english})?`,
      correctAnswer: pair.perfective,
      options: [
        pair.perfective,
        pair.imperfective + 'ć',
        'z' + pair.imperfective,
        pair.imperfective.slice(0, -1) + 'ę'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `${pair.imperfective}/${pair.perfective} (to ${pair.english})`
    };
  } else {
    const contexts = [
      { sentence: 'Jutro ___ książkę', translation: 'Tomorrow I will read the book (to completion)', aspect: 'perfective' },
      { sentence: 'Teraz ___ książkę', translation: 'Now I am reading a book (ongoing)', aspect: 'imperfective' },
      { sentence: 'Codziennie ___ książki', translation: 'Every day I read books (habitual)', aspect: 'imperfective' }
    ];

    const context = contexts[Math.floor(Math.random() * contexts.length)];
    const correctVerb = context.aspect === 'perfective' ? 'przeczytam' : 'czytam';
    const wrongVerb = context.aspect === 'perfective' ? 'czytam' : 'przeczytam';

    return {
      type: 'multiple_choice',
      question: `Choose the correct aspect: "${context.sentence}"`,
      correctAnswer: correctVerb,
      options: [
        correctVerb,
        wrongVerb,
        'czytać',
        'przeczytać'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: context.translation
    };
  }
}

function generateConditionalQuestion(rule, words) {
  const conditionalForms = [
    { infinitive: 'robić', conditional: 'robiłbym', english: 'I would do' },
    { infinitive: 'mieć', conditional: 'miałbym', english: 'I would have' },
    { infinitive: 'być', conditional: 'byłbym', english: 'I would be' },
    { infinitive: 'móc', conditional: 'mógłbym', english: 'I could' }
  ];

  const form = conditionalForms[Math.floor(Math.random() * conditionalForms.length)];

  if (rule.pattern.includes('formation')) {
    return {
      type: 'multiple_choice',
      question: `What is the conditional form (ja) of "${form.infinitive}"?`,
      correctAnswer: form.conditional,
      options: [
        form.conditional,
        form.infinitive,
        form.infinitive.slice(0, -1) + 'em',
        form.infinitive + 'bym'
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: `${form.conditional} (${form.english})`
    };
  } else {
    const politeRequests = [
      { polish: 'Czy mógłbyś mi pomóc?', english: 'Could you help me?' },
      { polish: 'Czy mogłabyś mi powiedzieć?', english: 'Could you tell me?' },
      { polish: 'Chciałbym kawy', english: 'I would like coffee' }
    ];

    const request = politeRequests[Math.floor(Math.random() * politeRequests.length)];

    return {
      type: 'translation',
      question: `How would you say "${request.english}" politely in Polish?`,
      correctAnswer: request.polish,
      options: [
        request.polish,
        request.polish.replace('łby', ''),
        request.polish.replace('by', ''),
        request.english
      ].sort(() => Math.random() - 0.5),
      hint: rule.explanation,
      translation: request.english
    };
  }
}

// Audio Practice API Endpoints

// Get pronunciation words for a user
app.get('/api/users/:userId/pronunciation-words', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, difficulty } = req.query;

    // Get cards that the user has studied for pronunciation practice
    let query = db('cards')
      .join('user_progress', 'cards.id', 'user_progress.card_id')
      .where('user_progress.user_id', userId)
      .where('user_progress.mastery_level', '>', 0) // Only words they've encountered
      .select(
        'cards.id',
        'cards.front as polish',
        'cards.back as english',
        'cards.difficulty_level',
        'user_progress.mastery_level',
        'user_progress.last_reviewed'
      )
      .orderBy('user_progress.last_reviewed', 'desc')
      .limit(parseInt(limit));

    if (difficulty) {
      query = query.where('cards.difficulty_level', difficulty);
    }

    const words = await query;

    // Add pronunciation guides for common Polish sounds
    const enhancedWords = words.map(word => ({
      ...word,
      pronunciation: generatePronunciationGuide(word.polish),
      notes: getPronunciationNotes(word.polish)
    }));

    res.json({
      words: enhancedWords,
      total: enhancedWords.length,
      practiceType: 'pronunciation'
    });
  } catch (error) {
    console.error('Error fetching pronunciation words:', error);
    res.status(500).json({ error: 'Failed to fetch pronunciation words' });
  }
});

// Get listening exercises for a user
app.get('/api/users/:userId/listening-exercises', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 15, difficulty } = req.query;

    // Get cards for listening practice
    let query = db('cards')
      .join('user_progress', 'cards.id', 'user_progress.card_id')
      .where('user_progress.user_id', userId)
      .where('user_progress.mastery_level', '>', 0) // Only words they've encountered
      .select(
        'cards.id',
        'cards.front as polish',
        'cards.back as english',
        'cards.difficulty_level',
        'user_progress.mastery_level'
      )
      .orderBy(db.raw('RANDOM()')) // Random order for listening practice
      .limit(parseInt(limit));

    if (difficulty) {
      query = query.where('cards.difficulty_level', difficulty);
    }

    const cards = await query;

    // Create listening exercises
    const exercises = cards.map(card => ({
      id: card.id,
      polish: card.polish,
      english: card.english,
      difficulty: card.difficulty_level,
      notes: getListeningNotes(card.polish, card.english)
    }));

    res.json({
      exercises,
      total: exercises.length,
      practiceType: 'listening'
    });
  } catch (error) {
    console.error('Error fetching listening exercises:', error);
    res.status(500).json({ error: 'Failed to fetch listening exercises' });
  }
});

// Save pronunciation practice result
app.post('/api/users/:userId/pronunciation-result', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cardId, score, similarity, recorded, recognized } = req.body;

    // Save the pronunciation practice result
    await db('exercise_results').insert({
      user_id: userId,
      card_id: cardId,
      exercise_type: 'pronunciation',
      is_correct: score >= 70, // 70% threshold for correct
      response_time: 0, // Audio exercises don't have traditional response time
      metadata: JSON.stringify({
        score,
        similarity,
        recorded,
        recognized,
        practice_type: 'pronunciation'
      }),
      created_at: new Date()
    });

    // Update user progress if this was a good pronunciation
    if (score >= 80) {
      await db('user_progress')
        .where('user_id', userId)
        .where('card_id', cardId)
        .increment('streak', 1)
        .update({
          last_reviewed: new Date(),
          next_review: calculateNextReview(score >= 90 ? 'hard' : 'good')
        });
    }

    res.json({
      success: true,
      message: 'Pronunciation result saved',
      score
    });
  } catch (error) {
    console.error('Error saving pronunciation result:', error);
    res.status(500).json({ error: 'Failed to save pronunciation result' });
  }
});

// Save listening practice result
app.post('/api/users/:userId/listening-result', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cardId, userAnswer, correctAnswer, isCorrect, responseTime } = req.body;

    // Save the listening practice result
    await db('exercise_results').insert({
      user_id: userId,
      card_id: cardId,
      exercise_type: 'listening',
      is_correct: isCorrect,
      response_time: responseTime || 0,
      metadata: JSON.stringify({
        userAnswer,
        correctAnswer,
        practice_type: 'listening'
      }),
      created_at: new Date()
    });

    // Update user progress for correct answers
    if (isCorrect) {
      await db('user_progress')
        .where('user_id', userId)
        .where('card_id', cardId)
        .increment('streak', 1)
        .update({
          last_reviewed: new Date(),
          next_review: calculateNextReview('good')
        });
    }

    res.json({
      success: true,
      message: 'Listening result saved',
      isCorrect
    });
  } catch (error) {
    console.error('Error saving listening result:', error);
    res.status(500).json({ error: 'Failed to save listening result' });
  }
});

// Helper functions for audio practice

function generatePronunciationGuide(polishWord) {
  // Simple pronunciation guide mapping for Polish sounds
  const pronunciationMap = {
    'ą': 'on/om',
    'ę': 'en/em',
    'ć': 'ch',
    'ń': 'ny',
    'ł': 'w',
    'ś': 'sh',
    'ź': 'zh',
    'ż': 'zh',
    'sz': 'sh',
    'cz': 'ch',
    'rz': 'zh',
    'dz': 'dz',
    'dź': 'dzh',
    'dż': 'dzh'
  };

  let guide = polishWord.toLowerCase();

  // Replace special Polish characters with pronunciation guides
  Object.entries(pronunciationMap).forEach(([polish, english]) => {
    guide = guide.replace(new RegExp(polish, 'g'), english);
  });

  return guide;
}

function getPronunciationNotes(polishWord) {
  const notes = [];

  if (polishWord.includes('ą')) {
    notes.push('ą sounds like "on" or "om"');
  }
  if (polishWord.includes('ę')) {
    notes.push('ę sounds like "en" or "em"');
  }
  if (polishWord.includes('ł')) {
    notes.push('ł sounds like English "w"');
  }
  if (polishWord.includes('rz') || polishWord.includes('ż')) {
    notes.push('rz/ż sounds like "zh" in "measure"');
  }
  if (polishWord.includes('sz')) {
    notes.push('sz sounds like "sh" in "shop"');
  }
  if (polishWord.includes('cz')) {
    notes.push('cz sounds like "ch" in "church"');
  }

  return notes.length > 0 ? notes.join('; ') : null;
}

function getListeningNotes(polishWord, englishWord) {
  const notes = [];

  // Add notes about Polish stress patterns
  if (polishWord.length > 2) {
    notes.push('Polish stress is usually on the second-to-last syllable');
  }

  // Add notes about specific sounds
  if (polishWord.includes('ą') || polishWord.includes('ę')) {
    notes.push('Listen for nasal vowel sounds');
  }

  if (polishWord.includes('rz') || polishWord.includes('sz') || polishWord.includes('cz')) {
    notes.push('Pay attention to Polish consonant clusters');
  }

  return notes.length > 0 ? notes.join('; ') : null;
}

// Get user learning statistics
app.get('/api/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { deckId } = req.query;
    
    // Base query for user progress
    let progressQuery = db('user_progress')
      .join('cards', 'user_progress.card_id', 'cards.id')
      .where('user_progress.user_id', userId);
    
    if (deckId) {
      progressQuery = progressQuery.where('cards.deck_id', deckId);
    }
    
    // Get mastery level distribution
    const masteryStats = await progressQuery.clone()
      .groupBy('user_progress.mastery_level')
      .select('user_progress.mastery_level')
      .count('* as count');
    
    // Get cards due today
    const cardsDueToday = await progressQuery.clone()
      .where('user_progress.next_review', '<=', new Date())
      .count('* as count')
      .first();
    
    // Get total cards studied
    const totalStudied = await progressQuery.clone()
      .count('* as count')
      .first();
    
    // Get accuracy by difficulty
    const accuracyByDifficulty = await db('exercise_results')
      .join('cards', 'exercise_results.card_id', 'cards.id')
      .where('exercise_results.user_id', userId)
      .modify((qb) => {
        if (deckId) qb.where('cards.deck_id', deckId);
      })
      .groupBy('cards.difficulty_level')
      .select('cards.difficulty_level')
      .avg('exercise_results.correct as accuracy')
      .count('* as total_attempts');
    
    // Get recent activity (last 7 days)
    const recentActivity = await db('exercise_results')
      .join('cards', 'exercise_results.card_id', 'cards.id')
      .where('exercise_results.user_id', userId)
      .where('exercise_results.created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .modify((qb) => {
        if (deckId) qb.where('cards.deck_id', deckId);
      })
      .select(
        db.raw('DATE(exercise_results.created_at) as date'),
        db.raw('COUNT(*) as exercises_completed'),
        db.raw('AVG(CASE WHEN exercise_results.correct THEN 1.0 ELSE 0.0 END) as daily_accuracy')
      )
      .groupBy(db.raw('DATE(exercise_results.created_at)'))
      .orderBy('date', 'desc');
    
    res.json({
      userId: parseInt(userId),
      deckId: deckId ? parseInt(deckId) : null,
      masteryDistribution: masteryStats,
      cardsDueToday: cardsDueToday.count,
      totalCardsStudied: totalStudied.count,
      accuracyByDifficulty: accuracyByDifficulty,
      recentActivity: recentActivity
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Anki Deck Upload Endpoint
// Enhanced multer configuration with file size limit
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.apkg')) {
      cb(null, true);
    } else {
      cb(new Error('Only .apkg files are allowed'), false);
    }
  }
});

// T021: Enhanced POST /api/upload-anki endpoint
app.post('/api/upload-anki', upload.single('ankiFile'), async (req, res) => {
  let importSession = null;
  const startTime = Date.now();

  try {
    // Check for file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        details: ['Please select an .apkg file to upload']
      });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    const fileSize = req.file.size;
    const deckName = req.body.deckName || originalFilename.replace('.apkg', '');
    const validateOnly = req.body.validateOnly === 'true';

    console.log(`Processing Anki upload: ${originalFilename}, validate only: ${validateOnly}`);

    // Create import session for tracking
    importSession = await importTracker.createImportSession(originalFilename, fileSize);

    // Read file buffer for validation
    const fileBuffer = fs.readFileSync(filePath);

    // Validate file
    const validation = ankiValidator.validateFile(fileBuffer, originalFilename);
    if (!validation.valid) {
      await importTracker.failImport(importSession.id, 'File validation failed', validation.errors);
      return res.status(422).json({
        success: false,
        error: 'Invalid file format',
        details: validation.errors
      });
    }

    // If validation only, return early
    if (validateOnly) {
      await importTracker.completeImport(importSession.id, {
        cardsImported: 0,
        cardsFailed: 0,
        warnings: validation.warnings
      });

      return res.status(200).json({
        success: true,
        importStats: {
          cardsImported: 0,
          cardsSkipped: 0,
          processingTime: (Date.now() - startTime) / 1000,
          warnings: validation.warnings
        }
      });
    }

    // Start processing
    await importTracker.startProcessing(importSession.id);

    // Parse Anki file
    const parseResult = await ankiParser.parseAnkiFile(fileBuffer, originalFilename);
    if (!parseResult.success) {
      await importTracker.failImport(importSession.id, 'Parsing failed', parseResult.errors);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse Anki file',
        details: parseResult.errors
      });
    }

    // Convert to Polski Spark format
    const converted = ankiParser.convertToPolskiSparkFormat(parseResult, deckName);

    // Check for duplicates
    const duplicateCheck = await importTracker.checkForDuplicates(
      originalFilename,
      converted.deck.anki_metadata.fileChecksum
    );

    if (duplicateCheck.hasDuplicateChecksum) {
      await importTracker.failImport(importSession.id, 'Duplicate deck detected', [
        'This deck has already been imported based on file content'
      ]);
      return res.status(409).json({
        success: false,
        error: 'Duplicate deck detected',
        details: ['This deck appears to have been imported already']
      });
    }

    // Create deck in database
    const [deckId] = await db('decks').insert({
      name: converted.deck.name,
      description: converted.deck.description,
      anki_metadata: JSON.stringify(converted.deck.anki_metadata),
      import_status: 'processing',
      file_checksum: converted.deck.anki_metadata.fileChecksum,
      anki_import_id: importSession.id,
      import_date: db.fn.now()
    }).returning('id');

    const finalDeckId = typeof deckId === 'object' ? deckId.id : deckId;

    // Import cards in batches
    let importedCount = 0;
    let failedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < converted.cards.length; i += batchSize) {
      const batch = converted.cards.slice(i, i + batchSize);

      for (const card of batch) {
        try {
          // Classify card difficulty
          const classification = classifyCardDifficulty(card.front, card.back, card.anki_tags.join(' '));

          await db('cards').insert({
            deck_id: finalDeckId,
            front: card.front,
            back: card.back,
            difficulty_level: card.difficulty,
            difficulty_score: classification.difficulty_score,
            word_length: classification.word_length,
            topic_category: card.topic,
            tags: card.anki_tags.join(' '),
            media: JSON.stringify(card.media_files),
            anki_note_id: card.anki_note_id,
            anki_model: card.anki_model,
            anki_fields: JSON.stringify(card.anki_fields),
            anki_tags: JSON.stringify(card.anki_tags),
            media_files: JSON.stringify(card.media_files),
            import_date: card.import_date
          });

          importedCount++;
        } catch (cardError) {
          console.error('Error importing card:', cardError);
          await importTracker.addWarning(importSession.id, `Failed to import card: ${cardError.message}`);
          failedCount++;
        }
      }

      // Update progress
      await importTracker.updateProgress(importSession.id, importedCount, failedCount);
    }

    // Update deck status
    await db('decks').where('id', finalDeckId).update({
      import_status: 'completed'
    });

    // Complete import session
    const processingTime = (Date.now() - startTime) / 1000;
    await importTracker.completeImport(importSession.id, {
      cardsImported: importedCount,
      cardsFailed: failedCount,
      warnings: parseResult.warnings
    });

    return res.status(200).json({
      success: true,
      deckId: finalDeckId,
      importStats: {
        cardsImported: importedCount,
        cardsSkipped: failedCount,
        processingTime: processingTime,
        warnings: parseResult.warnings
      }
    });

  } catch (error) {
    console.error('Anki upload error:', error);

    if (importSession) {
      await importTracker.failImport(importSession.id, error.message, [error.stack]);
    }

    // Handle specific error types
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        details: ['Maximum file size is 50MB']
      });
    }

    if (error.message.includes('Only .apkg files are allowed')) {
      return res.status(422).json({
        success: false,
        error: 'Invalid file format',
        details: ['Only .apkg files are supported']
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Import processing error',
      details: [error.message]
    });

  } finally {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
  }
});

// T022: GET /api/anki-imports endpoint for import history
app.get('/api/anki-imports', async (req, res) => {
  try {
    const { limit = 50, status } = req.query;

    const options = {
      limit: parseInt(limit),
      status: status
    };

    const imports = await importTracker.getImportHistory(options);

    res.json(imports.map(imp => ({
      id: imp.id,
      filename: imp.filename,
      fileSize: imp.file_size,
      cardsImported: imp.cards_imported,
      importDate: imp.created_at,
      status: imp.status
    })));

  } catch (error) {
    console.error('Error fetching import history:', error);
    res.status(500).json({
      error: 'Failed to fetch import history',
      details: [error.message]
    });
  }
});

// T023: GET /api/anki-imports/{id} endpoint for import details
app.get('/api/anki-imports/:importId', async (req, res) => {
  try {
    const { importId } = req.params;

    if (!/^\d+$/.test(importId)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: ['Import ID must be a number']
      });
    }

    const details = await importTracker.getImportDetails(parseInt(importId));

    if (!details) {
      return res.status(404).json({
        error: 'Import not found',
        details: [`Import with ID ${importId} does not exist`]
      });
    }

    res.json({
      id: details.id,
      filename: details.filename,
      importStats: {
        cardsImported: details.cards_imported,
        cardsSkipped: details.cards_failed,
        errors: details.importStats.errors || [],
        warnings: details.importStats.warnings || []
      },
      deckId: details.deckId,
      processingTime: details.import_duration,
      status: details.status,
      createdAt: details.created_at
    });

  } catch (error) {
    console.error('Error fetching import details:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Import not found'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch import details',
      details: [error.message]
    });
  }
});

// T024: Enhanced GET /api/decks/{id} endpoint with Anki metadata
app.get('/api/decks/:deckId', async (req, res) => {
  try {
    const { deckId } = req.params;

    if (!/^\d+$/.test(deckId)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: ['Deck ID must be a number']
      });
    }

    const deck = await db('decks').where('id', deckId).first();

    if (!deck) {
      return res.status(404).json({
        error: 'Deck not found',
        details: [`Deck with ID ${deckId} does not exist`]
      });
    }

    // Get card count
    const cardCount = await db('cards').where('deck_id', deckId).count('* as count').first();

    // Parse Anki metadata if present
    let ankiMetadata = null;
    if (deck.anki_metadata) {
      try {
        const metadata = JSON.parse(deck.anki_metadata);
        ankiMetadata = {
          originalDeckId: metadata.ankiVersion || 'unknown',
          version: metadata.ankiVersion || 'unknown',
          importDate: deck.import_date,
          originalFilename: metadata.originalFilename,
          tags: metadata.tags || []
        };
      } catch (parseError) {
        console.error('Error parsing Anki metadata:', parseError);
      }
    }

    res.json({
      id: deck.id,
      name: deck.name,
      description: deck.description,
      cardCount: cardCount.count,
      ankiMetadata: ankiMetadata,
      importStatus: deck.import_status,
      createdAt: deck.created_at
    });

  } catch (error) {
    console.error('Error fetching deck details:', error);
    res.status(500).json({
      error: 'Failed to fetch deck details',
      details: [error.message]
    });
  }
});

// T025: Enhanced GET /api/decks/{id}/cards endpoint with Anki data option
app.get('/api/decks/:deckId/cards', async (req, res) => {
  try {
    const { deckId } = req.params;
    const { includeAnkiData = 'false' } = req.query;

    if (!/^\d+$/.test(deckId)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: ['Deck ID must be a number']
      });
    }

    // Check if deck exists
    const deck = await db('decks').where('id', deckId).first();
    if (!deck) {
      return res.status(404).json({
        error: 'Deck not found',
        details: [`Deck with ID ${deckId} does not exist`]
      });
    }

    // Get cards
    const cards = await db('cards').where('deck_id', deckId).select('*');

    // Transform cards based on includeAnkiData parameter
    const transformedCards = cards.map(card => {
      const baseCard = {
        id: card.id,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty_level
      };

      if (includeAnkiData === 'true' || includeAnkiData === true) {
        let ankiData = null;

        if (card.anki_note_id) {
          ankiData = {
            noteId: card.anki_note_id,
            model: card.anki_model,
            originalFields: null,
            tags: [],
            mediaFiles: []
          };

          // Parse JSON fields safely
          try {
            if (card.anki_fields) {
              ankiData.originalFields = JSON.parse(card.anki_fields);
            }
          } catch (e) { /* ignore */ }

          try {
            if (card.anki_tags) {
              ankiData.tags = JSON.parse(card.anki_tags);
            }
          } catch (e) { /* ignore */ }

          try {
            if (card.media_files) {
              ankiData.mediaFiles = JSON.parse(card.media_files);
            }
          } catch (e) { /* ignore */ }
        }

        baseCard.ankiData = ankiData;
      }

      return baseCard;
    });

    res.json(transformedCards);

  } catch (error) {
    console.error('Error fetching deck cards:', error);
    res.status(500).json({
      error: 'Failed to fetch deck cards',
      details: [error.message]
    });
  }
});

async function initializeApp() {
  try {
    console.log('Running database migrations...');
    await db.migrate.latest();
    console.log('Database migrations completed.');

    app.listen(port, () => {
      console.log(`Polski Lokalny Backend listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize app due to migration error:', error);
    process.exit(1);
  }
}

initializeApp();
