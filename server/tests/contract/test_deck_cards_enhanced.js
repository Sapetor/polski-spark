const request = require('supertest');
const express = require('express');

// T008: Contract test GET /api/decks/{id}/cards (enhanced with Anki metadata)
describe('GET /api/decks/{id}/cards Enhanced Contract Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual endpoint is implemented
    app = express();
    // Mock basic setup - real app will be imported later
  });

  describe('Default behavior (without includeAnkiData)', () => {
    test('should return cards without Anki data by default', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toMatchObject({
          id: expect.any(Number),
          front: expect.any(String),
          back: expect.any(String),
          difficulty: expect.stringMatching(/^(beginner|intermediate|advanced)$/)
        });

        // ankiData should not be present by default
        expect(response.body[0]).not.toHaveProperty('ankiData');
      }
    });

    test('should maintain backwards compatibility with existing card structure', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .expect(200);

      response.body.forEach(card => {
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('front');
        expect(card).toHaveProperty('back');
        expect(card).toHaveProperty('difficulty');

        // Validate difficulty enum
        expect(['beginner', 'intermediate', 'advanced']).toContain(card.difficulty);
      });
    });
  });

  describe('With includeAnkiData=true', () => {
    test('should include Anki data when requested for Anki cards', async () => {
      const ankiDeckId = 2; // Assume this deck has Anki cards

      const response = await request(app)
        .get(`/api/decks/${ankiDeckId}/cards`)
        .query({ includeAnkiData: true })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Find an Anki card (one with ankiData)
      const ankiCard = response.body.find(card => card.ankiData !== null);

      if (ankiCard) {
        expect(ankiCard.ankiData).toMatchObject({
          noteId: expect.any(String),
          model: expect.any(String),
          originalFields: expect.any(Object),
          tags: expect.any(Array),
          mediaFiles: expect.any(Array)
        });

        // Validate tags array
        expect(Array.isArray(ankiCard.ankiData.tags)).toBe(true);

        // Validate mediaFiles array
        expect(Array.isArray(ankiCard.ankiData.mediaFiles)).toBe(true);
      }
    });

    test('should show null ankiData for native cards', async () => {
      const mixedDeckId = 1; // Assume this deck has both native and Anki cards

      const response = await request(app)
        .get(`/api/decks/${mixedDeckId}/cards`)
        .query({ includeAnkiData: true })
        .expect(200);

      response.body.forEach(card => {
        expect(card).toHaveProperty('ankiData');

        // ankiData should be null for native cards, object for Anki cards
        expect(
          card.ankiData === null ||
          typeof card.ankiData === 'object'
        ).toBe(true);
      });
    });

    test('should validate Anki data structure when present', async () => {
      const ankiDeckId = 2;

      const response = await request(app)
        .get(`/api/decks/${ankiDeckId}/cards`)
        .query({ includeAnkiData: true })
        .expect(200);

      response.body.forEach(card => {
        if (card.ankiData) {
          expect(card.ankiData).toHaveProperty('noteId');
          expect(card.ankiData).toHaveProperty('model');
          expect(card.ankiData).toHaveProperty('originalFields');
          expect(card.ankiData).toHaveProperty('tags');
          expect(card.ankiData).toHaveProperty('mediaFiles');

          // Validate data types
          expect(typeof card.ankiData.noteId).toBe('string');
          expect(typeof card.ankiData.model).toBe('string');
          expect(typeof card.ankiData.originalFields).toBe('object');
          expect(Array.isArray(card.ankiData.tags)).toBe(true);
          expect(Array.isArray(card.ankiData.mediaFiles)).toBe(true);
        }
      });
    });
  });

  describe('Query parameter validation', () => {
    test('should handle includeAnkiData=false explicitly', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .query({ includeAnkiData: false })
        .expect(200);

      response.body.forEach(card => {
        expect(card).not.toHaveProperty('ankiData');
      });
    });

    test('should handle invalid includeAnkiData values gracefully', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .query({ includeAnkiData: 'invalid' })
        .expect(200);

      // Should default to false behavior
      if (response.body.length > 0) {
        expect(response.body[0]).not.toHaveProperty('ankiData');
      }
    });
  });

  describe('Error scenarios', () => {
    test('should return 404 for non-existent deck', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .get(`/api/decks/${nonExistentId}/cards`)
        .expect(404);
    });

    test('should return empty array for deck with no cards', async () => {
      const emptyDeckId = 3; // Assume this deck exists but has no cards

      const response = await request(app)
        .get(`/api/decks/${emptyDeckId}/cards`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('should handle invalid deck ID format', async () => {
      const invalidId = 'abc';

      const response = await request(app)
        .get(`/api/decks/${invalidId}/cards`)
        .expect(400);
    });
  });

  describe('Performance and pagination considerations', () => {
    test('should return reasonable number of cards', async () => {
      const deckId = 1;

      const response = await request(app)
        .get(`/api/decks/${deckId}/cards`)
        .expect(200);

      // If deck has many cards, might need pagination in future
      expect(Array.isArray(response.body)).toBe(true);
      // For now, just ensure it returns valid array
    });
  });
});