/**
 * T013: Integration test level advancement
 * Tests that level progression works correctly at XP thresholds
 */

const request = require('supertest');
const app = require('../../index');
const knex = require('knex')(require('../../knexfile'));

describe('Level Advancement', () => {
  let testUserId;

  beforeEach(async () => {
    // Create test user
    const [userId] = await knex('users').insert({
      name: 'Level Test User',
      email: `level-test-${Date.now()}@example.com`,
      created_at: new Date(),
      updated_at: new Date()
    });
    testUserId = userId;
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

  test('should advance from level 1 to level 2 at 100 XP threshold', async () => {
    // Set user just below level 2 threshold
    await knex('user_progression').insert({
      user_id: testUserId,
      level: 1,
      xp: 95, // 5 XP away from level 2
      streak: 0,
      current_difficulty: 20,
      total_sessions: 5,
      total_correct_answers: 35,
      total_questions_answered: 50,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Session that should push user over the threshold
    const sessionData = {
      questionsAnswered: 10,
      correctAnswers: 10, // Perfect score for max XP
      sessionDuration: 300,
      startingDifficulty: 25,
      averageCardDifficulty: 30
    };

    // This should earn ~12+ XP, crossing the 100 XP threshold
    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.levelUp).toBe(true);
    expect(response.body.newLevel).toBe(2);
    expect(response.body.newXp).toBeGreaterThanOrEqual(100);

    // Should have celebration data for level up
    expect(response.body.celebrationData).toBeDefined();
    expect(response.body.celebrationData.type).toBe('level_up');
    expect(response.body.celebrationData.message).toContain('Level 2');

    // Verify in database
    const progression = await knex('user_progression')
      .where('user_id', testUserId)
      .first();
    expect(progression.level).toBe(2);
    expect(progression.xp).toBeGreaterThanOrEqual(100);
    expect(progression.level_up_date).toBeTruthy();

    // Level 2 should have updated difficulty range (15-45)
    const getResponse = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);
    expect(getResponse.body.difficultyRange.min).toBe(15);
    expect(getResponse.body.difficultyRange.max).toBe(45);
  });

  test('should advance multiple levels in one session if enough XP earned', async () => {
    // Set user with very low XP
    await knex('user_progression').insert({
      user_id: testUserId,
      level: 1,
      xp: 50,
      streak: 0,
      current_difficulty: 80, // High difficulty for big XP gain
      total_sessions: 1,
      total_correct_answers: 10,
      total_questions_answered: 10,
      created_at: new Date(),
      updated_at: new Date()
    });

    // High difficulty perfect session for maximum XP
    const sessionData = {
      questionsAnswered: 20,
      correctAnswers: 20, // Perfect score
      sessionDuration: 600,
      startingDifficulty: 80,
      averageCardDifficulty: 85
    };

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.levelUp).toBe(true);

    // Should advance at least one level, possibly more based on XP earned
    expect(response.body.newLevel).toBeGreaterThan(1);
    expect(response.body.newXp).toBeGreaterThanOrEqual(100);

    // Verify level up celebration
    expect(response.body.celebrationData).toBeDefined();
    expect(response.body.celebrationData.type).toBe('level_up');
  });

  test('should not level up when just under threshold', async () => {
    // Set user just below level 2 threshold
    await knex('user_progression').insert({
      user_id: testUserId,
      level: 1,
      xp: 90,
      streak: 0,
      current_difficulty: 10, // Low difficulty for minimal XP
      total_sessions: 3,
      total_correct_answers: 20,
      total_questions_answered: 30,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Weak session that won't cross threshold
    const sessionData = {
      questionsAnswered: 5,
      correctAnswers: 3, // 60% accuracy
      sessionDuration: 180,
      startingDifficulty: 10,
      averageCardDifficulty: 15
    };

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.levelUp).toBe(false);
    expect(response.body.newLevel).toBe(1);
    expect(response.body.newXp).toBeLessThan(100);

    // No celebration data for non-level-up
    expect(response.body.celebrationData).toBeUndefined();
  });

  test('should update difficulty range after level advancement', async () => {
    // Set user at level 2 threshold - 1 XP
    await knex('user_progression').insert({
      user_id: testUserId,
      level: 2,
      xp: 199,
      streak: 0,
      current_difficulty: 30,
      total_sessions: 10,
      total_correct_answers: 70,
      total_questions_answered: 100,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Session to push to level 3
    const sessionData = {
      questionsAnswered: 10,
      correctAnswers: 9,
      sessionDuration: 300,
      startingDifficulty: 35,
      averageCardDifficulty: 40
    };

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    expect(response.body.levelUp).toBe(true);
    expect(response.body.newLevel).toBe(3);

    // Level 3 should have difficulty range 15-45
    const getResponse = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);
    expect(getResponse.body.level).toBe(3);
    expect(getResponse.body.difficultyRange.min).toBe(15);
    expect(getResponse.body.difficultyRange.max).toBe(45);
  });

  test('should track level up date correctly', async () => {
    const beforeLevelUp = new Date();

    await knex('user_progression').insert({
      user_id: testUserId,
      level: 1,
      xp: 95,
      streak: 0,
      current_difficulty: 30,
      total_sessions: 1,
      total_correct_answers: 8,
      total_questions_answered: 10,
      level_up_date: null, // No previous level up
      created_at: new Date(),
      updated_at: new Date()
    });

    const sessionData = {
      questionsAnswered: 8,
      correctAnswers: 8,
      sessionDuration: 240,
      startingDifficulty: 30
    };

    await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    const afterLevelUp = new Date();

    // Verify level up date was set
    const progression = await knex('user_progression')
      .where('user_id', testUserId)
      .first();

    expect(progression.level_up_date).toBeTruthy();
    const levelUpDate = new Date(progression.level_up_date);
    expect(levelUpDate.getTime()).toBeGreaterThanOrEqual(beforeLevelUp.getTime());
    expect(levelUpDate.getTime()).toBeLessThanOrEqual(afterLevelUp.getTime());
  });

  test('should handle level cap at level 50', async () => {
    // Set user at level 50 with high XP
    await knex('user_progression').insert({
      user_id: testUserId,
      level: 50,
      xp: 5000, // Way above normal thresholds
      streak: 100,
      current_difficulty: 100,
      total_sessions: 500,
      total_correct_answers: 4000,
      total_questions_answered: 5000,
      created_at: new Date(),
      updated_at: new Date()
    });

    const sessionData = {
      questionsAnswered: 10,
      correctAnswers: 10,
      sessionDuration: 300,
      startingDifficulty: 100
    };

    const response = await request(app)
      .post(`/api/users/${testUserId}/progression/update`)
      .send(sessionData)
      .expect(200);

    // Should not level up past 50
    expect(response.body.levelUp).toBe(false);
    expect(response.body.newLevel).toBe(50);

    // Should still earn XP
    expect(response.body.xpEarned).toBeGreaterThan(0);

    // XP to next level should be 0 (at max level)
    const getResponse = await request(app)
      .get(`/api/users/${testUserId}/progression`)
      .expect(200);
    expect(getResponse.body.xpToNextLevel).toBe(0);
  });
});