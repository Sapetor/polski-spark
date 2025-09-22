const request = require('supertest');
const express = require('express');

// T004: Contract test POST /api/upload-anki
describe('POST /api/upload-anki Contract Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual endpoint is implemented
    app = express();
    // Mock basic setup - real app will be imported later
  });

  describe('Successful upload scenarios', () => {
    test('should accept valid .apkg file and return import stats', async () => {
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('mock-apkg-content'), 'test-deck.apkg')
        .field('deckName', 'Test Deck')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        deckId: expect.any(Number),
        importStats: {
          cardsImported: expect.any(Number),
          cardsSkipped: expect.any(Number),
          processingTime: expect.any(Number),
          warnings: expect.any(Array)
        }
      });
    });

    test('should accept validation-only request', async () => {
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('mock-apkg-content'), 'test-deck.apkg')
        .field('validateOnly', 'true')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        // Should not have deckId for validation-only
        importStats: expect.any(Object)
      });
      expect(response.body.deckId).toBeUndefined();
    });
  });

  describe('Error scenarios', () => {
    test('should return 400 for missing file', async () => {
      const response = await request(app)
        .post('/api/upload-anki')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        details: expect.any(Array)
      });
    });

    test('should return 413 for oversized file', async () => {
      const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', largeBuffer, 'large-deck.apkg')
        .expect(413);
    });

    test('should return 422 for invalid file format', async () => {
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('not-a-zip-file'), 'invalid.txt')
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid file format')
      });
    });

    test('should return 500 for processing errors', async () => {
      // This test will be updated when we know what causes processing errors
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('corrupted-zip'), 'corrupted.apkg')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('Request validation', () => {
    test('should validate deckName length', async () => {
      const longName = 'a'.repeat(101); // Over 100 character limit
      const response = await request(app)
        .post('/api/upload-anki')
        .attach('ankiFile', Buffer.from('mock-apkg-content'), 'test-deck.apkg')
        .field('deckName', longName)
        .expect(400);

      expect(response.body.details).toContain(
        expect.stringContaining('deckName')
      );
    });
  });
});