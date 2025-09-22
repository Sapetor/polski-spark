import React, { useState, useEffect, useCallback, useMemo } from 'react';
import QuestionRenderer from './QuestionRenderer';

const LearningSession = React.memo(({
  currentLesson,
  currentQuestion,
  currentUser,
  sessionStats,
  userAnswer,
  setUserAnswer,
  showResult,
  lastResult,
  onAnswerSubmit,
  onNextQuestion,
  onBackToDashboard,
  onError
}) => {
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear errors when question changes
  useEffect(() => {
    setError(null);
  }, [currentQuestion]);

  // Pre-calculate optimized values (always called in same order)
  const progress = useMemo(() => {
    if (!currentLesson?.questions?.length) return 0;
    return ((currentQuestion + 1) / currentLesson.questions.length) * 100;
  }, [currentQuestion, currentLesson?.questions?.length]);

  const handleAnswerSubmit = useCallback(async (answer) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onAnswerSubmit(answer);
    } catch (submitError) {
      const errorMessage = submitError.message || 'Failed to submit answer. Please try again.';
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }

      console.error('Answer submission error:', submitError);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onAnswerSubmit, onError]);

  const handleNextQuestion = useCallback(() => {
    try {
      setError(null);
      onNextQuestion();
    } catch (nextError) {
      const errorMessage = 'Failed to load next question. Please try again.';
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }

      console.error('Next question error:', nextError);
    }
  }, [onNextQuestion, onError]);

  // Validate lesson data
  if (!currentLesson) {
    return (
      <div className="lesson-error">
        <h2>Session Error</h2>
        <p>No lesson data available. Please try starting a new lesson.</p>
        <button onClick={onBackToDashboard}>← Back to Dashboard</button>
      </div>
    );
  }

  if (!currentLesson.questions || !Array.isArray(currentLesson.questions) || currentLesson.questions.length === 0) {
    return (
      <div className="lesson-error">
        <h2>Session Error</h2>
        <p>No questions available for this lesson. The lesson may be corrupted.</p>
        <button onClick={onBackToDashboard}>← Back to Dashboard</button>
      </div>
    );
  }

  if (currentQuestion >= currentLesson.questions.length || currentQuestion < 0) {
    return (
      <div className="lesson-error">
        <h2>Session Error</h2>
        <p>Invalid question index. The session may have become corrupted.</p>
        <button onClick={onBackToDashboard}>← Back to Dashboard</button>
      </div>
    );
  }

  const question = currentLesson.questions[currentQuestion];

  // Validate current question
  if (!question) {
    return (
      <div className="lesson-error">
        <h2>Session Error</h2>
        <p>Current question is missing or corrupted. Please try restarting the lesson.</p>
        <button onClick={onBackToDashboard}>← Back to Dashboard</button>
      </div>
    );
  }


  return (
    <div className="lesson">
      <div className="lesson-header">
        <button onClick={onBackToDashboard}>← Back to Dashboard</button>
        <div className="lesson-info">
          <h2>Learning Session</h2>
          <p>Question {currentQuestion + 1} of {currentLesson.questions.length}</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>
        <div className="session-stats">
          <span>Correct: {sessionStats.correct}/{sessionStats.total}</span>
          {sessionStats.total > 0 && (
            <span>Accuracy: {Math.round((sessionStats.correct / sessionStats.total) * 100)}%</span>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '10px',
          borderRadius: '4px',
          margin: '10px 0',
          fontSize: '14px'
        }}>
          ❌ {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '10px',
              padding: '2px 6px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              border: '1px solid #dc2626',
              color: '#dc2626',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="question-content">
        <QuestionRenderer
          question={question}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          onSubmit={handleAnswerSubmit}
          showResult={showResult}
          result={lastResult}
          onNext={handleNextQuestion}
          currentQuestion={currentQuestion}
          totalQuestions={currentLesson.questions.length}
          disabled={isSubmitting}
        />
      </div>

    </div>
  );
});

LearningSession.displayName = 'LearningSession';

export default LearningSession;