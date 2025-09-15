exports.up = function(knex) {
  return knex.schema
    .createTable('users', function (table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.integer('xp').defaultTo(0);
      table.integer('level').defaultTo(1);
      table.integer('streak').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('decks', function (table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.text('description');
      table.timestamps(true, true);
    })
    .createTable('cards', function (table) {
      table.increments('id').primary();
      table.integer('deck_id').unsigned().notNullable();
      table.foreign('deck_id').references('id').inTable('decks').onDelete('CASCADE');
      table.text('front').notNullable();
      table.text('back').notNullable();
      table.string('tags'); // Comma-separated tags or JSON
      table.json('media'); // Store paths to images/audio as JSON
      table.timestamps(true, true);
    })
    .createTable('user_progress', function (table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('card_id').unsigned().notNullable();
      table.foreign('card_id').references('id').inTable('cards').onDelete('CASCADE');
      table.timestamp('last_reviewed').defaultTo(knex.fn.now());
      table.timestamp('next_review').notNullable();
      table.integer('interval').defaultTo(0);
      table.float('ease_factor').defaultTo(2.5);
      table.integer('repetitions').defaultTo(0);
      table.unique(['user_id', 'card_id']); // Ensure unique progress per user-card pair
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_progress')
    .dropTableIfExists('cards')
    .dropTableIfExists('decks')
    .dropTableIfExists('users');
};
