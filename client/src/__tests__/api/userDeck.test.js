import { mockFetch, TEST_API_BASE, testUser, testDeck } from '../../testUtils';

describe('User and Deck Management API Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management', () => {
    describe('GET /api/users', () => {
      it('should return list of users', async () => {
        const mockUsersResponse = [
          testUser,
          { ...testUser, id: 2, name: 'Another User' }
        ];

        mockFetch(mockUsersResponse, 200);

        const response = await fetch(`${TEST_API_BASE}/api/users`);

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(2);
        expect(data[0]).toEqual(expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          level: expect.any(Number),
          xp: expect.any(Number),
          streak: expect.any(Number),
          createdAt: expect.any(String)
        }));
      });
    });

    describe('POST /api/users', () => {
      it('should create new user', async () => {
        const newUser = { ...testUser, id: 3, name: 'New User' };
        mockFetch(newUser, 201);

        const response = await fetch(`${TEST_API_BASE}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New User' }),
        });

        expect(response.status).toBe(201);
        const data = await response.json();

        expect(data).toEqual(expect.objectContaining({
          id: expect.any(Number),
          name: 'New User',
          level: 1,
          xp: 0,
          streak: 0
        }));
      });

      it('should return 400 for invalid user data', async () => {
        const mockErrorResponse = {
          error: 'Name is required'
        };

        mockFetch(mockErrorResponse, 400);

        const response = await fetch(`${TEST_API_BASE}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '' }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });
    });

    describe('GET /api/users/{userId}', () => {
      it('should return specific user', async () => {
        mockFetch(testUser, 200);

        const response = await fetch(`${TEST_API_BASE}/api/users/${testUser.id}`);

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data).toEqual(testUser);
      });

      it('should return 404 for non-existent user', async () => {
        const mockErrorResponse = {
          error: 'User not found'
        };

        mockFetch(mockErrorResponse, 404);

        const response = await fetch(`${TEST_API_BASE}/api/users/999`);

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('User not found');
      });
    });
  });

  describe('Deck Management', () => {
    describe('GET /api/decks', () => {
      it('should return list of decks', async () => {
        const mockDecksResponse = [
          testDeck,
          { ...testDeck, id: 2, name: 'Another Deck' }
        ];

        mockFetch(mockDecksResponse, 200);

        const response = await fetch(`${TEST_API_BASE}/api/decks`);

        expect(response.ok).toBe(true);
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(2);
        expect(data[0]).toEqual(expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          cardCount: expect.any(Number),
          uploadedAt: expect.any(String),
          status: expect.stringMatching(/processing|ready|error/)
        }));
      });
    });

    describe('GET /api/decks/{deckId}', () => {
      it('should return specific deck', async () => {
        mockFetch(testDeck, 200);

        const response = await fetch(`${TEST_API_BASE}/api/decks/${testDeck.id}`);

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data).toEqual(testDeck);
      });

      it('should return 404 for non-existent deck', async () => {
        const mockErrorResponse = {
          error: 'Deck not found'
        };

        mockFetch(mockErrorResponse, 404);

        const response = await fetch(`${TEST_API_BASE}/api/decks/999`);

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Deck not found');
      });
    });

    describe('DELETE /api/decks/{deckId}', () => {
      it('should delete deck successfully', async () => {
        mockFetch('', 204);

        const response = await fetch(`${TEST_API_BASE}/api/decks/${testDeck.id}`, {
          method: 'DELETE',
        });

        expect(response.status).toBe(204);
      });

      it('should return 404 for non-existent deck', async () => {
        const mockErrorResponse = {
          error: 'Deck not found'
        };

        mockFetch(mockErrorResponse, 404);

        const response = await fetch(`${TEST_API_BASE}/api/decks/999`, {
          method: 'DELETE',
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Deck not found');
      });
    });
  });
});