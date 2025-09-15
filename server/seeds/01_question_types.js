exports.seed = async function(knex) {
  // Delete existing entries
  await knex('question_types').del();

  // Insert question types
  await knex('question_types').insert([
    {
      id: 1,
      name: 'flashcard',
      display_name: 'Flashcard',
      description: 'Traditional show question, reveal answer format',
      active: true
    },
    {
      id: 2,
      name: 'multiple_choice',
      display_name: 'Multiple Choice',
      description: 'Choose the correct answer from 4 options',
      active: true
    },
    {
      id: 3,
      name: 'fill_blank',
      display_name: 'Fill in the Blank',
      description: 'Type the missing word in the sentence',
      active: true
    },
    {
      id: 4,
      name: 'translation_pl_en',
      display_name: 'Translate Polish → English',
      description: 'Translate the Polish text to English',
      active: true
    },
    {
      id: 5,
      name: 'translation_en_pl',
      display_name: 'Translate English → Polish',
      description: 'Translate the English text to Polish',
      active: true
    },
    {
      id: 6,
      name: 'word_match',
      display_name: 'Word Matching',
      description: 'Match words to their definitions',
      active: false // Will implement later
    },
    {
      id: 7,
      name: 'listening',
      display_name: 'Listening Exercise',
      description: 'Listen and type what you hear',
      active: false // Will implement later
    }
  ]);
};