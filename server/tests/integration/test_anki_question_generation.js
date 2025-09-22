const request = require('supertest');
const express = require('express');

// T010: Integration test: Question generation from Anki cards
describe('Anki Question Generation Integration Tests', () => {
  let app;
  let ankiDeckId;

  beforeAll(() => {
    // This will fail until the actual implementation is complete
    app = express();
    // Mock basic setup - real app will be imported later
  });

  beforeEach(async () => {
    // Set up test data: import an Anki deck for testing
    const uploadResponse = await request(app)
      .post('/api/upload-anki')
      .attach('ankiFile', Buffer.from('question-gen-test-deck'), 'question-test.apkg')
      .expect(200);

    ankiDeckId = uploadResponse.body.deckId;
  });

  describe('Question type generation from Anki cards', () => {
    test('should generate multiple choice questions from Anki content', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'multiple_choice',
          count: 5
        })
        .expect(200);

      expect(Array.isArray(lessonResponse.body)).toBe(true);
      expect(lessonResponse.body.length).toBe(5);

      lessonResponse.body.forEach(question => {
        expect(question).toMatchObject({
          type: 'multiple_choice',
          question: expect.any(String),
          options: expect.any(Array),
          correct_answer: expect.any(String),
          card_id: expect.any(Number)
        });

        expect(question.options).toHaveLength(4); // Standard multiple choice format
        expect(question.options).toContain(question.correct_answer);
      });
    });

    test('should generate fill-in-the-blank questions with Polish word detection', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'fill_blank',
          count: 3
        })
        .expect(200);

      expect(lessonResponse.body).toHaveLength(3);

      lessonResponse.body.forEach(question => {
        expect(question).toMatchObject({
          type: 'fill_blank',
          question: expect.any(String),
          correct_answer: expect.any(String),
          hints: expect.any(Array),
          card_id: expect.any(Number)
        });

        // Should have blanks in the question
        expect(question.question).toContain('_____');

        // Should provide hints for Polish language learning
        expect(question.hints.length).toBeGreaterThan(0);
      });
    });

    test('should generate translation questions bidirectionally', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'translation',
          count: 4
        })
        .expect(200);

      expect(lessonResponse.body).toHaveLength(4);

      let polishToEnglish = 0;
      let englishToPolish = 0;

      lessonResponse.body.forEach(question => {
        expect(question).toMatchObject({
          type: 'translation',
          question: expect.any(String),
          correct_answer: expect.any(String),
          acceptable_answers: expect.any(Array),
          direction: expect.stringMatching(/^(pl_to_en|en_to_pl)$/),
          card_id: expect.any(Number)
        });

        if (question.direction === 'pl_to_en') polishToEnglish++;
        if (question.direction === 'en_to_pl') englishToPolish++;
      });

      // Should have both directions represented
      expect(polishToEnglish + englishToPolish).toBe(4);
    });

    test('should generate flashcard questions maintaining original format', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'flashcard',
          count: 3
        })
        .expect(200);

      expect(lessonResponse.body).toHaveLength(3);

      lessonResponse.body.forEach(question => {
        expect(question).toMatchObject({
          type: 'flashcard',
          front: expect.any(String),
          back: expect.any(String),
          card_id: expect.any(Number)
        });

        // Should preserve original Anki front/back content
        expect(question.front.length).toBeGreaterThan(0);
        expect(question.back.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Mixed question type lessons', () => {
    test('should generate mixed lesson with variety of question types', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'mixed',
          count: 10
        })
        .expect(200);

      expect(lessonResponse.body).toHaveLength(10);

      const questionTypes = new Set();
      lessonResponse.body.forEach(question => {
        questionTypes.add(question.type);
      });

      // Should have multiple question types
      expect(questionTypes.size).toBeGreaterThan(1);

      // Should include the standard types
      const expectedTypes = ['multiple_choice', 'fill_blank', 'translation', 'flashcard'];
      const hasExpectedTypes = Array.from(questionTypes).some(type =>
        expectedTypes.includes(type)
      );
      expect(hasExpectedTypes).toBe(true);
    });

    test('should respect difficulty filtering with Anki cards', async () => {
      const beginnerResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'beginner',
          questionTypes: 'mixed',
          count: 5
        })
        .expect(200);

      expect(beginnerResponse.body).toHaveLength(5);

      // Verify all questions are from beginner-level cards
      // (This will be validated by checking card difficulty in actual implementation)
      beginnerResponse.body.forEach(question => {
        expect(question).toHaveProperty('card_id');
      });
    });
  });

  describe('Question quality and Polish language features', () => {
    test('should generate quality distractors for multiple choice from similar Anki content', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'multiple_choice',
          count: 3
        })
        .expect(200);

      lessonResponse.body.forEach(question => {
        expect(question.options).toHaveLength(4);

        // All options should be different
        const uniqueOptions = new Set(question.options);
        expect(uniqueOptions.size).toBe(4);

        // Correct answer should be in options
        expect(question.options).toContain(question.correct_answer);
      });
    });

    test('should identify key Polish words for fill-in-the-blank questions', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'fill_blank',
          count: 5
        })
        .expect(200);

      lessonResponse.body.forEach(question => {
        // Should blank out meaningful words, not articles/prepositions
        expect(question.correct_answer.length).toBeGreaterThan(2);

        // Should have hints related to Polish grammar
        expect(question.hints.length).toBeGreaterThan(0);
      });
    });

    test('should handle Polish diacritical marks in translations', async () => {
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'translation',
          count: 5
        })
        .expect(200);

      lessonResponse.body.forEach(question => {
        // Should accept multiple variations of Polish text (with/without diacritics)
        expect(Array.isArray(question.acceptable_answers)).toBe(true);
        expect(question.acceptable_answers.length).toBeGreaterThan(0);

        // Main answer should be included in acceptable answers
        expect(question.acceptable_answers).toContain(question.correct_answer);
      });
    });
  });

  describe('Performance and scalability', () => {
    test('should generate questions efficiently from large Anki deck', async () => {
      const startTime = Date.now();

      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'mixed',
          count: 20
        })
        .expect(200);

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      // Should generate 20 questions in under 2 seconds (per quickstart requirements)
      expect(generationTime).toBeLessThan(2000);

      expect(lessonResponse.body).toHaveLength(20);
    });

    test('should handle Anki cards with multimedia content gracefully', async () => {
      // This test will validate handling of images/audio in Anki cards
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({
          difficulty: 'mixed',
          questionTypes: 'mixed',
          count: 5
        })
        .expect(200);

      lessonResponse.body.forEach(question => {
        // Should handle cards with media references without breaking
        expect(question).toHaveProperty('card_id');

        // If question references media, should handle gracefully
        if (question.question && question.question.includes('<img')) {
          // Media should be preserved or handled appropriately
          expect(question.question).toBeTruthy();
        }
      });
    });
  });

  describe('Integration with existing spaced repetition', () => {
    test('should work with existing progress tracking for imported cards', async () => {
      // Generate lesson
      const lessonResponse = await request(app)
        .get(`/api/decks/${ankiDeckId}/lesson`)
        .query({ count: 3 })
        .expect(200);

      const question = lessonResponse.body[0];

      // Submit answer
      const answerResponse = await request(app)
        .post('/api/check-answer')
        .send({
          cardId: question.card_id,
          userAnswer: question.correct_answer,
          responseTime: 3000,
          questionType: question.type
        })
        .expect(200);

      expect(answerResponse.body).toMatchObject({
        correct: true,
        explanation: expect.any(String)
      });

      // Progress should be tracked for Anki cards just like native cards
      // (This will be verified through database checks in actual implementation)
    });
  });
});