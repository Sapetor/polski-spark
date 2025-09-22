# Quickstart: Anki Integration Testing

## Prerequisites
- Polski Spark application running (client on :3000, server on :3001)
- Sample Anki deck file (.apkg format)
- User profile created in the application

## Test Scenarios

### Scenario 1: Basic Anki Import
**Goal**: Verify successful import of valid Anki deck

1. **Setup**:
   ```bash
   # Ensure application is running
   cd /home/sapet/polski-spark/server && npm start &
   cd /home/sapet/polski-spark/client && npm start &
   ```

2. **Upload Test**:
   - Navigate to http://localhost:3000
   - Select or create user profile
   - Look for Anki import interface (should be enhanced from existing upload)
   - Upload a small test .apkg file (< 1MB)

3. **Expected Results**:
   - File upload completes without errors
   - Import progress indicator shows
   - New deck appears in deck list with imported card count
   - Cards show in lesson interface with generated questions

### Scenario 2: Question Generation from Anki Cards
**Goal**: Verify question types work with imported content

1. **Start Lesson**:
   - Select newly imported deck
   - Start lesson with mixed question types

2. **Expected Results**:
   - Multiple choice questions generated from Anki content
   - Fill-in-the-blank questions identify key Polish words
   - Translation questions work bidirectionally
   - Flashcard questions maintain original front/back format

3. **Validation**:
   ```bash
   # Check database for imported cards
   sqlite3 /home/sapet/polski-spark/server/database.sqlite
   SELECT COUNT(*) FROM cards WHERE anki_note_id IS NOT NULL;
   ```

### Scenario 3: Error Handling
**Goal**: Verify graceful handling of invalid files

1. **Test Invalid Files**:
   - Upload non-.apkg file (should fail validation)
   - Upload corrupted .apkg file
   - Upload empty file

2. **Expected Results**:
   - Clear error messages for each failure type
   - No partial imports or corrupted data
   - Application remains stable

### Scenario 4: Large File Import
**Goal**: Verify performance with realistic deck sizes

1. **Test Large Deck**:
   - Use Anki deck with 1000+ cards
   - Monitor import progress and completion time

2. **Expected Results**:
   - Progress indicator updates during import
   - Import completes within reasonable time (< 30 seconds)
   - All cards properly classified and available

## API Testing

### Direct API Validation
```bash
# Test upload endpoint
curl -X POST http://localhost:3001/api/upload-anki \
  -F "ankiFile=@test-deck.apkg" \
  -F "deckName=Test Import"

# Expected: 200 response with import statistics

# Test import history
curl http://localhost:3001/api/anki-imports

# Expected: Array of import records
```

### Database Verification
```sql
-- Check import records
SELECT * FROM anki_imports ORDER BY created_at DESC LIMIT 5;

-- Verify card data
SELECT
  id, front, back, difficulty, anki_note_id
FROM cards
WHERE anki_note_id IS NOT NULL
LIMIT 10;

-- Check deck metadata
SELECT
  name, anki_metadata
FROM decks
WHERE anki_metadata IS NOT NULL;
```

## Performance Benchmarks

### Import Speed Targets
- **Small deck** (< 100 cards): < 5 seconds
- **Medium deck** (100-1000 cards): < 15 seconds
- **Large deck** (1000+ cards): < 30 seconds

### Memory Usage
- **Import process**: < 100MB additional memory
- **Large file handling**: Streaming, no full file in memory

### Question Generation
- **Mixed lesson creation**: < 2 seconds for 20 questions
- **Classification time**: < 1 second per 100 cards

## Rollback Instructions

If testing reveals issues:

1. **Stop import process**:
   ```bash
   # Kill any running imports (if background processing added)
   pkill -f "anki-import"
   ```

2. **Clean up partial imports**:
   ```sql
   -- Remove failed imports
   DELETE FROM cards WHERE deck_id IN (
     SELECT id FROM decks WHERE import_status = 'error'
   );
   DELETE FROM decks WHERE import_status = 'error';
   DELETE FROM anki_imports WHERE status = 'error';
   ```

3. **Reset to clean state**:
   ```bash
   # Restore from backup if needed
   cp database.sqlite.backup database.sqlite
   ```

## Success Criteria

✅ **Must Pass**:
- Upload and import at least one Anki deck successfully
- Generate and answer questions from imported content
- Maintain existing functionality for native decks
- Handle file upload errors gracefully

✅ **Should Pass**:
- Import large decks (1000+ cards) within time targets
- Preserve Anki metadata for future reference
- Support common Anki note types and media files

✅ **Could Pass**:
- Export modified decks back to Anki format
- Advanced progress integration with spaced repetition
- Bulk import multiple decks simultaneously