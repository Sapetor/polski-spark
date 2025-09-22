/**
 * T003: Create card_difficulty table
 * Stores pre-calculated difficulty scores for cards
 */

exports.up = function(knex) {
  return knex.schema.createTable('card_difficulty', function(table) {
    table.increments('id').primary();
    table.integer('card_id').unsigned().notNullable();
    table.integer('vocabulary_score').notNullable();
    table.integer('grammar_score').notNullable();
    table.integer('length_score').notNullable();
    table.integer('type_score').notNullable();
    table.integer('total_difficulty').notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('card_id').references('id').inTable('cards').onDelete('CASCADE');

    // Unique constraint - one difficulty record per card
    table.unique('card_id');

    // Validation constraints
    table.check('vocabulary_score >= 0 AND vocabulary_score <= 30');
    table.check('grammar_score >= 0 AND grammar_score <= 40');
    table.check('length_score >= 0 AND length_score <= 20');
    table.check('type_score >= 0 AND type_score <= 10');
    table.check('total_difficulty >= 0 AND total_difficulty <= 100');

    // Ensure total_difficulty is sum of component scores
    table.check('total_difficulty = vocabulary_score + grammar_score + length_score + type_score');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('card_difficulty');
};