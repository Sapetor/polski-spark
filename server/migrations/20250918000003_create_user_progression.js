/**
 * T001: Create user_progression table
 * Tracks user's learning progression and performance metrics
 */

exports.up = function(knex) {
  return knex.schema.createTable('user_progression', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('level').defaultTo(1).notNullable();
    table.integer('xp').defaultTo(0).notNullable();
    table.integer('streak').defaultTo(0).notNullable();
    table.integer('current_difficulty').defaultTo(10).notNullable();
    table.integer('total_sessions').defaultTo(0).notNullable();
    table.integer('total_correct_answers').defaultTo(0).notNullable();
    table.integer('total_questions_answered').defaultTo(0).notNullable();
    table.date('last_session_date').nullable();
    table.timestamp('level_up_date').nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Validation constraints
    table.check('level >= 1 AND level <= 50');
    table.check('xp >= 0');
    table.check('streak >= 0');
    table.check('current_difficulty >= 0 AND current_difficulty <= 100');
    table.check('total_sessions >= 0');
    table.check('total_correct_answers >= 0');
    table.check('total_questions_answered >= 0');
    table.check('total_correct_answers <= total_questions_answered');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_progression');
};