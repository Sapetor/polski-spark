# Data Model: Anki Integration

## Entity Extensions

### Anki Deck (extends existing `decks` table)
- **anki_metadata**: JSON field for original Anki deck information
  - deck_id: Original Anki deck identifier
  - version: Anki deck version
  - created_date: Original creation timestamp
  - modified_date: Last modification in Anki
  - tags: Global deck tags
- **import_status**: ENUM('pending', 'processing', 'completed', 'error')
- **import_log**: TEXT field for import process details
- **file_checksum**: MD5 hash of original .apkg file

### Flashcard (extends existing `cards` table)
- **anki_note_id**: Original Anki note identifier
- **anki_model**: Anki note type/model name
- **anki_fields**: JSON array of original field names and values
- **anki_tags**: JSON array of Anki tags
- **media_files**: JSON array of referenced media file paths
- **import_date**: Timestamp when card was imported

### Import Session (new table: `anki_imports`)
- **id**: Primary key
- **filename**: Original .apkg filename
- **file_size**: File size in bytes
- **cards_imported**: Count of successfully imported cards
- **cards_failed**: Count of failed card imports
- **import_duration**: Processing time in seconds
- **error_log**: JSON array of import errors
- **created_at**: Import timestamp

## Validation Rules

### File Validation
- **Format**: Must be valid .apkg (ZIP) file
- **Size**: Maximum 50MB per file
- **Content**: Must contain valid SQLite database and media directory
- **Structure**: Validate required Anki schema tables (notes, cards, col)

### Card Content Validation
- **Required Fields**: front and back content mandatory
- **Text Length**: Max 2000 characters per field
- **Media References**: Validate referenced files exist in media/ directory
- **Encoding**: UTF-8 text encoding required

### Import Process Validation
- **Duplicates**: Check against existing cards by content hash
- **Deck Naming**: Ensure unique deck names within user scope
- **Progress**: Validate import doesn't conflict with existing user progress

## State Transitions

### Import Process Flow
1. **Upload** → File received and stored temporarily
2. **Validation** → File format and content validation
3. **Processing** → Extract cards and metadata
4. **Classification** → Apply existing difficulty classification
5. **Storage** → Insert validated cards into database
6. **Completion** → Clean up temporary files, update status

### Error Recovery
- **Validation Failure** → Reject file with specific error message
- **Processing Error** → Partial import with detailed error log
- **Storage Failure** → Rollback transaction, maintain data integrity

## Integration with Existing Schema

### Compatibility Maintenance
- All existing queries continue to work unchanged
- New fields use NULL defaults for backwards compatibility
- Existing card classification and question generation work with imported cards
- Spaced repetition algorithm applies to Anki cards without modification

### Performance Considerations
- Index on anki_note_id for lookup performance
- JSON field queries for tag-based filtering
- Batch insert operations for large imports
- Background processing for classification of imported cards