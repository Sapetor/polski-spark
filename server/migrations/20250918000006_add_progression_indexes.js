/**
 * T004: Create database indexes for progression queries
 * Optimizes performance for common progression-related queries
 */

exports.up = function(knex) {
  return Promise.all([
    // User progression indexes
    knex.schema.alterTable('user_progression', function(table) {
      table.index('user_id', 'idx_user_progression_user_id');
      table.index('level', 'idx_user_progression_level');
      table.index('last_session_date', 'idx_user_progression_last_session');
    }),

    // Progression sessions indexes
    knex.schema.alterTable('progression_sessions', function(table) {
      table.index(['user_id', 'session_date'], 'idx_progression_sessions_user_date');
      table.index('session_date', 'idx_progression_sessions_date');
      table.index('xp_earned', 'idx_progression_sessions_xp');
    }),

    // Card difficulty indexes
    knex.schema.alterTable('card_difficulty', function(table) {
      table.index('total_difficulty', 'idx_card_difficulty_total');
      table.index(['total_difficulty', 'card_id'], 'idx_card_difficulty_total_card');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    // Drop user progression indexes
    knex.schema.alterTable('user_progression', function(table) {
      table.dropIndex([], 'idx_user_progression_user_id');
      table.dropIndex([], 'idx_user_progression_level');
      table.dropIndex([], 'idx_user_progression_last_session');
    }),

    // Drop progression sessions indexes
    knex.schema.alterTable('progression_sessions', function(table) {
      table.dropIndex([], 'idx_progression_sessions_user_date');
      table.dropIndex([], 'idx_progression_sessions_date');
      table.dropIndex([], 'idx_progression_sessions_xp');
    }),

    // Drop card difficulty indexes
    knex.schema.alterTable('card_difficulty', function(table) {
      table.dropIndex([], 'idx_card_difficulty_total');
      table.dropIndex([], 'idx_card_difficulty_total_card');
    })
  ]);
};