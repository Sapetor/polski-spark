/**
 * T012: Integration test XP calculation and award
 * Tests that XP is correctly calculated and awarded after session completion
 */

const request = require('supertest');
const app = require('../../index');
const knex = require('knex')(require('../../knexfile'));
const { calculateSessionXP } = require('../../src/utils/progressionCalculator');

describe('XP Calculation and Award', () => {
  let testUserId;

  beforeEach(async () => {
    // Create test user with initial progression
    const [userId] = await knex('users').insert({
      name: 'XP Test User',
      email: `xp-test-${Date.now()}@example.com`,
      created_at: new Date(),
      updated_at: new Date()
    });
    testUserId = userId;

    // Initialize progression
    await knex('user_progression').insert({
      user_id: testUserId,
      level: 1,
      xp: 0,
      streak: 0,
      current_difficulty: 20,
      total_sessions: 0,
      total_correct_answers: 0,
      total_questions_answered: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  afterEach(async () => {
    if (testUserId) {
      await knex('progression_sessions').where('user_id', testUserId).del();
      await knex('user_progression').where('user_id', testUserId).del();
      await knex('users').where('id', testUserId).del();
    }
  });

  afterAll(async () => {
    await knex.destroy();
  });

  test('should calculate and award XP for perfect session (Case 2a)', async () => {
    const sessionData = {
      questionsAnswered: 10,
      correctAnswers: 10, // 100% accuracy
      sessionDuration: 300,
      startingDifficulty: 20,
      averageCardDifficulty: 25
    };

    // Expected XP: 50 * (20/50) * 1.0 = 20 XP
    const expectedXP = calculateSessionXP(10, 10, 20);
    expect(expectedXP).toBe(20);

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.xpEarned).toBe(expectedXP);
    expect(response.body.newXp).toBe(expectedXP);

    // Verify in database
    const progression = await knex('user_progression')
      .where('user_id', testUserId)
      .first();
    expect(progression.xp).toBe(expectedXP);
    expect(progression.total_sessions).toBe(1);
    expect(progression.total_correct_answers).toBe(10);
    expect(progression.total_questions_answered).toBe(10);

    // Verify session record
    const session = await knex('progression_sessions')
      .where('user_id', testUserId)
      .first();
    expect(session.xp_earned).toBe(expectedXP);
    expect(session.session_accuracy).toBe(100.00);
  });

  test('should calculate and award XP for average session (Case 2b)', async () => {
    const sessionData = {
      questionsAnswered: 10,
      correctAnswers: 7, // 70% accuracy
      sessionDuration: 300,
      startingDifficulty: 30,
      averageCardDifficulty: 35
    };

    // Expected XP: 50 * (30/50) * 0.7 = 21 XP
    const expectedXP = calculateSessionXP(7, 10, 30);
    expect(expectedXP).toBe(21);

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.xpEarned).toBe(expectedXP);
    expect(response.body.newXp).toBe(expectedXP);

    // Verify accuracy calculation
    const session = await knex('progression_sessions')
      .where('user_id', testUserId)
      .first();
    expect(session.session_accuracy).toBe(70.00);
  });

  test('should calculate and award XP for poor session (Case 2c)', async () => {
    const sessionData = {
      questionsAnswered: 10,
      correctAnswers: 4, // 40% accuracy
      sessionDuration: 300,
      startingDifficulty: 10,
      averageCardDifficulty: 15
    };

    // Expected XP: 50 * (10/50) * 0.4 = 4 XP
    const expectedXP = calculateSessionXP(4, 10, 10);
    expect(expectedXP).toBe(4);

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.xpEarned).toBe(expectedXP);
    expect(response.body.newXp).toBe(expectedXP);
  });

  test('should award minimum XP for participation', async () => {
    const sessionData = {
      questionsAnswered: 5,
      correctAnswers: 0, // 0% accuracy
      sessionDuration: 120,
      startingDifficulty: 5,
      averageCardDifficulty: 10
    };

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    // Should get at least 1 XP for participation
    expect(response.body.xpEarned).toBeGreaterThanOrEqual(1);
  });

  test('should accumulate XP across multiple sessions', async () => {
    // First session
    const session1Data = {
      questionsAnswered: 10,
      correctAnswers: 8,
      sessionDuration: 300,
      startingDifficulty: 20
    };

    const response1 = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(session1Data)
      .expect(200);

    const firstXP = response1.body.xpEarned;

    // Second session
    const session2Data = {
      questionsAnswered: 15,
      correctAnswers: 12,
      sessionDuration: 450,
      startingDifficulty: 25
    };

    const response2 = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(session2Data)
      .expect(200);

    const secondXP = response2.body.xpEarned;
    const totalXP = firstXP + secondXP;

    expect(response2.body.newXp).toBe(totalXP);

    // Verify in database
    const progression = await knex('user_progression')
      .where('user_id', testUserId)
      .first();
    expect(progression.xp).toBe(totalXP);
    expect(progression.total_sessions).toBe(2);

    // Verify both session records exist
    const sessions = await knex('progression_sessions')
      .where('user_id', testUserId)
      .orderBy('created_at');
    expect(sessions.length).toBe(2);
    expect(sessions[0].xp_earned).toBe(firstXP);
    expect(sessions[1].xp_earned).toBe(secondXP);
  });

  test('should handle high difficulty sessions with appropriate XP scaling', async () => {
    // Set user to high difficulty
    await knex('user_progression')
      .where('user_id', testUserId)
      .update({ current_difficulty: 80 });

    const sessionData = {
      questionsAnswered: 8,
      correctAnswers: 6, // 75% accuracy
      sessionDuration: 400,
      startingDifficulty: 80,
      averageCardDifficulty: 85
    };

    // Expected XP: 50 * (80/50) * 0.75 = 60 XP (high difficulty bonus)
    const expectedXP = calculateSessionXP(6, 8, 80);
    expect(expectedXP).toBe(60);

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.xpEarned).toBe(expectedXP);
  });
});