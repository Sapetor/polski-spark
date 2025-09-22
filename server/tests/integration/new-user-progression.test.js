/**
 * T011: Integration test new user progression initialization
 * Tests that new users start with correct default progression values
 */

const request = require('supertest');
const app = require('../../index');
const knex = require('knex')(require('../../knexfile'));

describe('New User Progression Initialization', () => {
  let testUserId;

  beforeEach(async () => {
    // Create a test user
    const [userId] = await knex('users').insert({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      created_at: new Date(),
      updated_at: new Date()
    });
    testUserId = userId;
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await knex('user_progression').where('user_id', testUserId).del();
      await knex('users').where('id', testUserId).del();
    }
  });

  afterAll(async () => {
    await knex.destroy();
  });

  test('should initialize progression for new user with default values', async () => {
    // Verify user starts with no progression record
    const existingProgression = await knex('user_progression')
      .where('user_id', testUserId)
      .first();
    expect(existingProgression).toBeUndefined();

    // Request progression data should create initial record
    const response = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);

    // Verify default values
    expect(response.body.userId).toBe(testUserId);
    expect(response.body.level).toBe(1);
    expect(response.body.xp).toBe(0);
    expect(response.body.streak).toBe(0);
    expect(response.body.currentDifficulty).toBe(10);
    expect(response.body.totalSessions).toBe(0);
    expect(response.body.totalCorrectAnswers).toBe(0);
    expect(response.body.totalQuestionsAnswered).toBe(0);
    expect(response.body.accuracy).toBe(0);
    expect(response.body.xpToNextLevel).toBe(100);

    // Verify difficulty range for level 1
    expect(response.body.difficultyRange.min).toBe(0);
    expect(response.body.difficultyRange.max).toBe(25);

    // Verify progression record was created in database
    const progressionRecord = await knex('user_progression')
      .where('user_id', testUserId)
      .first();
    expect(progressionRecord).toBeDefined();
    expect(progressionRecord.level).toBe(1);
    expect(progressionRecord.xp).toBe(0);
    expect(progressionRecord.streak).toBe(0);
    expect(progressionRecord.current_difficulty).toBe(10);
  });

  test('should maintain progression data across multiple requests', async () => {
    // First request creates progression
    const response1 = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);

    // Second request should return same data
    const response2 = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);

    expect(response1.body).toEqual(response2.body);

    // Should only have one progression record
    const progressionRecords = await knex('user_progression')
      .where('user_id', testUserId);
    expect(progressionRecords.length).toBe(1);
  });

  test('should handle progression initialization for user with existing sessions', async () => {
    // Create some existing learning sessions for the user
    await knex('learning_sessions').insert([
      {
        user_id: testUserId,
        deck_id: 1,
        started_at: new Date(Date.now() - 86400000), // 1 day ago
        completed_at: new Date(Date.now() - 86400000 + 300000), // 5 minutes later
        total_questions: 10,
        correct_answers: 8
      },
      {
        user_id: testUserId,
        deck_id: 1,
        started_at: new Date(Date.now() - 43200000), // 12 hours ago
        completed_at: new Date(Date.now() - 43200000 + 600000), // 10 minutes later
        total_questions: 15,
        correct_answers: 12
      }
    ]);

    // Request progression - should initialize with defaults, not calculate from sessions
    const response = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);

    // Should still have default values (migration/calculation is separate process)
    expect(response.body.level).toBe(1);
    expect(response.body.xp).toBe(0);
    expect(response.body.streak).toBe(0);
    expect(response.body.totalSessions).toBe(0);

    // Clean up
    await knex('learning_sessions').where('user_id', testUserId).del();
  });

  test('should validate progression data constraints', async () => {
    const response = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);

    // All values should meet constraints
    expect(response.body.level).toBeGreaterThanOrEqual(1);
    expect(response.body.level).toBeLessThanOrEqual(50);
    expect(response.body.xp).toBeGreaterThanOrEqual(0);
    expect(response.body.streak).toBeGreaterThanOrEqual(0);
    expect(response.body.currentDifficulty).toBeGreaterThanOrEqual(0);
    expect(response.body.currentDifficulty).toBeLessThanOrEqual(100);
    expect(response.body.totalSessions).toBeGreaterThanOrEqual(0);
    expect(response.body.totalCorrectAnswers).toBeGreaterThanOrEqual(0);
    expect(response.body.totalQuestionsAnswered).toBeGreaterThanOrEqual(0);
    expect(response.body.totalCorrectAnswers).toBeLessThanOrEqual(response.body.totalQuestionsAnswered);
  });
});