// Card difficulty classification utilities

// Common Polish words (simplified list - in a real app this would be much larger)
const commonPolishWords = new Set([
  'tak', 'nie', 'co', 'kto', 'gdzie', 'kiedy', 'jak', 'dlaczego',
  'jest', 'jestem', 'jesteś', 'są', 'być', 'mieć', 'mam', 'masz', 'ma',
  'dom', 'człowiek', 'dzień', 'czas', 'rok', 'życie', 'świat',
  'dobry', 'duży', 'nowy', 'pierwszy', 'ostatni', 'własny',
  'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć', 'dziesięć'
]);

// Polish language complexity patterns
const complexPolishPatterns = [
  /ą|ę|ć|ł|ń|ó|ś|ź|ż/g, // Polish diacritical marks
  /szcz|strz|chrz|drz/g,   // Complex consonant clusters
  /enie|anie|ienie/g,      // Complex endings
  /ość|ość|ąć|eć/g        // Complex suffixes
];

/**
 * Classify card difficulty based on content analysis
 * @param {string} front - Front side of the card (usually Polish)
 * @param {string} back - Back side of the card (usually English)
 * @param {string} tags - Card tags from Anki
 * @returns {Object} Classification result
 */
function classifyCardDifficulty(front, back, tags = '') {
  const frontText = stripHtml(front).toLowerCase().trim();
  const backText = stripHtml(back).toLowerCase().trim();
  
  let difficultyScore = 1.0; // Base difficulty
  let level = 'beginner';
  let reasons = [];

  // Length-based difficulty
  const frontWordCount = frontText.split(/\s+/).length;
  const avgWordLength = frontText.replace(/\s+/g, '').length / frontWordCount;
  
  if (frontWordCount > 5) {
    difficultyScore += 0.5;
    reasons.push('long_phrase');
  }
  
  if (avgWordLength > 7) {
    difficultyScore += 0.3;
    reasons.push('long_words');
  }

  // Polish-specific complexity
  let diacriticalCount = 0;
  let complexPatternCount = 0;
  
  complexPolishPatterns.forEach(pattern => {
    const matches = frontText.match(pattern);
    if (matches) {
      if (pattern.source.includes('ą|ę|ć|ł|ń|ó|ś|ź|ż')) {
        diacriticalCount += matches.length;
      } else {
        complexPatternCount += matches.length;
      }
    }
  });

  if (diacriticalCount > 2) {
    difficultyScore += 0.4;
    reasons.push('many_diacriticals');
  }
  
  if (complexPatternCount > 0) {
    difficultyScore += 0.6;
    reasons.push('complex_consonants');
  }

  // Word frequency analysis
  const frontWords = frontText.split(/\s+/);
  const commonWordRatio = frontWords.filter(word => 
    commonPolishWords.has(word.replace(/[^\w]/g, ''))
  ).length / frontWords.length;

  if (commonWordRatio < 0.3) {
    difficultyScore += 0.5;
    reasons.push('rare_words');
  }

  // Grammar complexity indicators
  if (frontText.includes('by') || frontText.includes('gdyby')) {
    difficultyScore += 0.4;
    reasons.push('subjunctive_mood');
  }

  if (frontText.match(/\w+(em|ęs|ł|ła|ło|liśmy|liście|li|ły)/)) {
    difficultyScore += 0.2;
    reasons.push('past_tense');
  }

  // Tag-based classification
  const lowerTags = tags.toLowerCase();
  if (lowerTags.includes('advanced') || lowerTags.includes('difficult')) {
    difficultyScore += 1.0;
    reasons.push('tagged_advanced');
  } else if (lowerTags.includes('intermediate')) {
    difficultyScore += 0.5;
    reasons.push('tagged_intermediate');
  } else if (lowerTags.includes('beginner') || lowerTags.includes('basic')) {
    difficultyScore = Math.max(difficultyScore - 0.3, 0.5);
    reasons.push('tagged_beginner');
  }

  // Grammar topics
  if (lowerTags.includes('conjugation') || lowerTags.includes('declension')) {
    difficultyScore += 0.4;
    reasons.push('grammar_intensive');
  }

  // Determine final level
  if (difficultyScore >= 2.5) {
    level = 'advanced';
  } else if (difficultyScore >= 1.5) {
    level = 'intermediate';
  } else {
    level = 'beginner';
  }

  // Extract topic category from tags or content
  const topicCategory = extractTopicCategory(frontText, backText, lowerTags);

  return {
    difficulty_level: level,
    difficulty_score: Math.round(difficultyScore * 10) / 10,
    word_length: Math.round(avgWordLength * 10) / 10,
    topic_category: topicCategory,
    reasons: reasons
  };
}

/**
 * Extract topic category from content and tags
 * @param {string} front - Front text
 * @param {string} back - Back text  
 * @param {string} tags - Tags string
 * @returns {string} Topic category
 */
function extractTopicCategory(front, back, tags) {
  // Check tags first
  const tagCategories = {
    'animal': ['animal', 'zwierzę', 'pet', 'wildlife'],
    'food': ['food', 'jedzenie', 'meal', 'restaurant', 'cooking'],
    'family': ['family', 'rodzina', 'relative', 'parent'],
    'body': ['body', 'ciało', 'health', 'medical'],
    'color': ['color', 'kolor', 'colour'],
    'number': ['number', 'liczba', 'math', 'count'],
    'time': ['time', 'czas', 'date', 'clock', 'calendar'],
    'weather': ['weather', 'pogoda', 'climate'],
    'transport': ['transport', 'travel', 'car', 'bus', 'train'],
    'clothing': ['clothing', 'clothes', 'ubranie', 'fashion'],
    'emotion': ['emotion', 'feeling', 'mood'],
    'verb': ['verb', 'czasownik', 'action'],
    'adjective': ['adjective', 'przymiotnik', 'description'],
    'grammar': ['grammar', 'gramatyka', 'conjugation', 'declension']
  };

  for (const [category, keywords] of Object.entries(tagCategories)) {
    if (keywords.some(keyword => tags.includes(keyword))) {
      return category;
    }
  }

  // Content-based detection (simplified)
  const contentCategories = {
    'animal': /\b(dog|cat|bird|horse|cow|pig|chicken|fish|kot|pies|ptak|koń)\b/i,
    'food': /\b(bread|meat|milk|cheese|apple|orange|chleb|mięso|mleko|ser|jabłko)\b/i,
    'family': /\b(mother|father|sister|brother|child|matka|ojciec|siostra|brat|dziecko)\b/i,
    'color': /\b(red|blue|green|yellow|black|white|czerwony|niebieski|zielony|żółty|czarny|biały)\b/i,
    'number': /\b(one|two|three|four|five|jeden|dwa|trzy|cztery|pięć|\d+)\b/i
  };

  const combinedText = `${front} ${back}`;
  for (const [category, pattern] of Object.entries(contentCategories)) {
    if (pattern.test(combinedText)) {
      return category;
    }
  }

  return 'general';
}

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
}

/**
 * Update all cards in database with difficulty classification
 * @param {Object} db - Knex database instance
 */
async function classifyAllCards(db) {
  const cards = await db('cards').select('*');
  let updated = 0;
  
  console.log(`Classifying ${cards.length} cards...`);
  
  for (const card of cards) {
    try {
      const classification = classifyCardDifficulty(card.front, card.back, card.tags);
      
      await db('cards')
        .where({ id: card.id })
        .update({
          difficulty_level: classification.difficulty_level,
          difficulty_score: classification.difficulty_score,
          word_length: classification.word_length,
          topic_category: classification.topic_category
        });
      
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`Classified ${updated}/${cards.length} cards...`);
      }
    } catch (error) {
      console.error(`Error classifying card ${card.id}:`, error);
    }
  }
  
  console.log(`Classification complete. Updated ${updated} cards.`);
  return updated;
}

module.exports = {
  classifyCardDifficulty,
  extractTopicCategory,
  classifyAllCards,
  stripHtml
};