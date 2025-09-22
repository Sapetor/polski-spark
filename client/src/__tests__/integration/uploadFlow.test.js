import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockFetch, mockEventSource, testUser, testDeck } from '../../testUtils';
import App from '../../App';

// Mock file for testing
const createMockFile = (name = 'test.apkg') => {
  return new File(['test content'], name, { type: 'application/octet-stream' });
};

describe('Upload to Session Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should complete full upload-to-session workflow', async () => {
    // Mock API responses for the full flow
    mockFetch([testUser], 200); // GET /api/users

    renderWithProviders(<App />);

    // Step 1: Select user
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test User'));

    // Step 2: Should be on dashboard now
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });

    // Step 3: Upload a deck
    mockFetch([], 200); // GET /api/decks (initially empty)

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByLabelText(/choose file/i).querySelector('input[type="file"]');

    fireEvent.change(nameInput, { target: { value: 'Integration Test Deck' } });
    fireEvent.change(fileInput, { target: { files: [createMockFile('integration-test.apkg')] } });

    // Mock successful upload
    const mockUploadResponse = {
      id: 1,
      name: 'Integration Test Deck',
      cardCount: 15,
      status: 'ready'
    };

    mockFetch(mockUploadResponse, 200); // POST /upload-anki
    mockEventSource(); // Mock SSE for progress

    const uploadButton = screen.getByText('Upload Deck');
    fireEvent.click(uploadButton);

    // Step 4: Wait for upload completion and deck list refresh
    mockFetch([mockUploadResponse], 200); // GET /api/decks (now with uploaded deck)

    await waitFor(() => {
      expect(screen.getByText('Integration Test Deck')).toBeInTheDocument();
    });

    // Step 5: Start a learning session
    const mockSessionResponse = {
      sessionId: 1,
      totalQuestions: 5,
      questions: [
        {
          id: 1,
          type: 'multiple_choice',
          difficulty: 'beginner',
          question: 'What is "hello" in Polish?',
          answer: 'cześć',
          options: ['cześć', 'dziękuję', 'proszę', 'tak'],
          cardId: 1
        }
      ]
    };

    mockFetch(mockSessionResponse, 200); // GET /api/decks/1/lesson

    const startLearningButton = screen.getByText(/Start Learning/);
    fireEvent.click(startLearningButton);

    // Step 6: Verify learning session started
    await waitFor(() => {
      expect(screen.getByText('Learning Session')).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
      expect(screen.getByText('What is "hello" in Polish?')).toBeInTheDocument();
    });

    // Step 7: Answer a question
    const mockAnswerResponse = {
      correct: true,
      feedback: 'Correct! "Cześć" means hello in Polish.'
    };

    mockFetch(mockAnswerResponse, 200); // POST /api/check-answer

    fireEvent.click(screen.getByText('cześć'));

    await waitFor(() => {
      expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
      expect(screen.getByText('Correct! "Cześć" means hello in Polish.')).toBeInTheDocument();
    });

    // Verify session statistics updated
    expect(screen.getByText('Correct: 1/1')).toBeInTheDocument();
    expect(screen.getByText('Accuracy: 100%')).toBeInTheDocument();
  });

  it('should handle upload errors gracefully in the flow', async () => {
    // Mock user selection
    mockFetch([testUser], 200);

    renderWithProviders(<App />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Test User'));
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });

    // Mock failed upload
    const mockErrorResponse = {
      error: 'Invalid file format',
      code: 'INVALID_FILE'
    };

    mockFetch(mockErrorResponse, 400); // POST /upload-anki fails

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByLabelText(/choose file/i).querySelector('input[type="file"]');

    fireEvent.change(nameInput, { target: { value: 'Bad Deck' } });
    fireEvent.change(fileInput, { target: { files: [createMockFile('bad-file.txt')] } });

    fireEvent.click(screen.getByText('Upload Deck'));

    // Should handle error and allow retry
    await waitFor(() => {
      expect(screen.getByText('Upload Deck')).not.toBeDisabled();
    });

    // Form should still be available for retry
    expect(nameInput.value).toBe('Bad Deck');
  });

  it('should maintain user session through deck upload', async () => {
    // Set up user in localStorage to simulate returning user
    localStorage.setItem('currentUserId', testUser.id.toString());

    mockFetch([testUser], 200); // GET /api/users
    mockFetch(testUser, 200); // GET /api/users/1
    mockFetch([testDeck], 200); // GET /api/decks

    renderWithProviders(<App />);

    // Should automatically load user and go to dashboard
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
      expect(screen.getByText('Test Deck')).toBeInTheDocument();
    });

    // User should be able to start session immediately
    const mockSessionResponse = {
      sessionId: 1,
      totalQuestions: 3,
      questions: [
        {
          id: 1,
          type: 'flashcard',
          difficulty: 'beginner',
          question: 'Hello',
          answer: 'Cześć',
          cardId: 1
        }
      ]
    };

    mockFetch(mockSessionResponse, 200);

    fireEvent.click(screen.getByText(/Start Learning/));

    await waitFor(() => {
      expect(screen.getByText('Learning Session')).toBeInTheDocument();
    });
  });

  it('should handle session creation failure after successful upload', async () => {
    mockFetch([testUser], 200);

    renderWithProviders(<App />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Test User'));
    });

    // Upload deck successfully
    const mockUploadResponse = { ...testDeck, id: 2, name: 'Test Deck 2' };
    mockFetch(mockUploadResponse, 200);
    mockEventSource();

    const nameInput = screen.getByPlaceholderText('Deck Name');
    const fileInput = screen.getByLabelText(/choose file/i).querySelector('input[type="file"]');

    fireEvent.change(nameInput, { target: { value: 'Test Deck 2' } });
    fireEvent.change(fileInput, { target: { files: [createMockFile()] } });

    fireEvent.click(screen.getByText('Upload Deck'));

    await waitFor(() => {
      mockFetch([mockUploadResponse], 200); // Deck list refresh
    });

    // Try to start session but it fails
    mockFetch({ error: 'Failed to generate questions' }, 500);

    const startButton = screen.getByText(/Start Learning/);
    fireEvent.click(startButton);

    // Should remain on dashboard and show error
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });
  });
});