const express = require('express');
const knex = require('knex');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const cors = require('cors');
const { classifyCardDifficulty, classifyAllCards } = require('./utils/cardClassifier');
const { generateQuestion, checkAnswer } = require('./utils/questionGenerator');
const { 
  calculateNextReview, 
  getCardsForReview, 
  getNewCardsForLearning, 
  generateStudySession 
} = require('./utils/spacedRepetition');

const app = express();
const port = 3001; // Using a different port than React's default 3000

// Knex configuration for SQLite3
const knexConfig = require('./knexfile.js');
const db = knex(knexConfig.development);

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

// Basic route
app.get('/', (req, res) => {
  res.send('Polski Lokalny Backend is running!');
});

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await db('users').select('*');
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
        const session = await generateStudySession(db, parseInt(userId), parseInt(deckId), {
          totalCards: cardCount,
          newCardRatio: 0.3,
          difficultyLevel: difficulty,
          questionTypes: requestedTypes
        });
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
      
      const question = generateQuestion(card, questionType, otherCards);
      questions.push({
        ...question,
        cardId: card.id,
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
    
    if (!question || !userAnswer || !userId || !cardId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = checkAnswer(question, userAnswer);
    
    // Get current user progress for this card
    const currentProgress = await db('user_progress')
      .where({ user_id: userId, card_id: cardId })
      .first();
    
    // Get card info for difficulty level
    const card = await db('cards').where({ id: cardId }).first();
    
    // Calculate new spaced repetition schedule
    const updatedProgress = calculateNextReview(
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
    
    // Record the exercise result
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
    
    // Add spaced repetition info to result
    result.spacedRepetition = {
      nextReview: updatedProgress.next_review,
      interval: updatedProgress.interval,
      masteryLevel: updatedProgress.mastery_level,
      easeFactor: updatedProgress.ease_factor
    };
    
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
const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files
app.post('/upload-anki', upload.single('ankiDeck'), async (req, res) => {
  console.log('Received upload request');
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  const deckName = req.body.deckName || 'default'; // Get deck name from body or use default
  
  console.log(`Processing deck: ${deckName}, file: ${filePath}`);

  try {
    console.log('Extracting zip file...');
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    console.log(`Found ${zipEntries.length} entries in zip file`);
    console.log('Zip entries:', zipEntries.map(e => e.entryName));

    // Find the Anki SQLite database file (usually collection.anki2)
    const ankiDbEntry = zipEntries.find(entry => entry.entryName.endsWith('.anki2'));

    if (!ankiDbEntry) {
      console.log('No .anki2 file found in package');
      fs.unlinkSync(filePath); // Clean up uploaded file
      return res.status(400).json({ error: 'No Anki database file (.anki2) found in the package.' });
    }
    
    console.log(`Found Anki database: ${ankiDbEntry.entryName}`);

    // Extract the Anki database to a temporary location
    const tempAnkiDbPath = path.join(__dirname, 'temp', ankiDbEntry.name);
    if (!fs.existsSync(path.dirname(tempAnkiDbPath))) {
      fs.mkdirSync(path.dirname(tempAnkiDbPath), { recursive: true });
    }
    fs.writeFileSync(tempAnkiDbPath, ankiDbEntry.getData());

    // Parse the Anki database and store cards in our own database
    console.log('Connecting to Anki database...');
    const ankiDb = knex({
      client: 'sqlite3',
      connection: { filename: tempAnkiDbPath },
      useNullAsDefault: true,
    });

    let deckId;
    let importedCount = 0;
    
    try {
      console.log('Creating/finding deck in database...');
      // Create or get deck
      try {
        [deckId] = await db('decks')
          .insert({ name: deckName, description: `Imported from Anki: ${deckName}` });
      } catch (insertError) {
        if (insertError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log('Deck already exists, using existing deck');
          const existingDeck = await db('decks').where({ name: deckName }).first();
          deckId = existingDeck.id;
        } else {
          throw insertError;
        }
      }
      
      console.log(`Using deck ID: ${deckId}`);

      // Get notes and cards from Anki database
      console.log('Querying Anki database for notes...');
      const ankiNotes = await ankiDb('notes').select('*');
      
      console.log(`Found ${ankiNotes.length} notes in Anki deck`);
      for (const note of ankiNotes) {
        try {
          const fields = note.flds ? note.flds.split('\x1f') : []; // Anki separates fields with \x1f
          if (fields.length >= 2) {
            const front = fields[0] || '';
            const back = fields[1] || '';
            const tags = note.tags || '';

            // Classify card difficulty and topic
            const classification = classifyCardDifficulty(front.trim(), back.trim(), tags.trim());
            
            await db('cards').insert({
              deck_id: deckId,
              front: front.trim(),
              back: back.trim(),
              tags: tags.trim(),
              media: JSON.stringify([]), // TODO: Handle media files
              difficulty_level: classification.difficulty_level,
              difficulty_score: classification.difficulty_score,
              word_length: classification.word_length,
              topic_category: classification.topic_category
            });
            importedCount++;
          }
        } catch (cardError) {
          console.error('Error importing card:', cardError);
          // Continue with other cards even if one fails
        }
      }

      await ankiDb.destroy();
      console.log(`Anki deck "${deckName}" processed and ${importedCount} cards imported`);
    } catch (parseError) {
      console.error('Error parsing Anki database:', parseError);
      try {
        await ankiDb.destroy();
      } catch (destroyError) {
        console.error('Error destroying Anki database connection:', destroyError);
      }
      throw parseError;
    }

    // Clean up files
    fs.unlinkSync(filePath);
    fs.unlinkSync(tempAnkiDbPath);
    if (fs.existsSync(path.dirname(tempAnkiDbPath))) {
      fs.rmSync(path.dirname(tempAnkiDbPath), { recursive: true, force: true });
    }

    const result = {
      message: `Anki deck "${deckName}" processed successfully`,
      deckId: deckId,
      cardsImported: importedCount
    };
    
    console.log('Upload completed successfully:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing Anki deck:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded file even on error
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }
    
    res.status(500).json({ 
      error: 'Error processing Anki deck',
      details: error.message 
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
