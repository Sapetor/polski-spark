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

  // Use Anki metadata to improve question generation
  const ankiContext = extractAnkiContext(card);
  
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
      // Check exact match first, then Polish character equivalence
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
      let wasPolishNormalizedMC = false;
      if (!isCorrect) {
        const userPolishNorm = normalizePolishCharacters(normalizedUserAnswer);
        const correctPolishNorm = normalizePolishCharacters(normalizedCorrectAnswer);
        isCorrect = userPolishNorm === correctPolishNorm;
        if (isCorrect) {
          wasPolishNormalizedMC = true;
        }
      }

      if (isCorrect) {
        feedback = wasPolishNormalizedMC ? `Correct! (Polish spelling: ${question.correctAnswer})` : 'Correct!';
      } else {
        feedback = `Correct answer: ${question.correctAnswer}`;
      }
      break;

    case 'fill_blank':
      // Allow for minor variations in fill-blank answers
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer ||
                  normalizedUserAnswer === normalizedCorrectAnswer.replace(/[^\w]/g, '');

      let wasPolishNormalized = false;
      if (!isCorrect) {
        // Check with Polish character normalization
        const userPolishNorm = normalizePolishCharacters(normalizedUserAnswer);
        const correctPolishNorm = normalizePolishCharacters(normalizedCorrectAnswer);
        isCorrect = userPolishNorm === correctPolishNorm ||
                    userPolishNorm === correctPolishNorm.replace(/[^\w]/g, '');
        if (isCorrect) {
          wasPolishNormalized = true;
        }
      }

      if (isCorrect) {
        feedback = wasPolishNormalized ? `Correct! (Polish spelling: ${question.correctAnswer})` : 'Correct!';
      } else {
        feedback = `Correct answer: ${question.correctAnswer}`;
      }
      break;

    case 'translation_pl_en':
    case 'translation_en_pl':
      // More lenient checking for translations (already includes Polish normalization)
      isCorrect = checkTranslationAnswer(normalizedUserAnswer, normalizedCorrectAnswer);
      feedback = isCorrect ? 'Correct!' : `Correct answer: ${question.correctAnswer}`;
      break;

    default:
      // Check exact match first, then Polish character equivalence
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
      let wasPolishNormalizedDefault = false;
      if (!isCorrect) {
        const userPolishNorm = normalizePolishCharacters(normalizedUserAnswer);
        const correctPolishNorm = normalizePolishCharacters(normalizedCorrectAnswer);
        isCorrect = userPolishNorm === correctPolishNorm;
        if (isCorrect) {
          wasPolishNormalizedDefault = true;
        }
      }

      if (isCorrect) {
        feedback = wasPolishNormalizedDefault ? `Correct! (Polish spelling: ${question.correctAnswer})` : 'Correct!';
      } else {
        feedback = `Correct answer: ${question.correctAnswer}`;
      }
  }
  
  return {
    correct: isCorrect,
    feedback: feedback,
    userAnswer: userAnswer,
    correctAnswer: question.correctAnswer
  };
}

/**
 * Normalize Polish characters to their Latin equivalents for answer comparison
 * @param {string} text - Text to normalize
 * @returns {string} Text with Polish characters replaced by Latin equivalents
 */
function normalizePolishCharacters(text) {
  if (!text || typeof text !== 'string') return text;

  // Character mapping: Polish diacritical → Latin equivalent
  const polishToLatin = {
    'ć': 'c', 'Ć': 'C',
    'ł': 'l', 'Ł': 'L',
    'ę': 'e', 'Ę': 'E',
    'ą': 'a', 'Ą': 'A',
    'ń': 'n', 'Ń': 'N',
    'ó': 'o', 'Ó': 'O',
    'ś': 's', 'Ś': 'S',
    'ź': 'z', 'Ź': 'Z',
    'ż': 'z', 'Ż': 'Z'
  };

  return text.replace(/[ćĆłŁęĘąĄńŃóÓśŚźŹżŻ]/g, char => polishToLatin[char] || char);
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

  // Normalize Polish characters for comparison
  const userNormalized = normalizePolishCharacters(userAnswer);
  const correctNormalized = normalizePolishCharacters(correctAnswer);

  // Check normalized versions
  if (userNormalized === correctNormalized) return true;

  // Remove punctuation and check
  const userClean = userNormalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const correctClean = correctNormalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  if (userClean === correctClean) return true;

  // Split correct answer by common delimiters to get multiple possible translations
  const possibleAnswers = correctAnswer.split(/[;,\/|]/).map(answer => answer.trim().toLowerCase());

  // Check if user answer matches any of the possible translations
  for (const possibleAnswer of possibleAnswers) {
    if (userAnswer === possibleAnswer) return true;

    const possibleNormalized = normalizePolishCharacters(possibleAnswer);
    if (userNormalized === possibleNormalized) return true;

    const possibleClean = possibleNormalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    if (userClean === possibleClean) return true;

    // Check if user answer contains the main content of this possible answer
    const userWords = new Set(userClean.split(/\s+/));
    const possibleWords = possibleClean.split(/\s+/);
    const majorPossibleWords = possibleWords.filter(word => word.length > 2);

    if (majorPossibleWords.length > 0) {
      const matchedWords = majorPossibleWords.filter(word => userWords.has(word));
      // For single word translations, require exact match
      // For multi-word translations, allow partial match if it's substantial
      if (majorPossibleWords.length === 1) {
        if (matchedWords.length === 1) return true;
      } else {
        if (matchedWords.length / majorPossibleWords.length >= 0.6) return true; // 60% threshold for multi-word
      }
    }
  }

  // Fallback: Check if user answer contains major words from the full correct answer
  const userWords = new Set(userClean.split(/\s+/));
  const correctWords = correctClean.split(/\s+/);
  const majorCorrectWords = correctWords.filter(word => word.length > 2);

  if (majorCorrectWords.length > 0) {
    const matchedMajorWords = majorCorrectWords.filter(word => userWords.has(word));
    // More lenient threshold for partial matching
    return matchedMajorWords.length / majorCorrectWords.length >= 0.5; // 50% of major words match
  }

  return false;
}

/**
 * Extract Anki-specific context from card metadata
 * @param {Object} card - Card with potential Anki metadata
 * @returns {Object} Anki context information
 */
function extractAnkiContext(card) {
  const context = {
    isAnkiCard: false,
    noteType: null,
    tags: [],
    originalFields: [],
    mediaFiles: [],
    hasMedia: false
  };

  if (!card) return context;

  // Check if this is an Anki-imported card
  if (card.anki_note_id || card.anki_model) {
    context.isAnkiCard = true;
    context.noteType = card.anki_model;
  }

  // Extract Anki tags
  if (card.anki_tags) {
    try {
      context.tags = Array.isArray(card.anki_tags) ? card.anki_tags : JSON.parse(card.anki_tags);
    } catch (error) {
      context.tags = [];
    }
  }

  // Extract original fields
  if (card.anki_fields) {
    try {
      context.originalFields = Array.isArray(card.anki_fields) ? card.anki_fields : JSON.parse(card.anki_fields);
    } catch (error) {
      context.originalFields = [];
    }
  }

  // Extract media files
  if (card.media_files) {
    try {
      context.mediaFiles = Array.isArray(card.media_files) ? card.media_files : JSON.parse(card.media_files);
      context.hasMedia = context.mediaFiles.length > 0;
    } catch (error) {
      context.mediaFiles = [];
    }
  }

  return context;
}

/**
 * Generate enhanced distractors using Anki metadata
 * @param {string} correctAnswer - The correct answer
 * @param {Array} otherCards - Other cards to pick distractors from
 * @param {number} count - Number of distractors needed
 * @param {Object} ankiContext - Anki context from the main card
 * @returns {Array} Array of distractor options
 */
function generateAnkiAwareDistractors(correctAnswer, otherCards, count = 3, ankiContext = {}) {
  const distractors = [];
  const used = new Set([correctAnswer.toLowerCase()]);

  // Filter cards for better distractors based on Anki metadata
  let candidateCards = otherCards.filter(card => {
    const answer = stripHtml(card.back).toLowerCase();
    return !used.has(answer) && answer.length > 0;
  });

  // If we have Anki context, prioritize cards with similar characteristics
  if (ankiContext.isAnkiCard && ankiContext.tags.length > 0) {
    // Prioritize cards with overlapping tags
    candidateCards.sort((a, b) => {
      const aContext = extractAnkiContext(a);
      const bContext = extractAnkiContext(b);

      const aTagOverlap = getTagOverlap(ankiContext.tags, aContext.tags);
      const bTagOverlap = getTagOverlap(ankiContext.tags, bContext.tags);

      // Higher tag overlap gets higher priority
      if (aTagOverlap !== bTagOverlap) {
        return bTagOverlap - aTagOverlap;
      }

      // Secondary sort by length similarity
      const aAnswer = stripHtml(a.back);
      const bAnswer = stripHtml(b.back);
      const aLengthDiff = Math.abs(aAnswer.length - correctAnswer.length);
      const bLengthDiff = Math.abs(bAnswer.length - correctAnswer.length);

      return aLengthDiff - bLengthDiff;
    });
  } else {
    // Fallback to original sorting by length similarity
    candidateCards.sort((a, b) => {
      const aAnswer = stripHtml(a.back);
      const bAnswer = stripHtml(b.back);
      const aLengthDiff = Math.abs(aAnswer.length - correctAnswer.length);
      const bLengthDiff = Math.abs(bAnswer.length - correctAnswer.length);
      return aLengthDiff - bLengthDiff;
    });
  }

  // Add distractors from candidate cards
  for (const card of candidateCards) {
    if (distractors.length >= count) break;

    const distractor = stripHtml(card.back);
    if (!used.has(distractor.toLowerCase()) && distractor !== correctAnswer) {
      distractors.push(distractor);
      used.add(distractor.toLowerCase());
    }
  }

  // If we don't have enough distractors, generate fallbacks
  while (distractors.length < count) {
    const fallbackDistractor = generateFallbackDistractor(correctAnswer, used);
    if (fallbackDistractor) {
      distractors.push(fallbackDistractor);
      used.add(fallbackDistractor.toLowerCase());
    } else {
      break;
    }
  }

  return distractors;
}

/**
 * Calculate tag overlap between two tag arrays
 * @param {Array} tags1 - First tag array
 * @param {Array} tags2 - Second tag array
 * @returns {number} Number of overlapping tags
 */
function getTagOverlap(tags1, tags2) {
  if (!tags1.length || !tags2.length) return 0;

  const set1 = new Set(tags1.map(tag => tag.toLowerCase()));
  const set2 = new Set(tags2.map(tag => tag.toLowerCase()));

  let overlap = 0;
  for (const tag of set1) {
    if (set2.has(tag)) overlap++;
  }

  return overlap;
}

/**
 * Enhanced fill-blank generation using Anki fields
 * @param {Object} card - The card to create question from
 * @param {Object} ankiContext - Anki context information
 * @returns {Object} Enhanced fill-in-the-blank question
 */
function generateAnkiAwareFillBlank(card, ankiContext) {
  const front = stripHtml(card.front);
  const back = stripHtml(card.back);

  // If we have multiple Anki fields, try to use them for better question creation
  if (ankiContext.isAnkiCard && ankiContext.originalFields.length > 2) {
    // Look for additional context in other fields
    const extraFields = ankiContext.originalFields.slice(2).map(field => stripHtml(field)).filter(field => field.trim());

    if (extraFields.length > 0) {
      // Use extra fields as hints
      const hints = extraFields.slice(0, 2); // Max 2 additional hints

      const words = front.split(/\s+/);
      if (words.length > 1) {
        const blankWordIndex = findBestBlankWord(words, back);
        const blankWord = words[blankWordIndex];
        const questionWords = [...words];
        questionWords[blankWordIndex] = '______';

        return {
          type: 'fill_blank',
          question: `Fill in the blank: ${questionWords.join(' ')}`,
          hint: `Translation: ${back}`,
          additionalHints: hints,
          correctAnswer: blankWord,
          fullSentence: front,
          blankPosition: blankWordIndex,
          ankiEnhanced: true
        };
      }
    }
  }

  // Fallback to standard fill-blank generation
  return generateFillBlank(card);
}

/**
 * Enhanced translation generation using Anki metadata
 * @param {Object} card - The card to create question from
 * @param {string} direction - Translation direction
 * @param {Object} ankiContext - Anki context information
 * @returns {Object} Enhanced translation question
 */
function generateAnkiAwareTranslation(card, direction, ankiContext) {
  const baseTranslation = generateTranslation(card, direction);

  if (!ankiContext.isAnkiCard) {
    return baseTranslation;
  }

  // Generate acceptable answer variations using Anki fields
  const acceptableAnswers = [baseTranslation.correctAnswer];

  // If we have multiple fields, some might be alternative translations
  if (ankiContext.originalFields.length > 2) {
    const alternativeAnswers = ankiContext.originalFields
      .slice(2)
      .map(field => stripHtml(field))
      .filter(field => field.trim() && field !== baseTranslation.correctAnswer);

    acceptableAnswers.push(...alternativeAnswers);
  }

  // Add tag-based context if available
  const contextTags = ankiContext.tags
    .filter(tag => !tag.startsWith('marked') && !tag.startsWith('leech'))
    .slice(0, 3);

  return {
    ...baseTranslation,
    acceptableAnswers: acceptableAnswers,
    contextTags: contextTags,
    ankiEnhanced: true
  };
}

/**
 * Enhanced question generation that uses Anki metadata when available
 * @param {Object} card - The card to create question from
 * @param {string} questionType - Type of question to generate
 * @param {Array} otherCards - Other cards for context/distractors
 * @returns {Object} Generated question with Anki enhancements
 */
function generateEnhancedQuestion(card, questionType, otherCards = []) {
  const ankiContext = extractAnkiContext(card);

  switch (questionType) {
    case 'multiple_choice':
      const front = stripHtml(card.front);
      const correctAnswer = stripHtml(card.back);
      const distractors = generateAnkiAwareDistractors(correctAnswer, otherCards, 3, ankiContext);
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
        correctIndex: options.indexOf(correctAnswer),
        cardId: card.id,
        ankiEnhanced: ankiContext.isAnkiCard
      };

    case 'fill_blank':
      return {
        ...generateAnkiAwareFillBlank(card, ankiContext),
        cardId: card.id
      };

    case 'translation':
    case 'translation_pl_en':
      return {
        ...generateAnkiAwareTranslation(card, 'pl_to_en', ankiContext),
        direction: 'pl_to_en',
        cardId: card.id
      };

    case 'translation_en_pl':
      return {
        ...generateAnkiAwareTranslation(card, 'en_to_pl', ankiContext),
        direction: 'en_to_pl',
        cardId: card.id
      };

    case 'flashcard':
    default:
      return {
        type: 'flashcard',
        front: stripHtml(card.front),
        back: stripHtml(card.back),
        cardId: card.id,
        ankiEnhanced: ankiContext.isAnkiCard,
        tags: ankiContext.tags
      };
  }
}

/**
 * Enhanced answer checking with Anki-aware flexibility
 * @param {Object} question - The question object
 * @param {string} userAnswer - User's answer
 * @returns {Object} Result with correct boolean and feedback
 */
function checkEnhancedAnswer(question, userAnswer) {
  // If this is an Anki-enhanced question with multiple acceptable answers
  if (question.ankiEnhanced && question.acceptableAnswers) {
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();

    for (const acceptableAnswer of question.acceptableAnswers) {
      const normalizedAcceptable = acceptableAnswer.toLowerCase();

      if (question.type.includes('translation')) {
        if (checkTranslationAnswer(normalizedUserAnswer, normalizedAcceptable)) {
          return {
            correct: true,
            feedback: 'Correct!',
            userAnswer: userAnswer,
            correctAnswer: acceptableAnswer
          };
        }
      } else {
        // Normalize Polish characters for non-translation questions
        const userPolishNormalized = normalizePolishCharacters(normalizedUserAnswer);
        const acceptablePolishNormalized = normalizePolishCharacters(normalizedAcceptable);

        if (normalizedUserAnswer === normalizedAcceptable) {
          return {
            correct: true,
            feedback: 'Correct!',
            userAnswer: userAnswer,
            correctAnswer: acceptableAnswer
          };
        } else if (userPolishNormalized === acceptablePolishNormalized) {
          return {
            correct: true,
            feedback: `Correct! (Polish spelling: ${acceptableAnswer})`,
            userAnswer: userAnswer,
            correctAnswer: acceptableAnswer
          };
        }
      }
    }

    // None of the acceptable answers matched
    return {
      correct: false,
      feedback: `Possible answers: ${question.acceptableAnswers.join(', ')}`,
      userAnswer: userAnswer,
      correctAnswer: question.correctAnswer
    };
  }

  // Fallback to standard answer checking
  return checkAnswer(question, userAnswer);
}

module.exports = {
  generateQuestion,
  generateMultipleChoice,
  generateFillBlank,
  generateTranslation,
  checkAnswer,
  generateDistractors,
  normalizePolishCharacters,
  // Enhanced Anki-aware functions
  generateEnhancedQuestion,
  generateAnkiAwareDistractors,
  generateAnkiAwareFillBlank,
  generateAnkiAwareTranslation,
  checkEnhancedAnswer,
  extractAnkiContext
};