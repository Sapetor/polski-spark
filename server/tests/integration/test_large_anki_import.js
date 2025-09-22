const request = require('supertest');
const express = require('express');

// T012: Integration test: Large file import performance
describe('Large Anki Import Performance Integration Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual implementation is complete
    app = express();
    // Mock basic setup - real app will be imported later
  });

  describe('Large deck import performance', () => {
    test('should import medium deck (100-1000 cards) within 15 seconds', async () => {
      const mediumDeck = Buffer.alloc(5 * 1024 * 1024, 'medium deck content'); // 5MB

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', mediumDeck, 'medium-deck.apkg')
        .expect(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(15000); // Under 15 seconds
      expect(response.body.success).toBe(true);
      expect(response.body.importStats.processingTime).toBeLessThan(15);

      // Should import reasonable number of cards
      expect(response.body.importStats.cardsImported).toBeGreaterThan(50);
      expect(response.body.importStats.cardsImported).toBeLessThan(1500);
    });

    test('should import large deck (1000+ cards) within 30 seconds', async () => {
      const largeDeck = Buffer.alloc(20 * 1024 * 1024, 'large deck content'); // 20MB

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', largeDeck, 'large-deck.apkg')
        .expect(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(30000); // Under 30 seconds
      expect(response.body.success).toBe(true);
      expect(response.body.importStats.processingTime).toBeLessThan(30);

      // Should import substantial number of cards
      expect(response.body.importStats.cardsImported).toBeGreaterThan(800);
    });

    test('should handle maximum size deck (50MB) efficiently', async () => {
      const maxSizeDeck = Buffer.alloc(49 * 1024 * 1024, 'max size content'); // Just under 50MB

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', maxSizeDeck, 'max-size-deck.apkg')
        .expect(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(60000); // Under 1 minute for max size
      expect(response.body.success).toBe(true);

      // Should handle without memory issues
      expect(response.body.importStats).toBeDefined();
    });
  });

  describe('Progress tracking for large imports', () => {
    test('should provide progress updates during large import', async () => {
      const largeDeck = Buffer.alloc(15 * 1024 * 1024, 'progress test deck');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', largeDeck, 'progress-deck.apkg')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should have meaningful progress information
      expect(response.body.importStats).toMatchObject({
        cardsImported: expect.any(Number),
        cardsSkipped: expect.any(Number),
        processingTime: expect.any(Number)
      });

      // Processing time should be reasonable for the file size
      expect(response.body.importStats.processingTime).toBeGreaterThan(0.1);
    });

    test('should update import status in real-time for large files', async () => {
      const largeDeck = Buffer.alloc(10 * 1024 * 1024, 'status tracking deck');

      // Start the import
      const importPromise = request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', largeDeck, 'status-tracking.apkg');

      // Wait a moment then check status
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      // Should show processing status for ongoing import
      const processingImport = statusResponse.body.find(
        imp => imp.filename === 'status-tracking.apkg' && imp.status === 'processing'
      );

      // Complete the import
      const finalResponse = await importPromise;
      expect(finalResponse.status).toBe(200);

      // Verify final status
      const finalStatusResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      const completedImport = finalStatusResponse.body.find(
        imp => imp.filename === 'status-tracking.apkg' && imp.status === 'completed'
      );
      expect(completedImport).toBeDefined();
    });
  });

  describe('Memory management during large imports', () => {
    test('should process large files without excessive memory usage', async () => {
      const memoryTestDeck = Buffer.alloc(25 * 1024 * 1024, 'memory test content');

      // Monitor memory before import
      const initialMemory = process.memoryUsage();

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', memoryTestDeck, 'memory-test.apkg')
        .expect(200);

      // Monitor memory after import
      const finalMemory = process.memoryUsage();

      expect(response.body.success).toBe(true);

      // Memory increase should be reasonable (under 100MB additional)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Under 100MB
    });

    test('should use streaming for large file processing', async () => {
      const streamingTestDeck = Buffer.alloc(30 * 1024 * 1024, 'streaming test');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', streamingTestDeck, 'streaming-test.apkg')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should complete without loading entire file into memory
      expect(response.body.importStats.processingTime).toBeLessThan(45);
    });

    test('should handle multiple large files without memory leaks', async () => {
      const largeDeck1 = Buffer.alloc(10 * 1024 * 1024, 'concurrent large 1');
      const largeDeck2 = Buffer.alloc(10 * 1024 * 1024, 'concurrent large 2');

      const initialMemory = process.memoryUsage();

      // Process two large files sequentially
      const response1 = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', largeDeck1, 'concurrent-large-1.apkg')
        .expect(200);

      const response2 = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', largeDeck2, 'concurrent-large-2.apkg')
        .expect(200);

      const finalMemory = process.memoryUsage();

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);

      // Memory should not grow excessively
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(150 * 1024 * 1024); // Under 150MB total
    });
  });

  describe('Large deck classification performance', () => {
    test('should classify cards efficiently during large import', async () => {
      const classificationTestDeck = Buffer.alloc(15 * 1024 * 1024, 'classification test');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', classificationTestDeck, 'classification-test.apkg')
        .expect(200);

      expect(response.body.success).toBe(true);

      const { deckId } = response.body;

      // Verify cards were classified
      const cardsResponse = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .expect(200);

      expect(cardsResponse.body.length).toBeGreaterThan(0);

      // All cards should have difficulty classification
      cardsResponse.body.forEach(card => {
        expect(['beginner', 'intermediate', 'advanced']).toContain(card.difficulty);
      });

      // Classification should complete within reasonable time (< 1 second per 100 cards)
      const cardCount = cardsResponse.body.length;
      const expectedMaxTime = Math.ceil(cardCount / 100);
      expect(response.body.importStats.processingTime).toBeLessThan(expectedMaxTime + 10);
    });

    test('should batch process card classification for performance', async () => {
      const batchTestDeck = Buffer.alloc(20 * 1024 * 1024, 'batch processing test');

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', batchTestDeck, 'batch-test.apkg')
        .expect(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(response.body.success).toBe(true);

      // Should process efficiently in batches
      const cardCount = response.body.importStats.cardsImported;
      const timePerCard = totalTime / cardCount;

      expect(timePerCard).toBeLessThan(100); // Under 100ms per card
    });
  });

  describe('Database performance with large imports', () => {
    test('should use efficient database operations for large inserts', async () => {
      const dbTestDeck = Buffer.alloc(18 * 1024 * 1024, 'database performance test');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', dbTestDeck, 'db-performance.apkg')
        .expect(200);

      expect(response.body.success).toBe(true);

      const { deckId } = response.body;

      // Verify data integrity after large insert
      const deckResponse = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      expect(deckResponse.body.cardCount).toBe(response.body.importStats.cardsImported);

      // Database queries should remain fast
      const startTime = Date.now();

      const cardsResponse = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .expect(200);

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(2000); // Under 2 seconds
      expect(cardsResponse.body.length).toBe(response.body.importStats.cardsImported);
    });

    test('should handle transaction rollbacks efficiently for large operations', async () => {
      const rollbackTestDeck = Buffer.from('causes rollback scenario');

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', rollbackTestDeck, 'rollback-test.apkg')
        .expect(500);

      expect(response.body.success).toBe(false);

      // Rollback should be fast even for large operations
      // Should not leave partial data in database
      const decksResponse = await request(app)
        .get('/api/decks')
        .expect(200);

      const partialDeck = decksResponse.body.find(
        deck => deck.name && deck.name.includes('rollback-test')
      );
      expect(partialDeck).toBeUndefined();
    });
  });

  describe('Concurrent large file handling', () => {
    test('should handle multiple large imports without system overload', async () => {
      const largeDeck1 = Buffer.alloc(8 * 1024 * 1024, 'concurrent 1');
      const largeDeck2 = Buffer.alloc(8 * 1024 * 1024, 'concurrent 2');
      const largeDeck3 = Buffer.alloc(8 * 1024 * 1024, 'concurrent 3');

      const startTime = Date.now();

      // Start all three imports concurrently
      const [result1, result2, result3] = await Promise.allSettled([
        request(app)
          .post('/api/upload-anki')
          .attach('ankiFile', largeDeck1, 'concurrent-large-1.apkg'),
        request(app)
          .post('/api/upload-anki')
          .attach('ankiFile', largeDeck2, 'concurrent-large-2.apkg'),
        request(app)
          .post('/api/upload-anki')
          .attach('ankiFile', largeDeck3, 'concurrent-large-3.apkg')
      ]);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All should complete without timeout
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');
      expect(result3.status).toBe('fulfilled');

      // Should complete in reasonable time (not 3x sequential time)
      expect(totalTime).toBeLessThan(90000); // Under 90 seconds for all three
    });
  });
});