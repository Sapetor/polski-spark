/**
 * T010: Contract test GET /api/progression/levels
 * Tests the API contract for retrieving level progression information
 */

const request = require('supertest');
const app = require('../../index'); // Adjust path as needed

describe('GET /api/progression/levels', () => {
  test('should return level progression data', async () => {
    const response = await request(app)
      .get('/api/progression/levels')
      .expect('Content-Type', /json/)
      .expect(200);

    // Validate response schema
    expect(response.body).toHaveProperty('levels');
    expect(Array.isArray(response.body.levels)).toBe(true);
    expect(response.body.levels.length).toBeGreaterThan(0);

    // Validate each level entry
    response.body.levels.forEach((level, index) => {
      expect(level).toHaveProperty('level');
      expect(level).toHaveProperty('xpRequired');
      expect(level).toHaveProperty('difficultyRange');
      expect(level).toHaveProperty('title');
      expect(level).toHaveProperty('description');

      // Validate data types
      expect(typeof level.level).toBe('number');
      expect(typeof level.xpRequired).toBe('number');
      expect(typeof level.title).toBe('string');
      expect(typeof level.description).toBe('string');

      // Validate level progression
      expect(level.level).toBe(index + 1); // Levels should be sequential starting from 1
      expect(level.level).toBeGreaterThanOrEqual(1);
      expect(level.level).toBeLessThanOrEqual(50);

      // Validate XP requirements
      expect(level.xpRequired).toBe(level.level * 100); // Based on our formula
      expect(level.xpRequired).toBeGreaterThan(0);

      // Validate difficulty range
      expect(level.difficultyRange).toHaveProperty('min');
      expect(level.difficultyRange).toHaveProperty('max');
      expect(typeof level.difficultyRange.min).toBe('number');
      expect(typeof level.difficultyRange.max).toBe('number');
      expect(level.difficultyRange.min).toBeGreaterThanOrEqual(0);
      expect(level.difficultyRange.max).toBeLessThanOrEqual(100);
      expect(level.difficultyRange.min).toBeLessThanOrEqual(level.difficultyRange.max);

      // Validate title and description
      expect(level.title.length).toBeGreaterThan(0);
      expect(level.description.length).toBeGreaterThan(0);
      expect(level.description).toContain(level.level.toString());
    });
  });

  test('should have correct difficulty ranges for different level groups', async () => {
    const response = await request(app)
      .get('/api/progression/levels')
      .expect(200);

    const levels = response.body.levels;

    // Test level 1-2 difficulty range (0-25)
    const level1 = levels.find(l => l.level === 1);
    const level2 = levels.find(l => l.level === 2);
    if (level1) {
      expect(level1.difficultyRange.min).toBe(0);
      expect(level1.difficultyRange.max).toBe(25);
    }
    if (level2) {
      expect(level2.difficultyRange.min).toBe(0);
      expect(level2.difficultyRange.max).toBe(25);
    }

    // Test level 3-5 difficulty range (15-45)
    const level3 = levels.find(l => l.level === 3);
    const level5 = levels.find(l => l.level === 5);
    if (level3) {
      expect(level3.difficultyRange.min).toBe(15);
      expect(level3.difficultyRange.max).toBe(45);
    }
    if (level5) {
      expect(level5.difficultyRange.min).toBe(15);
      expect(level5.difficultyRange.max).toBe(45);
    }

    // Test level 6-10 difficulty range (35-65)
    const level6 = levels.find(l => l.level === 6);
    const level10 = levels.find(l => l.level === 10);
    if (level6) {
      expect(level6.difficultyRange.min).toBe(35);
      expect(level6.difficultyRange.max).toBe(65);
    }
    if (level10) {
      expect(level10.difficultyRange.min).toBe(35);
      expect(level10.difficultyRange.max).toBe(65);
    }

    // Test level 11+ difficulty range (55-100)
    const level11 = levels.find(l => l.level === 11);
    const level50 = levels.find(l => l.level === 50);
    if (level11) {
      expect(level11.difficultyRange.min).toBe(55);
      expect(level11.difficultyRange.max).toBe(100);
    }
    if (level50) {
      expect(level50.difficultyRange.min).toBe(55);
      expect(level50.difficultyRange.max).toBe(100);
    }
  });

  test('should have progressive XP requirements', async () => {
    const response = await request(app)
      .get('/api/progression/levels')
      .expect(200);

    const levels = response.body.levels;

    // Verify XP requirements are progressive
    for (let i = 1; i < levels.length; i++) {
      const prevLevel = levels[i - 1];
      const currentLevel = levels[i];
      expect(currentLevel.xpRequired).toBeGreaterThan(prevLevel.xpRequired);
      expect(currentLevel.xpRequired - prevLevel.xpRequired).toBe(100); // 100 XP difference per level
    }
  });

  test('should include milestone levels with appropriate titles', async () => {
    const response = await request(app)
      .get('/api/progression/levels')
      .expect(200);

    const levels = response.body.levels;

    // Check for specific milestone titles
    const level1 = levels.find(l => l.level === 1);
    const level10 = levels.find(l => l.level === 10);
    const level25 = levels.find(l => l.level === 25);
    const level50 = levels.find(l => l.level === 50);

    if (level1) {
      expect(level1.title).toContain('Beginner');
    }
    if (level10) {
      expect(['Student', 'Learner', 'Novice']).toContain(level10.title);
    }
    if (level25) {
      expect(['Skilled', 'Intermediate', 'Advanced']).toContain(level25.title);
    }
    if (level50) {
      expect(['Master', 'Grandmaster', 'Expert']).toContain(level50.title);
    }
  });

  test('should return consistent data on multiple requests', async () => {
    const response1 = await request(app).get('/api/progression/levels').expect(200);
    const response2 = await request(app).get('/api/progression/levels').expect(200);

    // Responses should be identical
    expect(response1.body).toEqual(response2.body);
    expect(response1.body.levels.length).toBe(response2.body.levels.length);
  });
});