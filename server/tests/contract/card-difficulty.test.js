/**
 * T009: Contract test GET /api/cards/{cardId}/difficulty
 * Tests the API contract for retrieving difficulty score for a specific card
 */

const request = require('supertest');
const app = require('../../index'); // Adjust path as needed

describe('GET /api/cards/:cardId/difficulty', () => {
  const cardId = 1;

  test('should return difficulty data for existing card', async () => {
    const response = await request(app)
      .get(`/api/cards/${cardId}/difficulty`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Validate response schema
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('cardId', cardId);
    expect(response.body).toHaveProperty('vocabularyScore');
    expect(response.body).toHaveProperty('grammarScore');
    expect(response.body).toHaveProperty('lengthScore');
    expect(response.body).toHaveProperty('typeScore');
    expect(response.body).toHaveProperty('totalDifficulty');
    expect(response.body).toHaveProperty('calculatedAt');

    // Validate data types
    expect(typeof response.body.id).toBe('number');
    expect(typeof response.body.cardId).toBe('number');
    expect(typeof response.body.vocabularyScore).toBe('number');
    expect(typeof response.body.grammarScore).toBe('number');
    expect(typeof response.body.lengthScore).toBe('number');
    expect(typeof response.body.typeScore).toBe('number');
    expect(typeof response.body.totalDifficulty).toBe('number');
    expect(typeof response.body.calculatedAt).toBe('string');

    // Validate score ranges
    expect(response.body.vocabularyScore).toBeGreaterThanOrEqual(0);
    expect(response.body.vocabularyScore).toBeLessThanOrEqual(30);

    expect(response.body.grammarScore).toBeGreaterThanOrEqual(0);
    expect(response.body.grammarScore).toBeLessThanOrEqual(40);

    expect(response.body.lengthScore).toBeGreaterThanOrEqual(0);
    expect(response.body.lengthScore).toBeLessThanOrEqual(20);

    expect(response.body.typeScore).toBeGreaterThanOrEqual(0);
    expect(response.body.typeScore).toBeLessThanOrEqual(10);

    expect(response.body.totalDifficulty).toBeGreaterThanOrEqual(0);
    expect(response.body.totalDifficulty).toBeLessThanOrEqual(100);

    // Validate that total equals sum of components
    const expectedTotal = response.body.vocabularyScore +
                         response.body.grammarScore +
                         response.body.lengthScore +
                         response.body.typeScore;
    expect(response.body.totalDifficulty).toBe(expectedTotal);

    // Validate timestamp format
    expect(new Date(response.body.calculatedAt).toString()).not.toBe('Invalid Date');
  });

  test('should return 404 for non-existent card', async () => {
    const nonExistentCardId = 99999;

    await request(app)
      .get(`/api/cards/${nonExistentCardId}/difficulty`)
      .expect(404);
  });

  test('should return 400 for invalid card ID', async () => {
    await request(app)
      .get('/api/cards/invalid/difficulty')
      .expect(400);
  });

  test('should return 404 for card without difficulty data', async () => {
    // This test assumes there might be cards without calculated difficulty
    const cardWithoutDifficulty = 99998;

    await request(app)
      .get(`/api/cards/${cardWithoutDifficulty}/difficulty`)
      .expect(404);
  });

  test('should handle card with minimum difficulty scores', async () => {
    // This test would need a card with known minimum difficulty
    const response = await request(app)
      .get(`/api/cards/${cardId}/difficulty`)
      .expect(200);

    // All scores should be non-negative
    expect(response.body.vocabularyScore).toBeGreaterThanOrEqual(0);
    expect(response.body.grammarScore).toBeGreaterThanOrEqual(0);
    expect(response.body.lengthScore).toBeGreaterThanOrEqual(0);
    expect(response.body.typeScore).toBeGreaterThanOrEqual(0);
    expect(response.body.totalDifficulty).toBeGreaterThanOrEqual(0);
  });

  test('should have consistent difficulty calculation', async () => {
    // Test multiple cards to ensure consistency
    const cardIds = [1, 2, 3]; // Assuming these cards exist

    for (const id of cardIds) {
      const response = await request(app)
        .get(`/api/cards/${id}/difficulty`)
        .expect(200);

      // Each card should have valid difficulty scores
      expect(response.body.totalDifficulty).toBeGreaterThanOrEqual(0);
      expect(response.body.totalDifficulty).toBeLessThanOrEqual(100);

      // Total should equal sum of components
      const calculatedTotal = response.body.vocabularyScore +
                             response.body.grammarScore +
                             response.body.lengthScore +
                             response.body.typeScore;
      expect(response.body.totalDifficulty).toBe(calculatedTotal);
    }
  });
});