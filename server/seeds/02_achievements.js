exports.seed = async function(knex) {
  // Delete existing entries
  await knex('achievements').del();

  // Insert achievements
  await knex('achievements').insert([
    {
      id: 1,
      key: 'first_lesson',
      name: 'First Steps',
      description: 'Complete your first lesson',
      icon: '🎯',
      xp_reward: 10,
      requirements: JSON.stringify({ lessons_completed: 1 }),
      active: true
    },
    {
      id: 2,
      key: 'perfect_session',
      name: 'Perfectionist',
      description: 'Complete a lesson with 100% accuracy',
      icon: '💯',
      xp_reward: 25,
      requirements: JSON.stringify({ perfect_accuracy: true, min_questions: 5 }),
      active: true
    },
    {
      id: 3,
      key: 'speed_demon',
      name: 'Speed Demon',
      description: 'Answer 10 questions correctly in under 30 seconds',
      icon: '⚡',
      xp_reward: 20,
      requirements: JSON.stringify({ correct_answers: 10, max_time_ms: 30000 }),
      active: true
    },
    {
      id: 4,
      key: 'streak_3',
      name: 'Getting Started',
      description: 'Maintain a 3-day learning streak',
      icon: '🔥',
      xp_reward: 15,
      requirements: JSON.stringify({ daily_streak: 3 }),
      active: true
    },
    {
      id: 5,
      key: 'streak_7',
      name: 'Dedicated Learner',
      description: 'Maintain a 7-day learning streak',
      icon: '📚',
      xp_reward: 30,
      requirements: JSON.stringify({ daily_streak: 7 }),
      active: true
    },
    {
      id: 6,
      key: 'card_master_50',
      name: 'Card Master',
      description: 'Master 50 cards',
      icon: '🎓',
      xp_reward: 50,
      requirements: JSON.stringify({ mastered_cards: 50 }),
      active: true
    },
    {
      id: 7,
      key: 'multi_choice_expert',
      name: 'Multiple Choice Expert',
      description: 'Answer 25 multiple choice questions correctly',
      icon: '🎯',
      xp_reward: 20,
      requirements: JSON.stringify({ question_type: 'multiple_choice', correct_answers: 25 }),
      active: true
    },
    {
      id: 8,
      key: 'translator',
      name: 'Translator',
      description: 'Complete 20 translation exercises',
      icon: '🔄',
      xp_reward: 25,
      requirements: JSON.stringify({ translation_exercises: 20 }),
      active: true
    }
  ]);
};