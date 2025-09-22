import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, testUser, testQuestion } from '../../testUtils';
import LearningSession from '../../components/LearningSession';

const mockSession = {
  sessionId: 1,
  totalQuestions: 5,
  questions: [
    testQuestion,
    { ...testQuestion, id: 2, question: 'What is "goodbye" in Polish?', answer: 'do widzenia' }
  ]
};

describe('LearningSession Component', () => {
  const mockProps = {
    currentLesson: mockSession,
    currentQuestion: 0,
    currentUser: testUser,
    sessionStats: { correct: 0, total: 0 },
    userAnswer: '',
    showResult: false,
    lastResult: null,
    onAnswerSubmit: jest.fn(),
    onNextQuestion: jest.fn(),
    onBackToDashboard: jest.fn(),
    setUserAnswer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render session header with progress', () => {
    renderWithProviders(<LearningSession {...mockProps} />);

    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Learning Session')).toBeInTheDocument();
    expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
  });

  it('should display current question', () => {
    renderWithProviders(<LearningSession {...mockProps} />);

    expect(screen.getByText(testQuestion.question)).toBeInTheDocument();
  });

  it('should show progress bar with correct percentage', () => {
    renderWithProviders(<LearningSession {...mockProps} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 20%'); // 1 of 5 = 20%
  });

  it('should display session statistics', () => {
    const propsWithStats = {
      ...mockProps,
      sessionStats: { correct: 3, total: 4 }
    };

    renderWithProviders(<LearningSession {...propsWithStats} />);

    expect(screen.getByText('Correct: 3/4')).toBeInTheDocument();
    expect(screen.getByText('Accuracy: 75%')).toBeInTheDocument();
  });

  it('should call onBackToDashboard when back button clicked', () => {
    renderWithProviders(<LearningSession {...mockProps} />);

    fireEvent.click(screen.getByText('← Back to Dashboard'));
    expect(mockProps.onBackToDashboard).toHaveBeenCalled();
  });

  it('should render question renderer component', () => {
    renderWithProviders(<LearningSession {...mockProps} />);

    // The QuestionRenderer should be rendered (we'll test it separately)
    expect(screen.getByText(testQuestion.question)).toBeInTheDocument();
  });

  it('should handle empty lesson gracefully', () => {
    const emptyProps = {
      ...mockProps,
      currentLesson: null
    };

    renderWithProviders(<LearningSession {...emptyProps} />);

    expect(screen.getByText('No questions available for this lesson.')).toBeInTheDocument();
  });

  it('should handle lesson with no questions', () => {
    const noQuestionsProps = {
      ...mockProps,
      currentLesson: { ...mockSession, questions: [] }
    };

    renderWithProviders(<LearningSession {...noQuestionsProps} />);

    expect(screen.getByText('No questions available for this lesson.')).toBeInTheDocument();
  });

  it('should update progress bar as questions advance', () => {
    const advancedProps = {
      ...mockProps,
      currentQuestion: 2 // Question 3 of 5
    };

    renderWithProviders(<LearningSession {...advancedProps} />);

    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 60%'); // 3 of 5 = 60%
  });

  it('should show completion when on last question', () => {
    const lastQuestionProps = {
      ...mockProps,
      currentQuestion: 4, // Last question (index 4 of 5 total)
      showResult: true,
      lastResult: { correct: true, feedback: 'Great job!' }
    };

    renderWithProviders(<LearningSession {...lastQuestionProps} />);

    expect(screen.getByText('Question 5 of 5')).toBeInTheDocument();
  });
});