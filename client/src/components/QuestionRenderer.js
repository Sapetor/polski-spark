import React, { useCallback, useMemo } from 'react';
import MultipleChoiceQuestion from './questions/MultipleChoiceQuestion';
import FillBlankQuestion from './questions/FillBlankQuestion';
import TranslationQuestion from './questions/TranslationQuestion';
import FlashcardQuestion from './questions/FlashcardQuestion';
import WordOrderQuestion from './questions/WordOrderQuestion';
import PronunciationQuestion from './questions/PronunciationQuestion';

const QuestionRenderer = React.memo(({
  question,
  userAnswer,
  setUserAnswer,
  onSubmit,
  showResult,
  result,
  onNext,
  currentQuestion,
  totalQuestions,
  disabled
}) => {
  const handleSubmit = useCallback((answer) => {
    onSubmit(answer || userAnswer);
  }, [onSubmit, userAnswer]);

  const questionTypeDisplay = useMemo(() =>
    question.type.replace('_', ' ').toUpperCase(),
    [question.type]
  );

  const isLastQuestion = useMemo(() =>
    currentQuestion + 1 >= totalQuestions,
    [currentQuestion, totalQuestions]
  );

  const renderQuestionContent = useCallback(() => {
    switch (question.type) {
      case 'multiple_choice':
      case 'case_selection':
      case 'verb_conjugation':
        return (
          <MultipleChoiceQuestion
            question={question}
            onSelect={handleSubmit}
            disabled={showResult || disabled}
          />
        );

      case 'word_order':
        return (
          <WordOrderQuestion
            question={question}
            onSubmit={handleSubmit}
            disabled={showResult || disabled}
          />
        );

      case 'pronunciation':
        return (
          <PronunciationQuestion
            question={question}
            onSubmit={handleSubmit}
            disabled={showResult || disabled}
          />
        );

      case 'fill_blank':
        return (
          <FillBlankQuestion
            question={question}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            onSubmit={() => handleSubmit()}
            disabled={showResult || disabled}
          />
        );

      case 'translation_pl_en':
      case 'translation_en_pl':
        return (
          <TranslationQuestion
            question={question}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            onSubmit={() => handleSubmit()}
            disabled={showResult || disabled}
          />
        );

      case 'flashcard':
      default:
        return (
          <FlashcardQuestion
            question={question}
            onNext={onNext}
          />
        );
    }
  }, [question, userAnswer, setUserAnswer, handleSubmit, showResult, disabled, onNext]);

  return (
    <div className="question-renderer">
      <div className="question-header">
        <span className="question-type">{questionTypeDisplay}</span>
        {question.difficulty && <span className="difficulty">{question.difficulty}</span>}
      </div>

      {renderQuestionContent()}

      {showResult && result && (
        <div className={`result-feedback ${result.correct ? 'correct' : 'incorrect'}`}>
          <h3>{result.correct ? '✅ Correct!' : '❌ Incorrect'}</h3>
          <p>{result.feedback}</p>
          {result.spacedRepetition && (
            <div className="spaced-repetition-info">
              <small>
                📚 Mastery: {result.spacedRepetition.masteryLevel} |
                Next review: {new Date(result.spacedRepetition.nextReview).toLocaleDateString()}
                {result.spacedRepetition.interval > 1 && ` (${result.spacedRepetition.interval} days)`}
              </small>
            </div>
          )}
          <button onClick={onNext} className="next-question-btn">
            {isLastQuestion ? 'Finish Lesson' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  );
});

QuestionRenderer.displayName = 'QuestionRenderer';

export default QuestionRenderer;