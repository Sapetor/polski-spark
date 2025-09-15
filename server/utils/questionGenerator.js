// Question generation utilities for different exercise types

const { stripHtml } = require('./cardClassifier');

/**
 * Generate a multiple choice question from a card
 * @param {Object} card - The card to create question from
 * @param {Array} otherCards - Other cards from same deck for distractors
 * @returns {Object} Multiple choice question
 */
function generateMultipleChoice(card, otherCards = []) {
  const front = stripHtml(card.front);
  const correctAnswer = stripHtml(card.back);
  
  // Generate distractors from other cards
  const distractors = generateDistractors(correctAnswer, otherCards, 3);
  
  // Create options array with correct answer
  const options = [correctAnswer, ...distractors];
  
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  return {
    type: 'multiple_choice',
    question: front,
    options: options,
    correctAnswer: correctAnswer,
    correctIndex: options.indexOf(correctAnswer)
  };
}

/**
 * Generate a fill-in-the-blank question from a card
 * @param {Object} card - The card to create question from
 * @returns {Object} Fill-in-the-blank question
 */
function generateFillBlank(card) {
  const front = stripHtml(card.front);
  const back = stripHtml(card.back);
  
  // Try to create a fill-in-the-blank from the front (Polish) text
  // Look for key words to blank out
  const words = front.split(/\s+/);
  
  if (words.length === 1) {
    // Single word - create a definition-based fill blank
    return {
      type: 'fill_blank',
      question: `What is the Polish word for "${back}"?`,
      correctAnswer: front,
      blanks: [{
        position: 0,
        word: front
      }]
    };
  }
  
  // Multi-word phrase - blank out the most significant word
  const blankWordIndex = findBestBlankWord(words, back);
  const blankWord = words[blankWordIndex];
  
  // Create question with blank
  const questionWords = [...words];
  questionWords[blankWordIndex] = '______';
  
  return {
    type: 'fill_blank',
    question: `Fill in the blank: ${questionWords.join(' ')}`,
    hint: `Translation: ${back}`,
    correctAnswer: blankWord,
    fullSentence: front,
    blankPosition: blankWordIndex
  };
}

/**
 * Generate a translation question from a card
 * @param {Object} card - The card to create question from
 * @param {string} direction - 'pl_to_en' or 'en_to_pl'
 * @returns {Object} Translation question
 */
function generateTranslation(card, direction = 'pl_to_en') {
  const front = stripHtml(card.front);
  const back = stripHtml(card.back);
  
  if (direction === 'pl_to_en') {
    return {
      type: 'translation_pl_en',
      question: `Translate to English: ${front}`,
      correctAnswer: back,
      sourceText: front,
      targetLanguage: 'English'
    };
  } else {
    return {
      type: 'translation_en_pl',
      question: `Translate to Polish: ${back}`,
      correctAnswer: front,
      sourceText: back,
      targetLanguage: 'Polish'
    };
  }
}

/**
 * Generate distractors for multiple choice questions
 * @param {string} correctAnswer - The correct answer
 * @param {Array} otherCards - Other cards to pick distractors from
 * @param {number} count - Number of distractors needed
 * @returns {Array} Array of distractor options
 */
function generateDistractors(correctAnswer, otherCards, count = 3) {
  const distractors = [];
  const used = new Set([correctAnswer.toLowerCase()]);
  
  // First try to get distractors from cards with similar characteristics
  const similarCards = otherCards
    .filter(card => {
      const answer = stripHtml(card.back).toLowerCase();
      return !used.has(answer) && answer.length > 0;
    })
    .sort((a, b) => {
      const aAnswer = stripHtml(a.back);
      const bAnswer = stripHtml(b.back);
      
      // Prefer answers of similar length
      const aLengthDiff = Math.abs(aAnswer.length - correctAnswer.length);
      const bLengthDiff = Math.abs(bAnswer.length - correctAnswer.length);
      
      return aLengthDiff - bLengthDiff;
    });
  
  // Add distractors from similar cards
  for (const card of similarCards) {
    if (distractors.length >= count) break;
    
    const distractor = stripHtml(card.back);
    if (!used.has(distractor.toLowerCase()) && distractor !== correctAnswer) {
      distractors.push(distractor);
      used.add(distractor.toLowerCase());
    }
  }
  
  // If we don't have enough distractors, generate some basic ones
  while (distractors.length < count) {
    const fallbackDistractor = generateFallbackDistractor(correctAnswer, used);
    if (fallbackDistractor) {
      distractors.push(fallbackDistractor);
      used.add(fallbackDistractor.toLowerCase());
    } else {
      break; // Can't generate more
    }
  }
  
  return distractors;
}

/**
 * Find the best word to blank out in a sentence
 * @param {Array} words - Array of words in the sentence
 * @param {string} translation - Translation to help identify key words
 * @returns {number} Index of word to blank out
 */
function findBestBlankWord(words, translation) {
  // Avoid blanking out very short words (articles, prepositions)
  const shortWords = new Set(['i', 'a', 'o', 'w', 'z', 'na', 'do', 'od', 'za', 'po', 'bez', 'przed']);
  
  // Find content words (not short function words)
  const contentWordIndices = words
    .map((word, index) => ({ word: word.toLowerCase(), index }))
    .filter(({ word }) => word.length > 2 && !shortWords.has(word))
    .map(({ index }) => index);
  
  if (contentWordIndices.length === 0) {
    // Fallback to longest word
    return words.reduce((maxIndex, word, index) => 
      words[index].length > words[maxIndex].length ? index : maxIndex, 0);
  }
  
  // Prefer nouns and verbs (words that are likely to be in translation)
  for (const index of contentWordIndices) {
    const word = words[index].toLowerCase();
    // Simple heuristic: if the word or its stem appears in translation
    if (translation.toLowerCase().includes(word.substring(0, Math.max(3, word.length - 2)))) {
      return index;
    }
  }
  
  // Fallback to first content word
  return contentWordIndices[0];
}

/**
 * Generate fallback distractors when not enough cards available
 * @param {string} correctAnswer - The correct answer
 * @param {Set} used - Set of already used answers
 * @returns {string|null} Fallback distractor or null
 */
function generateFallbackDistractor(correctAnswer, used) {
  const fallbacks = [
    'dog', 'cat', 'house', 'car', 'book', 'water', 'food', 'time', 'day', 'night',
    'good', 'bad', 'big', 'small', 'new', 'old', 'red', 'blue', 'green', 'black',
    'one', 'two', 'three', 'first', 'last', 'yes', 'no', 'hello', 'goodbye', 'thank you'
  ];
  
  for (const fallback of fallbacks) {
    if (!used.has(fallback.toLowerCase()) && fallback !== correctAnswer) {
      return fallback;
    }
  }
  
  return null;
}

/**
 * Generate a question of specified type from a card
 * @param {Object} card - The card to create question from
 * @param {string} questionType - Type of question to generate
 * @param {Array} otherCards - Other cards for context/distractors
 * @returns {Object} Generated question
 */
function generateQuestion(card, questionType, otherCards = []) {
  switch (questionType) {
    case 'multiple_choice':
      return generateMultipleChoice(card, otherCards);
    case 'fill_blank':
      return generateFillBlank(card);
    case 'translation_pl_en':
      return generateTranslation(card, 'pl_to_en');
    case 'translation_en_pl':
      return generateTranslation(card, 'en_to_pl');
    case 'flashcard':
    default:
      return {
        type: 'flashcard',
        question: stripHtml(card.front),
        answer: stripHtml(card.back)
      };
  }
}

/**
 * Check if user answer is correct for a given question
 * @param {Object} question - The question object
 * @param {string} userAnswer - User's answer
 * @returns {Object} Result with correct boolean and feedback
 */
function checkAnswer(question, userAnswer) {
  const normalizedUserAnswer = userAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = question.correctAnswer.toLowerCase();
  
  let isCorrect = false;
  let feedback = '';
  
  switch (question.type) {
    case 'multiple_choice':
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
      feedback = isCorrect ? 'Correct!' : `Correct answer: ${question.correctAnswer}`;
      break;
      
    case 'fill_blank':
      // Allow for minor variations in fill-blank answers
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer ||
                  normalizedUserAnswer === normalizedCorrectAnswer.replace(/[^\w]/g, '');
      feedback = isCorrect ? 'Correct!' : `Correct answer: ${question.correctAnswer}`;
      break;
      
    case 'translation_pl_en':
    case 'translation_en_pl':
      // More lenient checking for translations
      isCorrect = checkTranslationAnswer(normalizedUserAnswer, normalizedCorrectAnswer);
      feedback = isCorrect ? 'Correct!' : `Correct answer: ${question.correctAnswer}`;
      break;
      
    default:
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
      feedback = isCorrect ? 'Correct!' : `Correct answer: ${question.correctAnswer}`;
  }
  
  return {
    correct: isCorrect,
    feedback: feedback,
    userAnswer: userAnswer,
    correctAnswer: question.correctAnswer
  };
}

/**
 * Check translation answers with some flexibility
 * @param {string} userAnswer - User's answer (normalized)
 * @param {string} correctAnswer - Correct answer (normalized)
 * @returns {boolean} Whether answer is acceptable
 */
function checkTranslationAnswer(userAnswer, correctAnswer) {
  // Exact match
  if (userAnswer === correctAnswer) return true;
  
  // Remove punctuation and check
  const userClean = userAnswer.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const correctClean = correctAnswer.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  
  if (userClean === correctClean) return true;
  
  // Check if user answer contains all major words from correct answer
  const userWords = new Set(userClean.split(/\s+/));
  const correctWords = correctClean.split(/\s+/);
  const majorCorrectWords = correctWords.filter(word => word.length > 2);
  
  if (majorCorrectWords.length > 0) {
    const matchedMajorWords = majorCorrectWords.filter(word => userWords.has(word));
    return matchedMajorWords.length / majorCorrectWords.length >= 0.8; // 80% of major words match
  }
  
  return false;
}

module.exports = {
  generateQuestion,
  generateMultipleChoice,
  generateFillBlank,
  generateTranslation,
  checkAnswer,
  generateDistractors
};