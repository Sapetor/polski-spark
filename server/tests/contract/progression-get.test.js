/**
 * T006: Contract test GET /api/users/{userId}/progression
 * Tests the API contract for retrieving user progression data
 */

const request = require('supertest');
const app = require('../../index'); // Adjust path as needed

describe('GET /api/users/:userId/progression', () => {
  const userId = 1;

  test('should return user progression data with correct schema', async () => {
    const response = await request(app)
      .get(`/api/users/${userId}/progression`)
      .expect('Content-Type', /json/)
      .expect(200);

    // Validate response schema
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('userId', userId);
    expect(response.body).toHaveProperty('level');
    expect(response.body).toHaveProperty('xp');
    expect(response.body).toHaveProperty('streak');
    expect(response.body).toHaveProperty('currentDifficulty');
    expect(response.body).toHaveProperty('totalSessions');
    expect(response.body).toHaveProperty('totalCorrectAnswers');
    expect(response.body).toHaveProperty('totalQuestionsAnswered');
    expect(response.body).toHaveProperty('lastSessionDate');
    expect(response.body).toHaveProperty('accuracy');
    expect(response.body).toHaveProperty('xpToNextLevel');
    expect(response.body).toHaveProperty('difficultyRange');

    // Validate data types and constraints
    expect(typeof response.body.level).toBe('number');
    expect(response.body.level).toBeGreaterThanOrEqual(1);
    expect(response.body.level).toBeLessThanOrEqual(50);

    expect(typeof response.body.xp).toBe('number');
    expect(response.body.xp).toBeGreaterThanOrEqual(0);

    expect(typeof response.body.streak).toBe('number');
    expect(response.body.streak).toBeGreaterThanOrEqual(0);

    expect(typeof response.body.currentDifficulty).toBe('number');
    expect(response.body.currentDifficulty).toBeGreaterThanOrEqual(0);
    expect(response.body.currentDifficulty).toBeLessThanOrEqual(100);

    expect(typeof response.body.accuracy).toBe('number');
    expect(response.body.accuracy).toBeGreaterThanOrEqual(0);
    expect(response.body.accuracy).toBeLessThanOrEqual(100);

    // Validate difficultyRange object
    expect(response.body.difficultyRange).toHaveProperty('min');
    expect(response.body.difficultyRange).toHaveProperty('max');
    expect(typeof response.body.difficultyRange.min).toBe('number');
    expect(typeof response.body.difficultyRange.max).toBe('number');
  });

  test('should return 404 for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await request(app)
      .get(`/api/users/${nonExistentUserId}/progression`)
      .expect(404);
  });

  test('should return 400 for invalid user ID', async () => {
    await request(app)
      .get('/api/users/invalid/progression')
      .expect(400);
  });
});