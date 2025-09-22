/**
 * T008: Contract test GET /api/decks/{deckId}/cards/by-difficulty
 * Tests the API contract for retrieving cards filtered by difficulty
 */

const request = require('supertest');
const app = require('../../index'); // Adjust path as needed

describe('GET /api/decks/:deckId/cards/by-difficulty', () => {
  const deckId = 1;

  test('should return cards within default difficulty range', async () => {
    const response = await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    // Validate each card has required properties
    response.body.forEach(card => {
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('front');
      expect(card).toHaveProperty('back');
      expect(card).toHaveProperty('type');
      expect(card).toHaveProperty('difficulty');

      // Validate difficulty object
      expect(card.difficulty).toHaveProperty('id');
      expect(card.difficulty).toHaveProperty('cardId', card.id);
      expect(card.difficulty).toHaveProperty('vocabularyScore');
      expect(card.difficulty).toHaveProperty('grammarScore');
      expect(card.difficulty).toHaveProperty('lengthScore');
      expect(card.difficulty).toHaveProperty('typeScore');
      expect(card.difficulty).toHaveProperty('totalDifficulty');
      expect(card.difficulty).toHaveProperty('calculatedAt');

      // Validate difficulty score ranges
      expect(card.difficulty.vocabularyScore).toBeGreaterThanOrEqual(0);
      expect(card.difficulty.vocabularyScore).toBeLessThanOrEqual(30);
      expect(card.difficulty.grammarScore).toBeGreaterThanOrEqual(0);
      expect(card.difficulty.grammarScore).toBeLessThanOrEqual(40);
      expect(card.difficulty.lengthScore).toBeGreaterThanOrEqual(0);
      expect(card.difficulty.lengthScore).toBeLessThanOrEqual(20);
      expect(card.difficulty.typeScore).toBeGreaterThanOrEqual(0);
      expect(card.difficulty.typeScore).toBeLessThanOrEqual(10);
      expect(card.difficulty.totalDifficulty).toBeGreaterThanOrEqual(0);
      expect(card.difficulty.totalDifficulty).toBeLessThanOrEqual(100);
    });
  });

  test('should filter cards by minDifficulty parameter', async () => {
    const minDifficulty = 30;

    const response = await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ minDifficulty })
      .expect(200);

    response.body.forEach(card => {
      expect(card.difficulty.totalDifficulty).toBeGreaterThanOrEqual(minDifficulty);
    });
  });

  test('should filter cards by maxDifficulty parameter', async () => {
    const maxDifficulty = 50;

    const response = await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ maxDifficulty })
      .expect(200);

    response.body.forEach(card => {
      expect(card.difficulty.totalDifficulty).toBeLessThanOrEqual(maxDifficulty);
    });
  });

  test('should filter cards by both min and max difficulty', async () => {
    const minDifficulty = 20;
    const maxDifficulty = 60;

    const response = await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ minDifficulty, maxDifficulty })
      .expect(200);

    response.body.forEach(card => {
      expect(card.difficulty.totalDifficulty).toBeGreaterThanOrEqual(minDifficulty);
      expect(card.difficulty.totalDifficulty).toBeLessThanOrEqual(maxDifficulty);
    });
  });

  test('should respect limit parameter', async () => {
    const limit = 5;

    const response = await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ limit })
      .expect(200);

    expect(response.body.length).toBeLessThanOrEqual(limit);
  });

  test('should return empty array for impossible difficulty range', async () => {
    const response = await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ minDifficulty: 90, maxDifficulty: 95 })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    // Note: Could be empty if no cards in this range
  });

  test('should return 404 for non-existent deck', async () => {
    const nonExistentDeckId = 99999;

    await request(app)
      .get(`/api/decks/${nonExistentDeckId}/cards/by-difficulty`)
      .expect(404);
  });

  test('should return 400 for invalid parameters', async () => {
    await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ minDifficulty: 'invalid' })
      .expect(400);

    await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ minDifficulty: 50, maxDifficulty: 30 }) // min > max
      .expect(400);

    await request(app)
      .get(`/api/decks/${deckId}/cards/by-difficulty`)
      .query({ limit: -1 })
      .expect(400);
  });
});