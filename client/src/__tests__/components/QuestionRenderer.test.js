import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, testQuestion } from '../../testUtils';
import QuestionRenderer from '../../components/QuestionRenderer';

describe('QuestionRenderer Component', () => {
  const mockProps = {
    question: testQuestion,
    userAnswer: '',
    setUserAnswer: jest.fn(),
    onSubmit: jest.fn(),
    showResult: false,
    result: null,
    onNext: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render question header with type and difficulty', () => {
    renderWithProviders(<QuestionRenderer {...mockProps} />);

    expect(screen.getByText('MULTIPLE CHOICE')).toBeInTheDocument();
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('should render multiple choice question type', () => {
    renderWithProviders(<QuestionRenderer {...mockProps} />);

    expect(screen.getByText(testQuestion.question)).toBeInTheDocument();
    testQuestion.options.forEach(option => {
      expect(screen.getByText(option)).toBeInTheDocument();
    });
  });

  it('should render fill blank question type', () => {
    const fillBlankQuestion = {
      ...testQuestion,
      type: 'fill_blank',
      hint: 'Think about greetings'
    };

    renderWithProviders(
      <QuestionRenderer {...mockProps} question={fillBlankQuestion} />
    );

    expect(screen.getByText('FILL BLANK')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
    expect(screen.getByText('💡 Think about greetings')).toBeInTheDocument();
  });

  it('should render translation question type', () => {
    const translationQuestion = {
      ...testQuestion,
      type: 'translation_pl_en',
      sourceText: 'Cześć',
      targetLanguage: 'English'
    };

    renderWithProviders(
      <QuestionRenderer {...mockProps} question={translationQuestion} />
    );

    expect(screen.getByText('TRANSLATION PL EN')).toBeInTheDocument();
    expect(screen.getByText('Cześć')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your English translation...')).toBeInTheDocument();
  });

  it('should render flashcard question type', () => {
    const flashcardQuestion = {
      ...testQuestion,
      type: 'flashcard'
    };

    renderWithProviders(
      <QuestionRenderer {...mockProps} question={flashcardQuestion} />
    );

    expect(screen.getByText('FLASHCARD')).toBeInTheDocument();
    expect(screen.getByText('Show Answer')).toBeInTheDocument();
  });

  it('should handle multiple choice selection', () => {
    renderWithProviders(<QuestionRenderer {...mockProps} />);

    const correctOption = screen.getByText('cześć');
    fireEvent.click(correctOption);

    expect(mockProps.onSubmit).toHaveBeenCalledWith('cześć');
  });

  it('should handle text input for fill blank', () => {
    const fillBlankQuestion = { ...testQuestion, type: 'fill_blank' };
    const propsWithAnswer = { ...mockProps, question: fillBlankQuestion, userAnswer: 'cześć' };

    renderWithProviders(<QuestionRenderer {...propsWithAnswer} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    expect(input.value).toBe('cześć');

    fireEvent.change(input, { target: { value: 'hello' } });
    expect(mockProps.setUserAnswer).toHaveBeenCalledWith('hello');
  });

  it('should submit on Enter key press', () => {
    const fillBlankQuestion = { ...testQuestion, type: 'fill_blank' };
    const propsWithAnswer = { ...mockProps, question: fillBlankQuestion, userAnswer: 'cześć' };

    renderWithProviders(<QuestionRenderer {...propsWithAnswer} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

    expect(mockProps.onSubmit).toHaveBeenCalled();
  });

  it('should disable submit when no answer provided', () => {
    const fillBlankQuestion = { ...testQuestion, type: 'fill_blank' };

    renderWithProviders(
      <QuestionRenderer {...mockProps} question={fillBlankQuestion} />
    );

    const submitButton = screen.getByText('Submit');
    expect(submitButton).toBeDisabled();
  });

  it('should show result feedback when available', () => {
    const resultProps = {
      ...mockProps,
      showResult: true,
      result: {
        correct: true,
        feedback: 'Excellent! That\'s correct.',
        spacedRepetition: {
          masteryLevel: 2,
          nextReview: '2023-12-01T10:00:00Z',
          interval: 3
        }
      }
    };

    renderWithProviders(<QuestionRenderer {...resultProps} />);

    expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
    expect(screen.getByText('Excellent! That\'s correct.')).toBeInTheDocument();
    expect(screen.getByText(/Mastery: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Next review:/)).toBeInTheDocument();
  });

  it('should show incorrect result feedback', () => {
    const resultProps = {
      ...mockProps,
      showResult: true,
      result: {
        correct: false,
        feedback: 'Not quite right. Try again!'
      }
    };

    renderWithProviders(<QuestionRenderer {...resultProps} />);

    expect(screen.getByText('❌ Incorrect')).toBeInTheDocument();
    expect(screen.getByText('Not quite right. Try again!')).toBeInTheDocument();
  });

  it('should call onNext when next button clicked', () => {
    const resultProps = {
      ...mockProps,
      showResult: true,
      result: { correct: true, feedback: 'Great!' }
    };

    renderWithProviders(<QuestionRenderer {...resultProps} />);

    const nextButton = screen.getByText('Next Question');
    fireEvent.click(nextButton);

    expect(mockProps.onNext).toHaveBeenCalled();
  });

  it('should disable input when result is shown', () => {
    const fillBlankQuestion = { ...testQuestion, type: 'fill_blank' };
    const resultProps = {
      ...mockProps,
      question: fillBlankQuestion,
      showResult: true,
      result: { correct: true, feedback: 'Correct!' }
    };

    renderWithProviders(<QuestionRenderer {...resultProps} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    expect(input).toBeDisabled();
  });
});