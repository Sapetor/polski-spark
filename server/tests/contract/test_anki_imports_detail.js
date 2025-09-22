const request = require('supertest');
const express = require('express');

// T006: Contract test GET /api/anki-imports/{id}
describe('GET /api/anki-imports/{id} Contract Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual endpoint is implemented
    app = express();
    // Mock basic setup - real app will be imported later
  });

  describe('Valid import ID scenarios', () => {
    test('should return detailed import information for existing import', async () => {
      const importId = 1; // Will need to use actual ID from test data

      const response = await request(app)
        .get(`/api/anki-imports/${importId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: importId,
        filename: expect.any(String),
        importStats: {
          cardsImported: expect.any(Number),
          cardsSkipped: expect.any(Number),
          errors: expect.any(Array)
        },
        deckId: expect.any(Number)
      });
    });

    test('should include detailed error information for failed imports', async () => {
      const failedImportId = 999; // Will need to create failed import in test data

      const response = await request(app)
        .get(`/api/anki-imports/${failedImportId}`)
        .expect(200);

      if (response.body.importStats.errors.length > 0) {
        expect(response.body.importStats.errors).toEqual(
          expect.arrayContaining([expect.any(String)])
        );
      }
    });

    test('should include processing time and statistics', async () => {
      const importId = 1;

      const response = await request(app)
        .get(`/api/anki-imports/${importId}`)
        .expect(200);

      expect(response.body.importStats).toMatchObject({
        cardsImported: expect.any(Number),
        cardsSkipped: expect.any(Number),
        errors: expect.any(Array)
      });

      // Verify numbers make sense
      expect(response.body.importStats.cardsImported).toBeGreaterThanOrEqual(0);
      expect(response.body.importStats.cardsSkipped).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Invalid import ID scenarios', () => {
    test('should return 404 for non-existent import', async () => {
      const nonExistentId = 99999;

      const response = await request(app)
        .get(`/api/anki-imports/${nonExistentId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('not found')
      });
    });

    test('should return 400 for invalid import ID format', async () => {
      const invalidId = 'abc';

      const response = await request(app)
        .get(`/api/anki-imports/${invalidId}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.stringContaining('Invalid ID')
      });
    });

    test('should handle negative IDs', async () => {
      const negativeId = -1;

      const response = await request(app)
        .get(`/api/anki-imports/${negativeId}`)
        .expect(400);
    });
  });

  describe('Response structure validation', () => {
    test('should have consistent response structure', async () => {
      const importId = 1;

      const response = await request(app)
        .get(`/api/anki-imports/${importId}`);

      if (response.status === 200) {
        // Required fields
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('filename');
        expect(response.body).toHaveProperty('importStats');

        // ImportStats structure
        expect(response.body.importStats).toHaveProperty('cardsImported');
        expect(response.body.importStats).toHaveProperty('cardsSkipped');
        expect(response.body.importStats).toHaveProperty('errors');

        // Optional but expected field
        if (response.body.importStats.cardsImported > 0) {
          expect(response.body).toHaveProperty('deckId');
        }
      }
    });

    test('should include all import metadata', async () => {
      const importId = 1;

      const response = await request(app)
        .get(`/api/anki-imports/${importId}`)
        .expect(200);

      // Verify data types
      expect(typeof response.body.id).toBe('number');
      expect(typeof response.body.filename).toBe('string');
      expect(typeof response.body.importStats).toBe('object');
      expect(Array.isArray(response.body.importStats.errors)).toBe(true);
    });
  });
});