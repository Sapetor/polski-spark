import React, { useState, useEffect } from 'react';

const StudyMode = ({
  currentLesson,
  currentUser,
  onBackToDashboard,
  onError,
  sessionStats,
  setSessionStats
}) => {
  const [currentPhase, setCurrentPhase] = useState('study'); // 'study' or 'practice'
  const [studyWords, setStudyWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [batchNumber, setBatchNumber] = useState(1);
  const [completedBatches, setCompletedBatches] = useState([]);

  const WORDS_PER_BATCH = 4;

  useEffect(() => {
    if (currentLesson?.questions) {
      initializeStudyMode();
    }
  }, [currentLesson]);

  const initializeStudyMode = () => {
    // Filter out inappropriate question types for study mode
    const vocabularyQuestions = currentLesson.questions.filter(question => {
      // Exclude fill-in-the-blank and other non-vocabulary questions
      const questionText = question.question || '';
      const isFillBlank = questionText.includes('Fill in the blank:') ||
                         questionText.includes('______') ||
                         question.type === 'fill_blank';

      // Only include questions that have clean front/back card data or simple vocabulary
      const hasCleanData = question.front && question.back;
      const isSimpleVocab = !isFillBlank && (hasCleanData ||
                           (question.question && question.correctAnswer &&
                            !questionText.includes('Complete') &&
                            !questionText.includes('Choose')));

      return isSimpleVocab;
    });

    if (vocabularyQuestions.length === 0) {
      console.warn('No suitable vocabulary questions found for study mode');
      // Fall back to using all questions but try to clean them
      const firstBatch = currentLesson.questions.slice(0, WORDS_PER_BATCH);
      setStudyWords(firstBatch);
    } else {
      // Take first batch of clean vocabulary questions
      const firstBatch = vocabularyQuestions.slice(0, WORDS_PER_BATCH);
      setStudyWords(firstBatch);
    }

    setCurrentWordIndex(0);
    setCurrentPhase('study');
    setShowDefinition(false);
  };

  const nextStudyWord = () => {
    if (currentWordIndex + 1 < studyWords.length) {
      setCurrentWordIndex(currentWordIndex + 1);
      setShowDefinition(false);
    } else {
      // Move to practice phase
      generatePracticeQuestions();
      setCurrentPhase('practice');
    }
  };

  const generatePracticeQuestions = () => {
    // Create simple questions from the study words
    const questions = studyWords.map((word, index) => ({
      ...word,
      id: `practice_${index}`,
      type: 'simple_choice',
      practiceQuestion: `What does "${word.front || word.question}" mean?`,
      options: generateOptions(word, studyWords)
    }));

    setPracticeQuestions(questions);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowResult(false);
  };

  const generateOptions = (correctWord, allWords) => {
    const correctAnswer = correctWord.back || correctWord.correctAnswer || correctWord.answer;
    const options = [correctAnswer];

    // Add incorrect answers from other words in current batch
    const otherWords = allWords.filter(w => (w.back || w.correctAnswer || w.answer) !== correctAnswer);

    // If not enough options from current batch, add some generic common options
    const commonOptions = [
      'yes', 'no', 'good', 'bad', 'big', 'small', 'new', 'old', 'nice', 'beautiful',
      'tak', 'nie', 'dobry', 'zły', 'duży', 'mały', 'nowy', 'stary', 'miły', 'piękny',
      'the', 'a', 'and', 'but', 'with', 'from', 'to', 'in', 'on', 'at',
      'I', 'you', 'he', 'she', 'we', 'they', 'this', 'that', 'here', 'there'
    ];

    // First try to get options from current batch
    while (options.length < 4 && otherWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherWords.length);
      const wrongAnswer = otherWords[randomIndex].back || otherWords[randomIndex].correctAnswer || otherWords[randomIndex].answer;
      if (!options.includes(wrongAnswer)) {
        options.push(wrongAnswer);
      }
      otherWords.splice(randomIndex, 1);
    }

    // If still not enough options, add some common distractors
    while (options.length < 4) {
      const randomCommon = commonOptions[Math.floor(Math.random() * commonOptions.length)];
      if (!options.includes(randomCommon) && randomCommon !== correctAnswer) {
        options.push(randomCommon);
      }
    }

    // Ensure we have at least 2 options (correct + 1 wrong)
    if (options.length < 2) {
      options.push('(other option)');
    }

    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  };

  const checkPracticeAnswer = (selectedAnswer) => {
    const currentQuestion = practiceQuestions[currentQuestionIndex];
    const correctAnswer = currentQuestion.back || currentQuestion.correctAnswer || currentQuestion.answer;
    const isCorrect = selectedAnswer === correctAnswer;

    setLastResult({
      correct: isCorrect,
      correctAnswer: correctAnswer,
      userAnswer: selectedAnswer,
      explanation: isCorrect ? 'Correct!' : `The correct answer is: ${correctAnswer}`
    });

    setShowResult(true);

    // Update stats
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
  };

  const nextPracticeQuestion = () => {
    if (currentQuestionIndex + 1 < practiceQuestions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      setShowResult(false);
      setLastResult(null);
    } else {
      // Practice batch complete
      finishBatch();
    }
  };

  const finishBatch = () => {
    const newCompletedBatches = [...completedBatches, ...studyWords];
    setCompletedBatches(newCompletedBatches);

    // Filter vocabulary questions same way as initialization
    const vocabularyQuestions = currentLesson.questions.filter(question => {
      const questionText = question.question || '';
      const isFillBlank = questionText.includes('Fill in the blank:') ||
                         questionText.includes('______') ||
                         question.type === 'fill_blank';

      const hasCleanData = question.front && question.back;
      const isSimpleVocab = !isFillBlank && (hasCleanData ||
                           (question.question && question.correctAnswer &&
                            !questionText.includes('Complete') &&
                            !questionText.includes('Choose')));

      return isSimpleVocab;
    });

    // Check if there are more vocabulary words to learn
    const totalProcessed = (batchNumber) * WORDS_PER_BATCH;
    const remainingQuestions = vocabularyQuestions.slice(totalProcessed);

    if (remainingQuestions.length > 0) {
      // If less than full batch remaining, take what's left but minimum 2 questions
      const nextBatchSize = Math.max(2, Math.min(WORDS_PER_BATCH, remainingQuestions.length));
      const nextBatch = remainingQuestions.slice(0, nextBatchSize);

      // If we only have 1 question left, it's not worth a new batch
      if (nextBatch.length === 1) {
        setCurrentPhase('complete');
        return;
      }

      setStudyWords(nextBatch);
      setBatchNumber(batchNumber + 1);
      setCurrentWordIndex(0);
      setCurrentPhase('study');
      setShowDefinition(false);
    } else {
      // All vocabulary words completed
      setCurrentPhase('complete');
    }
  };

  const renderStudyPhase = () => {
    const currentWord = studyWords[currentWordIndex];
    if (!currentWord) return null;

    return (
      <div className="study-phase">
        <div className="study-header">
          <h2>📚 Learning New Words</h2>
          <p>Batch {batchNumber} - Word {currentWordIndex + 1} of {studyWords.length}</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentWordIndex + 1) / studyWords.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="study-card">
          <div className="word-display">
            <h3 className="study-word">
              {currentWord.front || currentWord.question}
            </h3>
            {showDefinition && (
              <div className="definition">
                <h4>Meaning:</h4>
                <p className="study-answer">
                  {currentWord.back || currentWord.correctAnswer || currentWord.answer}
                </p>
              </div>
            )}
          </div>

          <div className="study-controls">
            {!showDefinition ? (
              <button
                onClick={() => setShowDefinition(true)}
                className="show-definition-btn"
              >
                Show Meaning
              </button>
            ) : (
              <div className="next-controls">
                <button
                  onClick={() => setShowDefinition(false)}
                  className="hide-definition-btn"
                >
                  Hide Meaning
                </button>
                <button
                  onClick={nextStudyWord}
                  className="next-word-btn"
                >
                  {currentWordIndex + 1 < studyWords.length ? 'Next Word' : 'Start Practice'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="study-tips">
          <p>💡 Take your time to memorize each word before moving on!</p>
        </div>
      </div>
    );
  };

  const renderPracticePhase = () => {
    const currentQuestion = practiceQuestions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
      <div className="practice-phase">
        <div className="practice-header">
          <h2>✏️ Practice Time</h2>
          <p>Question {currentQuestionIndex + 1} of {practiceQuestions.length}</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentQuestionIndex + 1) / practiceQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="practice-question">
          <h3>{currentQuestion.practiceQuestion}</h3>

          {!showResult && (
            <div className="practice-options">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => checkPracticeAnswer(option)}
                  className="practice-option"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {showResult && (
            <div className="practice-result">
              <div className={`result-indicator ${lastResult.correct ? 'correct' : 'incorrect'}`}>
                {lastResult.correct ? '✅ Correct!' : '❌ Incorrect'}
              </div>
              <p>{lastResult.explanation}</p>
              <button onClick={nextPracticeQuestion} className="next-practice-btn">
                {currentQuestionIndex + 1 < practiceQuestions.length ? 'Next Question' : 'Complete Batch'}
              </button>
            </div>
          )}
        </div>

        <div className="session-stats">
          <p>Score: {sessionStats.correct}/{sessionStats.total} ({sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%)</p>
        </div>
      </div>
    );
  };

  const renderCompletePhase = () => {
    const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

    return (
      <div className="study-complete">
        <h2>🎉 Study Session Complete!</h2>
        <div className="completion-stats">
          <div className="stat">
            <span className="stat-number">{completedBatches.length}</span>
            <span className="stat-label">Words Learned</span>
          </div>
          <div className="stat">
            <span className="stat-number">{sessionStats.correct}</span>
            <span className="stat-label">Correct Answers</span>
          </div>
          <div className="stat">
            <span className="stat-number">{accuracy}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>

        <div className="words-learned">
          <h3>Words You Learned Today:</h3>
          <div className="learned-words-grid">
            {completedBatches.map((word, index) => (
              <div key={index} className="learned-word">
                <strong>{word.front || word.question}</strong> → {word.back || word.correctAnswer || word.answer}
              </div>
            ))}
          </div>
        </div>

        <button onClick={onBackToDashboard} className="back-to-dashboard-btn">
          Back to Dashboard
        </button>
      </div>
    );
  };

  const renderCurrentPhase = () => {
    switch (currentPhase) {
      case 'study':
        return renderStudyPhase();
      case 'practice':
        return renderPracticePhase();
      case 'complete':
        return renderCompletePhase();
      default:
        return renderStudyPhase();
    }
  };

  return (
    <div className="study-mode">
      <div className="study-mode-header">
        <button onClick={onBackToDashboard} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>Study Mode</h1>
      </div>
      {renderCurrentPhase()}
    </div>
  );
};

export default StudyMode;