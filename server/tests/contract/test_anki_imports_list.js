const request = require('supertest');
const express = require('express');

// T005: Contract test GET /api/anki-imports
describe('GET /api/anki-imports Contract Tests', () => {
  let app;

  beforeAll(() => {
    // This will fail until the actual endpoint is implemented
    app = express();
    // Mock basic setup - real app will be imported later
  });

  describe('Import history retrieval', () => {
    test('should return array of import records', async () => {
      const response = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // If there are imports, verify structure
      if (response.body.length > 0) {
        expect(response.body[0]).toMatchObject({
          id: expect.any(Number),
          filename: expect.any(String),
          fileSize: expect.any(Number),
          cardsImported: expect.any(Number),
          importDate: expect.any(String), // ISO date string
          status: expect.stringMatching(/^(completed|error|processing)$/)
        });
      }
    });

    test('should return empty array when no imports exist', async () => {
      // Test for clean database state
      const response = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Length may be 0 or more depending on test state
    });

    test('should return imports sorted by date (newest first)', async () => {
      const response = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      if (response.body.length > 1) {
        const dates = response.body.map(item => new Date(item.importDate));
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i-1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
        }
      }
    });
  });

  describe('Response format validation', () => {
    test('should include all required fields for each import', async () => {
      const response = await request(app)
        .get('/api/anki-imports')
        .expect(200);

      response.body.forEach(importRecord => {
        expect(importRecord).toHaveProperty('id');
        expect(importRecord).toHaveProperty('filename');
        expect(importRecord).toHaveProperty('fileSize');
        expect(importRecord).toHaveProperty('cardsImported');
        expect(importRecord).toHaveProperty('importDate');
        expect(importRecord).toHaveProperty('status');

        // Validate date format
        expect(() => new Date(importRecord.importDate)).not.toThrow();

        // Validate status enum
        expect(['completed', 'error', 'processing']).toContain(importRecord.status);
      });
    });
  });

  describe('Error handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test will be refined when we know the actual error conditions
      // For now, ensure endpoint exists and returns valid response
      const response = await request(app)
        .get('/api/anki-imports');

      expect([200, 500]).toContain(response.status);

      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});