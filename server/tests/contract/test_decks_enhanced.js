const request = require('supertest');
const express = require('express');

// T007: Contract test GET /api/decks/{id} (enhanced with Anki metadata)
describe('GET /api/decks/{id} Enhanced Contract Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual endpoint is implemented
    app = express();
    // Mock basic setup - real app will be imported later
  });

  describe('Native deck scenarios', () => {
    test('should return deck details without Anki metadata for native decks', async () => {
      const deckId = 1; // Assume this is a native deck

      const response = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: deckId,
        name: expect.any(String),
        description: expect.any(String),
        cardCount: expect.any(Number),
        ankiMetadata: null // Should be null for native decks
      });
    });
  });

  describe('Anki-imported deck scenarios', () => {
    test('should return deck details with Anki metadata for imported decks', async () => {
      const ankiDeckId = 2; // Assume this is an Anki-imported deck

      const response = await request(app)
        .get(`/api/decks/${ankiDeckId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: ankiDeckId,
        name: expect.any(String),
        description: expect.any(String),
        cardCount: expect.any(Number)
      });

      // If this is an Anki deck, metadata should be present
      if (response.body.ankiMetadata) {
        expect(response.body.ankiMetadata).toMatchObject({
          originalDeckId: expect.any(String),
          version: expect.any(String),
          importDate: expect.any(String), // ISO date string
          originalFilename: expect.any(String),
          tags: expect.any(Array)
        });

        // Validate date format
        expect(() => new Date(response.body.ankiMetadata.importDate)).not.toThrow();
      }
    });

    test('should include import statistics in Anki metadata', async () => {
      const ankiDeckId = 2;

      const response = await request(app)
        .get(`/api/decks/${ankiDeckId}`)
        .expect(200);

      if (response.body.ankiMetadata) {
        expect(response.body.ankiMetadata).toHaveProperty('originalDeckId');
        expect(response.body.ankiMetadata).toHaveProperty('version');
        expect(response.body.ankiMetadata).toHaveProperty('importDate');
        expect(response.body.ankiMetadata).toHaveProperty('originalFilename');
        expect(response.body.ankiMetadata).toHaveProperty('tags');

        // Validate tags array
        expect(Array.isArray(response.body.ankiMetadata.tags)).toBe(true);
      }
    });
  });

  describe('Error scenarios', () => {
    test('should return 404 for non-existent deck', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .get(`/api/decks/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('not found')
      });
    });

    test('should return 400 for invalid deck ID format', async () => {
      const invalidId = 'abc';

      const response = await request(app)
        .get(`/api/decks/${invalidId}`)
        .expect(400);
    });
  });

  describe('Backwards compatibility', () => {
    test('should maintain existing deck response structure', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      // Existing fields should still be present
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('cardCount');

      // New field should be present but nullable
      expect(response.body).toHaveProperty('ankiMetadata');
    });

    test('should handle missing Anki metadata gracefully', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      // ankiMetadata can be null for non-Anki decks
      expect(
        response.body.ankiMetadata === null ||
        typeof response.body.ankiMetadata === 'object'
      ).toBe(true);
    });
  });

  describe('Data validation', () => {
    test('should have correct data types for all fields', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}`)
        .expect(200);

      expect(typeof response.body.id).toBe('number');
      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.description).toBe('string');
      expect(typeof response.body.cardCount).toBe('number');

      // Verify cardCount is non-negative
      expect(response.body.cardCount).toBeGreaterThanOrEqual(0);
    });
  });
});