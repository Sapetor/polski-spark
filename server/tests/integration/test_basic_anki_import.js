const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

// T009: Integration test: Basic Anki import scenario
describe('Basic Anki Import Integration Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual implementation is complete
    app = express();
    // Mock basic setup - real app will be imported later
  });

  beforeEach(() => {
    // Reset database state for each test
    // This will be implemented when we have actual database setup
  });

  describe('End-to-end Anki import flow', () => {
    test('should complete full import workflow: upload → parse → store → verify', async () => {
      // Step 1: Upload Anki file
      const uploadResponse = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('mock-apkg-content'), 'test-deck.apkg')
        .field('deckName', 'Integration Test Deck')
        .expect(200);

      expect(uploadResponse.body).toMatchObject({
        success: true,
        deckId: expect.any(Number),
        importStats: {
          cardsImported: expect.any(Number),
          cardsSkipped: expect.any(Number),
          processingTime: expect.any(Number)
        }
      });

      const { deckId } = uploadResponse.body;

      // Step 2: Verify deck appears in deck list
      const decksResponse = await request(app)
        .get('/api/decks')
        .expect(200);

      const importedDeck = decksResponse.body.find(deck => deck.id === deckId);
      expect(importedDeck).toBeDefined();
      expect(importedDeck.name).toBe('Integration Test Deck');

      // Step 3: Verify deck has Anki metadata
      const deckDetailResponse = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      expect(deckDetailResponse.body.ankiMetadata).toBeDefined();
      expect(deckDetailResponse.body.ankiMetadata).toMatchObject({
        originalFilename: 'test-deck.apkg',
        importDate: expect.any(String)
      });

      // Step 4: Verify cards were imported with Anki data
      const cardsResponse = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .query({ includeAnkiData: true })
        .expect(200);

      expect(Array.isArray(cardsResponse.body)).toBe(true);
      expect(cardsResponse.body.length).toBeGreaterThan(0);

      // Verify at least one card has Anki data
      const ankiCard = cardsResponse.body.find(card => card.ankiData !== null);
      expect(ankiCard).toBeDefined();
      expect(ankiCard.ankiData).toMatchObject({
        noteId: expect.any(String),
        model: expect.any(String)
      });
    });

    test('should create import record and track it', async () => {
      // Step 1: Import a deck
      const uploadResponse = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('mock-apkg-content'), 'tracked-deck.apkg')
        .expect(200);

      // Step 2: Check import history
      const importsResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      expect(Array.isArray(importsResponse.body)).toBe(true);
      expect(importsResponse.body.length).toBeGreaterThan(0);

      // Find our import
      const ourImport = importsResponse.body.find(
        imp => imp.filename === 'tracked-deck.apkg'
      );
      expect(ourImport).toBeDefined();
      expect(ourImport.status).toBe('completed');

      // Step 3: Get detailed import information
      const importDetailResponse = await request(app)
        .get(`/api/anki-imports/${ourImport.id}`)
        .expect(200);

      expect(importDetailResponse.body).toMatchObject({
        id: ourImport.id,
        filename: 'tracked-deck.apkg',
        deckId: uploadResponse.body.deckId,
        importStats: {
          cardsImported: expect.any(Number),
          cardsSkipped: expect.any(Number)
        }
      });
    });

    test('should handle small deck import efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('small-mock-deck'), 'small-deck.apkg')
        .expect(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete small deck in under 5 seconds (per quickstart requirements)
      expect(totalTime).toBeLessThan(5000);

      expect(response.body.importStats.processingTime).toBeLessThan(5);
    });
  });

  describe('Data consistency verification', () => {
    test('should maintain referential integrity between tables', async () => {
      // Import a deck
      const uploadResponse = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('consistency-test'), 'integrity-deck.apkg')
        .expect(200);

      const { deckId } = uploadResponse.body;

      // Verify deck exists
      const deckResponse = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      // Verify cards belong to this deck
      const cardsResponse = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .expect(200);

      // All cards should belong to this deck (this will be verified via database queries)
      expect(cardsResponse.body.length).toBeGreaterThanOrEqual(0);

      // Verify import record exists and links to deck
      const importsResponse = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      const relatedImport = importsResponse.body.find(
        imp => imp.filename === 'integrity-deck.apkg'
      );
      expect(relatedImport).toBeDefined();

      const importDetailResponse = await request(app)
        .get(`/api/anki-imports/${relatedImport.id}`)
        .expect(200);

      expect(importDetailResponse.body.deckId).toBe(deckId);
    });

    test('should preserve original Anki metadata accurately', async () => {
      // Import with specific metadata
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('metadata-rich-deck'), 'metadata-test.apkg')
        .expect(200);

      const { deckId } = response.body;

      // Get deck with metadata
      const deckResponse = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      const metadata = deckResponse.body.ankiMetadata;
      expect(metadata).toBeDefined();
      expect(metadata.originalFilename).toBe('metadata-test.apkg');
      expect(new Date(metadata.importDate)).toBeInstanceOf(Date);

      // Get cards with Anki data
      const cardsResponse = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .query({ includeAnkiData: true })
        .expect(200);

      // Verify Anki data preservation
      cardsResponse.body.forEach(card => {
        if (card.ankiData) {
          expect(card.ankiData.noteId).toBeTruthy();
          expect(card.ankiData.model).toBeTruthy();
          expect(typeof card.ankiData.originalFields).toBe('object');
        }
      });
    });
  });

  describe('Cleanup and error recovery', () => {
    test('should clean up temporary files after successful import', async () => {
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('cleanup-test'), 'cleanup-deck.apkg')
        .expect(200);

      // Verify import succeeded
      expect(response.body.success).toBe(true);

      // Temporary files should be cleaned up
      // (This will be tested by checking file system in actual implementation)
    });

    test('should handle import interruption gracefully', async () => {
      // This test will simulate interruption scenarios
      // For now, just verify basic error handling exists
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from(''), 'empty-file.apkg');

      // Should handle gracefully, not crash
      expect([400, 422, 500]).toContain(response.status);
    });
  });
});