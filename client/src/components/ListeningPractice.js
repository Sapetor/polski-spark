import React, { useState, useEffect, useRef } from 'react';
import AudioUtils from '../utils/audioUtils';

const ListeningPractice = ({ currentUser, onBackToDashboard, onError }) => {
  const [exercises, setExercises] = useState([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [audioSupport, setAudioSupport] = useState({});
  const [playCount, setPlayCount] = useState(0);

  const audioUtils = useRef(new AudioUtils());

  useEffect(() => {
    initializeListeningPractice();
    checkAudioSupport();

    return () => {
      audioUtils.current.cleanup();
    };
  }, []);

  const checkAudioSupport = () => {
    const support = audioUtils.current.checkSupport();
    setAudioSupport(support);
  };

  const initializeListeningPractice = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${currentUser.id}/listening-exercises`);
      if (response.ok) {
        const data = await response.json();
        setExercises(data.exercises || []);
      } else {
        console.error('Failed to fetch listening exercises');
      }
    } catch (error) {
      console.error('Error fetching listening exercises:', error);
    }
    setIsLoading(false);
  };

  const currentExercise = exercises[currentExerciseIndex];

  const handlePlayAudio = async () => {
    if (!currentExercise || !audioSupport.speechSynthesis) return;

    setIsPlaying(true);
    try {
      await audioUtils.current.speak(currentExercise.polish, {
        rate: 0.8,
        pitch: 1.0
      });
      setPlayCount(prev => prev + 1);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
    setIsPlaying(false);
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    const normalizeText = (text) => {
      return text.toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizePolishCharacters = (text) => {
      if (!text || typeof text !== 'string') return text;

      // Character mapping: Polish diacritical → Latin equivalent
      const polishToLatin = {
        'ć': 'c', 'Ć': 'C',
        'ł': 'l', 'Ł': 'L',
        'ę': 'e', 'Ę': 'E',
        'ą': 'a', 'Ą': 'A',
        'ń': 'n', 'Ń': 'N',
        'ó': 'o', 'Ó': 'O',
        'ś': 's', 'Ś': 'S',
        'ź': 'z', 'Ź': 'Z',
        'ż': 'z', 'Ż': 'Z'
      };

      return text.replace(/[ćĆłŁęĘąĄńŃóÓśŚźŹżŻ]/g, char => polishToLatin[char] || char);
    };

    const normalizedAnswer = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(currentExercise.english);

    // Check translation answer with multiple possible answers support
    const checkTranslationAnswer = (userAnswer, correctAnswer) => {
      console.log('DEBUG: Checking answer:', userAnswer, 'against:', correctAnswer);

      // Exact match
      if (userAnswer === correctAnswer) {
        console.log('DEBUG: Exact match found');
        return true;
      }

      // Normalize Polish characters for comparison
      const userNormalized = normalizePolishCharacters(userAnswer);
      const correctNormalized = normalizePolishCharacters(correctAnswer);

      // Check after Polish normalization
      if (userNormalized === correctNormalized) {
        console.log('DEBUG: Polish normalization match found');
        return true;
      }

      // Split correct answer by delimiters to handle multiple possible translations
      const delimiters = /[;,/|]/;
      const possibleAnswers = correctAnswer.split(delimiters).map(answer => answer.trim());
      console.log('DEBUG: Possible answers:', possibleAnswers);

      // Check if user answer matches any possible answer
      for (const possibleAnswer of possibleAnswers) {
        const normalizedPossible = normalizeText(possibleAnswer);
        console.log('DEBUG: Checking against possible:', normalizedPossible);

        // Check exact match
        if (userAnswer === normalizedPossible) {
          console.log('DEBUG: Found match with possible answer:', possibleAnswer);
          return true;
        }

        // Check with Polish normalization
        const possibleNormalized = normalizePolishCharacters(normalizedPossible);
        if (userNormalized === possibleNormalized) {
          console.log('DEBUG: Found Polish normalized match with possible answer:', possibleAnswer);
          return true;
        }
      }

      console.log('DEBUG: No match found');
      return false;
    };

    const correct = checkTranslationAnswer(normalizedAnswer, normalizedCorrect);

    setIsCorrect(correct);
    setShowResult(true);

    // Update session stats
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setUserAnswer('');
      setShowResult(false);
      setIsCorrect(false);
      setPlayCount(0);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setUserAnswer('');
      setShowResult(false);
      setIsCorrect(false);
      setPlayCount(0);
    }
  };

  const handleTryAgain = () => {
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
  };

  if (isLoading) {
    return (
      <div className="listening-practice loading">
        <div className="loading-spinner"></div>
        <p>Loading listening practice...</p>
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="listening-practice empty">
        <h2>No Exercises Available</h2>
        <p>Please study some vocabulary first to practice listening comprehension.</p>
      </div>
    );
  }

  return (
    <div className="listening-practice">
      <div className="listening-header">
        <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
        <h2>👂 Listening Practice</h2>
        <div className="progress-info">
          <span>{currentExerciseIndex + 1} of {exercises.length}</span>
          <div className="session-stats">
            Accuracy: {sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {!audioSupport.speechSynthesis && (
        <div className="audio-warning">
          ⚠️ Speech synthesis not supported in this browser. Audio playback unavailable.
        </div>
      )}

      <div className="exercise-card">
        <div className="audio-section">
          <div className="instruction">
            <h3>🎧 Listen and type what you hear in English</h3>
            <p>Click the play button to hear the Polish phrase, then type the English translation.</p>
          </div>

          <div className="audio-controls">
            <button
              className="play-audio-button"
              onClick={handlePlayAudio}
              disabled={isPlaying || !audioSupport.speechSynthesis}
            >
              {isPlaying ? '🔊' : '▶️'} {isPlaying ? 'Playing...' : 'Play Audio'}
            </button>

            <div className="play-count">
              Played: {playCount} {playCount === 1 ? 'time' : 'times'}
            </div>
          </div>

          {currentExercise.difficulty && (
            <div className={`difficulty-badge ${currentExercise.difficulty}`}>
              {currentExercise.difficulty.charAt(0).toUpperCase() + currentExercise.difficulty.slice(1)}
            </div>
          )}
        </div>

        <div className="answer-section">
          <div className="answer-input">
            <label htmlFor="listening-answer">Your English translation:</label>
            <input
              id="listening-answer"
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
              placeholder="Type the English translation here..."
              disabled={showResult}
            />
          </div>

          <button
            className="submit-answer-button"
            onClick={handleSubmitAnswer}
            disabled={!userAnswer.trim() || showResult}
          >
            Submit Answer
          </button>
        </div>

        {showResult && (
          <div className={`result-section ${isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="result-header">
              <span className="result-icon">
                {isCorrect ? '✅' : '❌'}
              </span>
              <span className="result-text">
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>

            <div className="result-details">
              <div className="your-answer">
                <strong>Your answer:</strong> {userAnswer}
              </div>
              <div className="correct-answer">
                <strong>Correct answer:</strong> {currentExercise.english}
              </div>
              <div className="polish-text">
                <strong>Polish text:</strong> {currentExercise.polish}
              </div>

              {currentExercise.notes && (
                <div className="exercise-notes">
                  <strong>Notes:</strong> {currentExercise.notes}
                </div>
              )}
            </div>

            <div className="result-actions">
              <button className="play-again-button" onClick={handlePlayAudio}>
                🔊 Play Again
              </button>
              {!isCorrect && (
                <button className="try-again-button" onClick={handleTryAgain}>
                  🔄 Try Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="navigation-controls">
        <button
          className="nav-button prev"
          onClick={handlePreviousExercise}
          disabled={currentExerciseIndex === 0}
        >
          ← Previous
        </button>

        <button
          className="nav-button next"
          onClick={handleNextExercise}
          disabled={currentExerciseIndex >= exercises.length - 1}
        >
          Next →
        </button>
      </div>

      {sessionStats.total > 0 && (
        <div className="session-summary">
          <h4>Session Progress</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{sessionStats.correct}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{sessionStats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {Math.round((sessionStats.correct / sessionStats.total) * 100)}%
              </span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>
        </div>
      )}

      <div className="listening-tips">
        <h4>💡 Listening Tips</h4>
        <ul>
          <li>Listen carefully to pronunciation and intonation</li>
          <li>You can play the audio multiple times</li>
          <li>Focus on understanding the meaning, not just individual words</li>
          <li>Pay attention to Polish accent patterns</li>
        </ul>
      </div>
    </div>
  );
};

export default ListeningPractice;