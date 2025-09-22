/**
 * T007: Contract test POST /api/users/{userId}/progression/update
 * Tests the API contract for updating user progression after session
 */

const request = require('supertest');
const app = require('../../index'); // Adjust path as needed

describe('POST /api/users/:userId/progression/update', () => {
  const userId = 1;

  const validSessionData = {
    questionsAnswered: 10,
    correctAnswers: 8,
    sessionDuration: 300,
    startingDifficulty: 25,
    averageCardDifficulty: 30.5
  };

  test('should update progression with valid session data', async () => {
    const response = await request(app)
      .post(`/api/users/${userId}/progression/update`)
      .send(validSessionData)
      .expect('Content-Type', /json/)
      .expect(200);

    // Validate response schema
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('xpEarned');
    expect(response.body).toHaveProperty('levelUp');
    expect(response.body).toHaveProperty('newLevel');
    expect(response.body).toHaveProperty('newXp');
    expect(response.body).toHaveProperty('streakUpdated');
    expect(response.body).toHaveProperty('newStreak');
    expect(response.body).toHaveProperty('difficultyAdjusted');
    expect(response.body).toHaveProperty('newDifficulty');

    // Validate data types
    expect(typeof response.body.xpEarned).toBe('number');
    expect(response.body.xpEarned).toBeGreaterThanOrEqual(0);

    expect(typeof response.body.levelUp).toBe('boolean');
    expect(typeof response.body.newLevel).toBe('number');
    expect(typeof response.body.newXp).toBe('number');
    expect(typeof response.body.streakUpdated).toBe('boolean');
    expect(typeof response.body.newStreak).toBe('number');
    expect(typeof response.body.difficultyAdjusted).toBe('boolean');
    expect(typeof response.body.newDifficulty).toBe('number');

    // Validate optional celebration data
    if (response.body.celebrationData) {
      expect(response.body.celebrationData).toHaveProperty('type');
      expect(response.body.celebrationData).toHaveProperty('message');
      expect(['level_up', 'streak_milestone', 'xp_milestone']).toContain(
        response.body.celebrationData.type
      );
    }
  });

  test('should return 400 for missing required fields', async () => {
    const invalidData = {
      questionsAnswered: 10,
      // Missing correctAnswers and sessionDuration
    };

    await request(app)
      .post(`/api/users/${userId}/progression/update`)
      .send(invalidData)
      .expect(400);
  });

  test('should return 400 for invalid field values', async () => {
    const invalidData = {
      questionsAnswered: 0, // Invalid: must be >= 1
      correctAnswers: 5,
      sessionDuration: 300
    };

    await request(app)
      .post(`/api/users/${userId}/progression/update`)
      .send(invalidData)
      .expect(400);
  });

  test('should return 400 for correct answers exceeding total questions', async () => {
    const invalidData = {
      questionsAnswered: 5,
      correctAnswers: 10, // Invalid: more correct than total
      sessionDuration: 300
    };

    await request(app)
      .post(`/api/users/${userId}/progression/update`)
      .send(invalidData)
      .expect(400);
  });

  test('should return 404 for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await request(app)
      .post(`/api/users/${nonExistentUserId}/progression/update`)
      .send(validSessionData)
      .expect(404);
  });

  test('should handle level up scenario', async () => {
    const sessionDataForLevelUp = {
      questionsAnswered: 10,
      correctAnswers: 10, // Perfect score
      sessionDuration: 300,
      startingDifficulty: 50, // High difficulty for more XP
      averageCardDifficulty: 60
    };

    const response = await request(app)
      .post(`/api/users/${userId}/progression/update`)
      .send(sessionDataForLevelUp)
      .expect(200);

    // Should indicate level up if user was close to threshold
    if (response.body.levelUp) {
      expect(response.body.celebrationData).toBeDefined();
      expect(response.body.celebrationData.type).toBe('level_up');
    }
  });
});