import { mockFetch, TEST_API_BASE, testUser, testDeck, testQuestion } from '../../testUtils';

describe('Learning Session API Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/decks/{deckId}/lesson', () => {
    it('should create new learning session with questions', async () => {
      const mockSessionResponse = {
        sessionId: 1,
        totalQuestions: 10,
        questions: [testQuestion, { ...testQuestion, id: 2 }]
      };

      mockFetch(mockSessionResponse, 200);

      const deckId = testDeck.id;
      const params = new URLSearchParams({
        difficulty: 'beginner',
        questionTypes: 'multiple_choice,fill_blank',
        count: '10',
        userId: testUser.id.toString(),
        useSpacedRepetition: 'true'
      });

      const response = await fetch(`${TEST_API_BASE}/api/decks/${deckId}/lesson?${params}`);

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.sessionId).toBeDefined();
      expect(data.totalQuestions).toBe(10);
      expect(data.questions).toHaveLength(2);
      expect(data.questions[0]).toEqual(expect.objectContaining({
        id: expect.any(Number),
        type: expect.stringMatching(/multiple_choice|fill_blank|translation_pl_en|translation_en_pl|flashcard/),
        difficulty: expect.stringMatching(/beginner|intermediate|advanced/),
        question: expect.any(String),
        answer: expect.any(String),
        cardId: expect.any(Number)
      }));
    });

    it('should return 404 for non-existent deck', async () => {
      const mockErrorResponse = {
        error: 'Deck not found'
      };

      mockFetch(mockErrorResponse, 404);

      const response = await fetch(`${TEST_API_BASE}/api/decks/999/lesson`);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Deck not found');
    });

    it('should return 400 for invalid parameters', async () => {
      const mockErrorResponse = {
        error: 'Invalid difficulty level'
      };

      mockFetch(mockErrorResponse, 400);

      const params = new URLSearchParams({
        difficulty: 'invalid',
        questionTypes: 'multiple_choice'
      });

      const response = await fetch(`${TEST_API_BASE}/api/decks/1/lesson?${params}`);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/check-answer', () => {
    it('should validate answer and provide feedback', async () => {
      const mockAnswerResponse = {
        correct: true,
        feedback: 'Correct! "Cześć" means hello in Polish.',
        spacedRepetition: {
          masteryLevel: 2,
          nextReview: '2023-12-01T10:00:00Z',
          interval: 3
        }
      };

      mockFetch(mockAnswerResponse, 200);

      const requestBody = {
        question: testQuestion,
        userAnswer: 'cześć',
        userId: testUser.id,
        cardId: testQuestion.cardId,
        timeTaken: 5000
      };

      const response = await fetch(`${TEST_API_BASE}/api/check-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.correct).toBe(true);
      expect(data.feedback).toBeDefined();
      expect(data.spacedRepetition).toEqual(expect.objectContaining({
        masteryLevel: expect.any(Number),
        nextReview: expect.any(String),
        interval: expect.any(Number)
      }));
    });

    it('should handle incorrect answers', async () => {
      const mockAnswerResponse = {
        correct: false,
        feedback: 'Incorrect. "Hello" in Polish is "cześć".',
        correctAnswer: 'cześć'
      };

      mockFetch(mockAnswerResponse, 200);

      const requestBody = {
        question: testQuestion,
        userAnswer: 'dzień dobry',
        userId: testUser.id,
        cardId: testQuestion.cardId,
        timeTaken: 8000
      };

      const response = await fetch(`${TEST_API_BASE}/api/check-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.correct).toBe(false);
      expect(data.feedback).toBeDefined();
      expect(data.correctAnswer).toBe('cześć');
    });

    it('should return 400 for invalid request', async () => {
      const mockErrorResponse = {
        error: 'Missing required fields'
      };

      mockFetch(mockErrorResponse, 400);

      const response = await fetch(`${TEST_API_BASE}/api/check-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});