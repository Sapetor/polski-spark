const request = require('supertest');
const express = require('express');

// T011: Integration test: Error handling for invalid files
describe('Anki Error Handling Integration Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual implementation is complete
    app = express();
    // Mock basic setup - real app will be imported later
  });

  describe('Invalid file format handling', () => {
    test('should reject non-.apkg files with clear error message', async () => {
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('This is not a zip file'), 'invalid.txt')
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid file format'),
        details: expect.arrayContaining([
          expect.stringContaining('.apkg')
        ])
      });

      // Should not create any database records
      const importsResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      const failedImport = importsResponse.body.find(
        imp => imp.filename === 'invalid.txt'
      );
      expect(failedImport).toBeUndefined();
    });

    test('should reject corrupted ZIP files', async () => {
      const corruptedZip = Buffer.from('PK\x03\x04corrupted zip content');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', corruptedZip, 'corrupted.apkg')
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('corrupted')
      });
    });

    test('should reject empty files', async () => {
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from(''), 'empty.apkg')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('empty'),
        details: expect.any(Array)
      });
    });

    test('should reject files over size limit (50MB)', async () => {
      // Create a large buffer (simulate 60MB file)
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024, 'a');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', largeBuffer, 'oversized.apkg')
        .expect(413);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('too large')
      });
    });
  });

  describe('Invalid Anki content handling', () => {
    test('should handle .apkg files missing required Anki database', async () => {
      // Valid ZIP but missing collection.anki2 database
      const incompleteApkg = Buffer.from('PK mock zip without anki db');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', incompleteApkg, 'no-database.apkg')
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Anki database'),
        details: expect.arrayContaining([
          expect.stringContaining('collection.anki2')
        ])
      });
    });

    test('should handle .apkg files with corrupted Anki database', async () => {
      const corruptedDb = Buffer.from('SQLite format corrupted');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', corruptedDb, 'corrupted-db.apkg')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('database')
      });

      // Should create error import record
      const importsResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      const errorImport = importsResponse.body.find(
        imp => imp.filename === 'corrupted-db.apkg' && imp.status === 'error'
      );
      expect(errorImport).toBeDefined();
    });

    test('should handle .apkg files with no cards/notes', async () => {
      const emptyDb = Buffer.from('valid sqlite but no notes');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', emptyDb, 'empty-deck.apkg')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('no cards'),
        details: expect.arrayContaining([
          expect.stringContaining('empty')
        ])
      });
    });

    test('should handle .apkg files with unsupported note types', async () => {
      const unsupportedNotes = Buffer.from('anki db with complex note types');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', unsupportedNotes, 'unsupported-types.apkg')
        .expect(200); // Should succeed but with warnings

      expect(response.body).toMatchObject({
        success: true,
        importStats: {
          warnings: expect.arrayContaining([
            expect.stringContaining('note type')
          ])
        }
      });
    });
  });

  describe('Processing error recovery', () => {
    test('should handle partial import failures gracefully', async () => {
      const partiallyCorrupted = Buffer.from('some valid some invalid cards');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', partiallyCorrupted, 'partial-fail.apkg')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        importStats: {
          cardsImported: expect.any(Number),
          cardsSkipped: expect.any(Number),
          warnings: expect.any(Array)
        }
      });

      // Should have imported some cards
      expect(response.body.importStats.cardsImported).toBeGreaterThan(0);
      expect(response.body.importStats.cardsSkipped).toBeGreaterThan(0);

      // Import record should show partial success
      const importsResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      const partialImport = importsResponse.body.find(
        imp => imp.filename === 'partial-fail.apkg'
      );
      expect(partialImport.status).toBe('completed');
    });

    test('should rollback database changes on critical failures', async () => {
      const criticalFailure = Buffer.from('causes database constraint violation');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', criticalFailure, 'critical-fail.apkg')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });

      // Should not have created partial deck
      const decksResponse = await request(app)
        .get('/api/decks')
        .expect(200);

      const partialDeck = decksResponse.body.find(
        deck => deck.name && deck.name.includes('critical-fail')
      );
      expect(partialDeck).toBeUndefined();

      // Should have error import record
      const importsResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      const errorImport = importsResponse.body.find(
        imp => imp.filename === 'critical-fail.apkg' && imp.status === 'error'
      );
      expect(errorImport).toBeDefined();
    });

    test('should clean up temporary files after processing errors', async () => {
      const errorFile = Buffer.from('causes processing error');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', errorFile, 'cleanup-error.apkg')
        .expect(500);

      expect(response.body.success).toBe(false);

      // Temporary files should be cleaned up even after errors
      // (This will be tested by checking file system in actual implementation)
    });
  });

  describe('Concurrent upload handling', () => {
    test('should handle multiple simultaneous uploads without corruption', async () => {
      const file1 = Buffer.from('concurrent upload 1');
      const file2 = Buffer.from('concurrent upload 2');

      // Start both uploads simultaneously
      const [response1, response2] = await Promise.allSettled([
        request(app)
          .post('/api/upload-anki')
          .attach('ankiFile', file1, 'concurrent-1.apkg'),
        request(app)
          .post('/api/upload-anki')
          .attach('ankiFile', file2, 'concurrent-2.apkg')
      ]);

      // Both should complete (success or error, but not hang/crash)
      expect(response1.status).toBe('fulfilled');
      expect(response2.status).toBe('fulfilled');

      // Check import records
      const importsResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      const concurrent1 = importsResponse.body.find(imp => imp.filename === 'concurrent-1.apkg');
      const concurrent2 = importsResponse.body.find(imp => imp.filename === 'concurrent-2.apkg');

      // Both should have records (success or error)
      expect(concurrent1).toBeDefined();
      expect(concurrent2).toBeDefined();
    });
  });

  describe('System resource handling', () => {
    test('should handle memory pressure during large file processing', async () => {
      // Simulate memory-intensive file
      const memoryIntensive = Buffer.from('large complex anki deck');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', memoryIntensive, 'memory-test.apkg');

      // Should complete without running out of memory
      expect([200, 413, 500]).toContain(response.status);

      if (response.status === 500) {
        expect(response.body.error).not.toContain('memory');
      }
    });

    test('should timeout extremely slow processing operations', async () => {
      const slowProcessing = Buffer.from('extremely complex deck');

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', slowProcessing, 'slow-process.apkg');

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should not hang indefinitely (max 60 seconds for any import)
      expect(processingTime).toBeLessThan(60000);

      if (response.status === 500) {
        expect(response.body.error).toContain('timeout');
      }
    });
  });

  describe('User-friendly error messages', () => {
    test('should provide actionable error messages for common issues', async () => {
      const invalidFile = Buffer.from('not an anki file');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', invalidFile, 'help-user.txt')
        .expect(422);

      expect(response.body.error).toContain('.apkg');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('export')
        ])
      );

      // Should provide guidance on how to create proper .apkg files
      const hasHelpfulDetails = response.body.details.some(detail =>
        detail.includes('Anki') && detail.includes('export')
      );
      expect(hasHelpfulDetails).toBe(true);
    });

    test('should include import ID in error responses for tracking', async () => {
      const errorFile = Buffer.from('trackable error');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', errorFile, 'trackable-error.apkg')
        .expect(500);

      // Should include reference ID for user support
      expect(
        response.body.error.includes('reference') ||
        response.body.importId ||
        response.body.errorId
      ).toBe(true);
    });
  });
});