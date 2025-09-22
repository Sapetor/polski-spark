/**
 * T002: Create progression_sessions table
 * Tracks individual session progression data
 */

exports.up = function(knex) {
  return knex.schema.createTable('progression_sessions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('session_id').unsigned().nullable();
    table.date('session_date').notNullable();
    table.integer('starting_difficulty').notNullable();
    table.integer('ending_difficulty').notNullable();
    table.integer('xp_earned').notNullable();
    table.integer('questions_answered').notNullable();
    table.integer('correct_answers').notNullable();
    table.decimal('session_accuracy', 5, 2).notNullable();
    table.integer('difficulty_adjustments').defaultTo(0).notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('session_id').references('id').inTable('learning_sessions').onDelete('SET NULL');

    // Validation constraints
    table.check('starting_difficulty >= 0 AND starting_difficulty <= 100');
    table.check('ending_difficulty >= 0 AND ending_difficulty <= 100');
    table.check('xp_earned >= 0');
    table.check('questions_answered >= 0');
    table.check('correct_answers >= 0');
    table.check('correct_answers <= questions_answered');
    table.check('session_accuracy >= 0 AND session_accuracy <= 100');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('progression_sessions');
};