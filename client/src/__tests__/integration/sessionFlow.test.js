import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockFetch, testUser, testDeck } from '../../testUtils';
import App from '../../App';

const mockLearningSession = {
  sessionId: 1,
  totalQuestions: 3,
  questions: [
    {
      id: 1,
      type: 'multiple_choice',
      difficulty: 'beginner',
      question: 'What is "hello" in Polish?',
      answer: 'cześć',
      options: ['cześć', 'dziękuję', 'proszę', 'tak'],
      cardId: 1
    },
    {
      id: 2,
      type: 'fill_blank',
      difficulty: 'beginner',
      question: 'Complete: "__ widzenia" (goodbye)',
      answer: 'do',
      hint: 'Think about leaving',
      cardId: 2
    },
    {
      id: 3,
      type: 'translation_pl_en',
      difficulty: 'intermediate',
      question: 'Translate to English:',
      sourceText: 'Miłego dnia',
      answer: 'have a nice day',
      targetLanguage: 'English',
      cardId: 3
    }
  ]
};

describe('Session Completion Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const setupToLearningSession = async () => {
    // Mock API responses to get to learning session
    mockFetch([testUser], 200); // GET /api/users

    renderWithProviders(<App />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Test User'));
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });

    mockFetch([testDeck], 200); // GET /api/decks
    mockFetch(mockLearningSession, 200); // GET /api/decks/1/lesson

    fireEvent.click(screen.getByText(/Start Learning/));

    await waitFor(() => {
      expect(screen.getByText('Learning Session')).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });
  };

  it('should complete full learning session with mixed results', async () => {
    await setupToLearningSession();

    // Question 1: Multiple choice - Correct answer
    expect(screen.getByText('What is "hello" in Polish?')).toBeInTheDocument();

    mockFetch({
      correct: true,
      feedback: 'Excellent! "Cześć" is the informal way to say hello.'
    }, 200);

    fireEvent.click(screen.getByText('cześć'));

    await waitFor(() => {
      expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
      expect(screen.getByText('Correct: 1/1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next Question'));

    // Question 2: Fill blank - Incorrect answer
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('Complete: "__ widzenia" (goodbye)')).toBeInTheDocument();
    });

    mockFetch({
      correct: false,
      feedback: 'Not quite. The answer is "do" - "do widzenia" means goodbye.',
      correctAnswer: 'do'
    }, 200);

    const fillInput = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(fillInput, { target: { value: 'na' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('❌ Incorrect')).toBeInTheDocument();
      expect(screen.getByText('Correct: 1/2')).toBeInTheDocument();
      expect(screen.getByText('Accuracy: 50%')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next Question'));

    // Question 3: Translation - Correct answer
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Miłego dnia')).toBeInTheDocument();
    });

    mockFetch({
      correct: true,
      feedback: 'Perfect! "Miłego dnia" means "have a nice day".'
    }, 200);

    const translationInput = screen.getByPlaceholderText('Enter your English translation...');
    fireEvent.change(translationInput, { target: { value: 'have a nice day' } });
    fireEvent.click(screen.getByText('Submit Translation'));

    await waitFor(() => {
      expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
      expect(screen.getByText('Correct: 2/3')).toBeInTheDocument();
    });

    // Complete session
    fireEvent.click(screen.getByText('Finish Lesson'));

    // Should show completion screen
    await waitFor(() => {
      expect(screen.getByText('🎉 Lesson Complete!')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Correct answers
      expect(screen.getByText('3')).toBeInTheDocument(); // Total questions
      expect(screen.getByText('67%')).toBeInTheDocument(); // Accuracy
    });

    // Should be able to return to dashboard
    fireEvent.click(screen.getByText('Back to Dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });
  });

  it('should handle perfect session completion', async () => {
    await setupToLearningSession();

    // Answer all questions correctly
    for (let i = 0; i < 3; i++) {
      mockFetch({
        correct: true,
        feedback: 'Correct!'
      }, 200);

      if (i === 0) {
        // Multiple choice
        fireEvent.click(screen.getByText('cześć'));
      } else if (i === 1) {
        // Fill blank
        const input = screen.getByPlaceholderText('Type your answer...');
        fireEvent.change(input, { target: { value: 'do' } });
        fireEvent.click(screen.getByText('Submit'));
      } else {
        // Translation
        const input = screen.getByPlaceholderText('Enter your English translation...');
        fireEvent.change(input, { target: { value: 'have a nice day' } });
        fireEvent.click(screen.getByText('Submit Translation'));
      }

      await waitFor(() => {
        expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
      });

      if (i < 2) {
        fireEvent.click(screen.getByText('Next Question'));
        await waitFor(() => {
          expect(screen.getByText(`Question ${i + 2} of 3`)).toBeInTheDocument();
        });
      } else {
        fireEvent.click(screen.getByText('Finish Lesson'));
      }
    }

    // Perfect completion
    await waitFor(() => {
      expect(screen.getByText('🎉 Lesson Complete!')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument(); // Perfect accuracy
    });
  });

  it('should handle session abandonment and recovery', async () => {
    await setupToLearningSession();

    // Start answering first question
    expect(screen.getByText('What is "hello" in Polish?')).toBeInTheDocument();

    // Navigate back to dashboard mid-session
    fireEvent.click(screen.getByText('← Back to Dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
    });

    // Try to start new session - should work
    mockFetch(mockLearningSession, 200);

    fireEvent.click(screen.getByText(/Start Learning/));

    await waitFor(() => {
      expect(screen.getByText('Learning Session')).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });
  });

  it('should handle API errors during session', async () => {
    await setupToLearningSession();

    // First question succeeds
    mockFetch({
      correct: true,
      feedback: 'Correct!'
    }, 200);

    fireEvent.click(screen.getByText('cześć'));

    await waitFor(() => {
      expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next Question'));

    // Second question - API error
    mockFetch({ error: 'Server error' }, 500);

    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    });

    const fillInput = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(fillInput, { target: { value: 'do' } });
    fireEvent.click(screen.getByText('Submit'));

    // Should handle error gracefully
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
      // Should still be able to interact with the form
      expect(fillInput).not.toBeDisabled();
    });
  });

  it('should maintain session statistics throughout completion', async () => {
    await setupToLearningSession();

    // Track statistics through each question
    expect(screen.getByText('Correct: 0/0')).toBeInTheDocument();

    // Question 1: Correct
    mockFetch({ correct: true, feedback: 'Correct!' }, 200);
    fireEvent.click(screen.getByText('cześć'));

    await waitFor(() => {
      expect(screen.getByText('Correct: 1/1')).toBeInTheDocument();
      expect(screen.getByText('Accuracy: 100%')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next Question'));

    // Question 2: Incorrect
    mockFetch({ correct: false, feedback: 'Wrong!' }, 200);
    const fillInput = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(fillInput, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Correct: 1/2')).toBeInTheDocument();
      expect(screen.getByText('Accuracy: 50%')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next Question'));

    // Question 3: Correct
    mockFetch({ correct: true, feedback: 'Correct!' }, 200);
    const translationInput = screen.getByPlaceholderText('Enter your English translation...');
    fireEvent.change(translationInput, { target: { value: 'have a nice day' } });
    fireEvent.click(screen.getByText('Submit Translation'));

    await waitFor(() => {
      expect(screen.getByText('Correct: 2/3')).toBeInTheDocument();
      expect(screen.getByText('Accuracy: 67%')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Finish Lesson'));

    // Final statistics on completion screen
    await waitFor(() => {
      expect(screen.getByText('67%')).toBeInTheDocument();
    });
  });
});