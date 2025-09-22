exports.up = function(knex) {
  return knex.schema
    // Create anki_imports table
    .createTable('anki_imports', table => {
      table.increments('id').primary();
      table.string('filename', 255).notNullable();
      table.integer('file_size').notNullable();
      table.integer('cards_imported').defaultTo(0);
      table.integer('cards_failed').defaultTo(0);
      table.decimal('import_duration', 8, 3); // seconds with millisecond precision
      table.json('error_log'); // JSON array of import errors
      table.enum('status', ['pending', 'processing', 'completed', 'error']).defaultTo('pending');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index(['status', 'created_at']);
    })

    // Add Anki metadata columns to existing decks table
    .table('decks', table => {
      table.json('anki_metadata'); // Original Anki deck information
      table.enum('import_status', ['pending', 'processing', 'completed', 'error']).nullable();
      table.text('import_log'); // Import process details
      table.string('file_checksum', 32); // MD5 hash of original .apkg file
      table.integer('anki_import_id').unsigned().nullable();
      table.timestamp('import_date').nullable();

      table.foreign('anki_import_id').references('id').inTable('anki_imports').onDelete('SET NULL');
      table.index(['import_status']);
      table.index(['file_checksum']);
    })

    // Add Anki fields to existing cards table
    .table('cards', table => {
      table.string('anki_note_id', 50); // Original Anki note identifier
      table.string('anki_model', 100); // Anki note type/model name
      table.json('anki_fields'); // JSON array of original field names and values
      table.json('anki_tags'); // JSON array of Anki tags
      table.json('media_files'); // JSON array of referenced media file paths
      table.timestamp('import_date').nullable();

      table.index(['anki_note_id']);
      table.index(['anki_model']);
    });
};

exports.down = function(knex) {
  return knex.schema
    // Remove columns from cards table
    .table('cards', table => {
      table.dropIndex(['anki_note_id']);
      table.dropIndex(['anki_model']);
      table.dropColumn('anki_note_id');
      table.dropColumn('anki_model');
      table.dropColumn('anki_fields');
      table.dropColumn('anki_tags');
      table.dropColumn('media_files');
      table.dropColumn('import_date');
    })

    // Remove columns from decks table
    .table('decks', table => {
      table.dropForeign(['anki_import_id']);
      table.dropIndex(['import_status']);
      table.dropIndex(['file_checksum']);
      table.dropColumn('anki_metadata');
      table.dropColumn('import_status');
      table.dropColumn('import_log');
      table.dropColumn('file_checksum');
      table.dropColumn('anki_import_id');
      table.dropColumn('import_date');
    })

    // Drop anki_imports table
    .dropTableIfExists('anki_imports');
};