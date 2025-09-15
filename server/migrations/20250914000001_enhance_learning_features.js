exports.up = function(knex) {
  return knex.schema
    // Add new columns to existing cards table
    .alterTable('cards', function (table) {
      table.string('difficulty_level').defaultTo('beginner'); // beginner, intermediate, advanced
      table.string('topic_category'); // animals, food, verbs, etc.
      table.integer('word_length').defaultTo(0); // for difficulty calculation
      table.float('difficulty_score').defaultTo(1.0); // calculated difficulty (1-5)
    })
    
    // Create question_types table
    .createTable('question_types', function (table) {
      table.increments('id').primary();
      table.string('name', 50).notNullable().unique(); // multiple_choice, fill_blank, translation, etc.
      table.string('display_name', 100).notNullable();
      table.text('description');
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Create user_sessions table
    .createTable('user_sessions', function (table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('deck_id').unsigned().notNullable();
      table.foreign('deck_id').references('id').inTable('decks').onDelete('CASCADE');
      table.timestamp('start_time').defaultTo(knex.fn.now());
      table.timestamp('end_time');
      table.integer('cards_studied').defaultTo(0);
      table.integer('correct_answers').defaultTo(0);
      table.integer('total_answers').defaultTo(0);
      table.float('accuracy_percentage').defaultTo(0);
      table.integer('xp_earned').defaultTo(0);
      table.timestamps(true, true);
    })
    
    // Create exercise_results table
    .createTable('exercise_results', function (table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('card_id').unsigned().notNullable();
      table.foreign('card_id').references('id').inTable('cards').onDelete('CASCADE');
      table.integer('session_id').unsigned();
      table.foreign('session_id').references('id').inTable('user_sessions').onDelete('SET NULL');
      table.string('question_type', 50).notNullable(); // type of exercise performed
      table.boolean('correct').notNullable();
      table.text('user_answer');
      table.text('correct_answer');
      table.integer('time_taken_ms'); // time to answer in milliseconds
      table.integer('hints_used').defaultTo(0);
      table.timestamps(true, true);
    })
    
    // Create achievements table
    .createTable('achievements', function (table) {
      table.increments('id').primary();
      table.string('key', 50).notNullable().unique(); // first_lesson, perfect_session, etc.
      table.string('name', 100).notNullable();
      table.text('description');
      table.string('icon', 50); // icon identifier
      table.integer('xp_reward').defaultTo(0);
      table.json('requirements'); // JSON object describing unlock conditions
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    // Create user_achievements table
    .createTable('user_achievements', function (table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('achievement_id').unsigned().notNullable();
      table.foreign('achievement_id').references('id').inTable('achievements').onDelete('CASCADE');
      table.timestamp('earned_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'achievement_id']); // user can only earn each achievement once
      table.timestamps(true, true);
    })
    
    // Enhanced user_progress table with more fields
    .alterTable('user_progress', function (table) {
      table.integer('correct_count').defaultTo(0);
      table.integer('incorrect_count').defaultTo(0);
      table.float('average_response_time').defaultTo(0);
      table.timestamp('first_seen').defaultTo(knex.fn.now());
      table.string('mastery_level').defaultTo('learning'); // learning, familiar, mastered
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_achievements')
    .dropTableIfExists('achievements')
    .dropTableIfExists('exercise_results')
    .dropTableIfExists('user_sessions')
    .dropTableIfExists('question_types')
    .alterTable('user_progress', function (table) {
      table.dropColumn('correct_count');
      table.dropColumn('incorrect_count');
      table.dropColumn('average_response_time');
      table.dropColumn('first_seen');
      table.dropColumn('mastery_level');
    })
    .alterTable('cards', function (table) {
      table.dropColumn('difficulty_level');
      table.dropColumn('topic_category');
      table.dropColumn('word_length');
      table.dropColumn('difficulty_score');
    });
};