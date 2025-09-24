import React, { useState, useEffect, useRef } from 'react';
import AudioUtils from '../utils/audioUtils';

const PronunciationPractice = ({ currentUser }) => {
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [pronunciationResult, setPronunciationResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [audioSupport, setAudioSupport] = useState({});
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

  const audioUtils = useRef(new AudioUtils());

  useEffect(() => {
    initializePronunciationPractice();
    checkAudioSupport();

    return () => {
      audioUtils.current.cleanup();
    };
  }, []);

  const checkAudioSupport = () => {
    const support = audioUtils.current.checkSupport();
    setAudioSupport(support);

    if (!support.speechSynthesis) {
      console.warn('Speech synthesis not supported');
    }
    if (!support.speechRecognition) {
      console.warn('Speech recognition not supported');
    }
  };

  const initializePronunciationPractice = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${currentUser.id}/pronunciation-words`);
      if (response.ok) {
        const data = await response.json();
        setWords(data.words || []);
      } else {
        console.error('Failed to fetch pronunciation words');
      }
    } catch (error) {
      console.error('Error fetching pronunciation words:', error);
    }
    setIsLoading(false);
  };

  const currentWord = words[currentWordIndex];

  const handlePlayWord = async () => {
    if (!currentWord || !audioSupport.speechSynthesis) return;

    setIsPlaying(true);
    try {
      await audioUtils.current.speak(currentWord.polish, { rate: 0.7 });
    } catch (error) {
      console.error('Error playing word:', error);
    }
    setIsPlaying(false);
  };

  const handleStartRecording = async () => {
    if (!audioSupport.getUserMedia) {
      alert('Microphone access not supported in this browser');
      return;
    }

    setIsRecording(true);
    setPronunciationResult(null);
    setShowResult(false);

    try {
      const recordingPromise = await audioUtils.current.startRecording();
      setRecordedAudio(recordingPromise);
    } catch (error) {
      console.error('Error starting recording:', error);

      // Show user-friendly error message
      const errorMessage = error.message || 'Could not access microphone. Please check permissions.';
      alert(errorMessage);

      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);

    try {
      const audioData = await audioUtils.current.stopRecording();
      if (audioData) {
        setRecordedAudio(audioData);

        // Try speech recognition if available
        if (audioSupport.speechRecognition) {
          setTimeout(() => {
            handleSpeechRecognition();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleSpeechRecognition = async () => {
    if (!audioSupport.speechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    try {
      const result = await audioUtils.current.startRecognition();
      const comparison = audioUtils.current.comparePronunciation(
        result.transcript,
        currentWord.polish
      );

      setPronunciationResult({
        userSaid: result.transcript,
        confidence: result.confidence,
        ...comparison
      });

      setShowResult(true);

      // Update stats
      setSessionStats(prev => ({
        correct: prev.correct + (comparison.isCorrect ? 1 : 0),
        total: prev.total + 1
      }));

    } catch (error) {
      console.error('Speech recognition error:', error);
      setPronunciationResult({
        error: 'Could not process your pronunciation. Please try again.',
        feedback: { level: 'error', message: 'Speech recognition failed' }
      });
      setShowResult(true);
    }
  };

  const handlePlayRecording = async () => {
    if (!recordedAudio) return;

    try {
      await audioUtils.current.playAudio(recordedAudio.audioUrl);
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  };

  const handleNextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setRecordedAudio(null);
      setPronunciationResult(null);
      setShowResult(false);
    }
  };

  const handlePreviousWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
      setRecordedAudio(null);
      setPronunciationResult(null);
      setShowResult(false);
    }
  };

  const handleTryAgain = () => {
    setRecordedAudio(null);
    setPronunciationResult(null);
    setShowResult(false);
  };

  if (isLoading) {
    return (
      <div className="pronunciation-practice loading">
        <div className="loading-spinner"></div>
        <p>Loading pronunciation practice...</p>
      </div>
    );
  }

  if (!words || words.length === 0) {
    return (
      <div className="pronunciation-practice empty">
        <h2>No Words Available</h2>
        <p>Please study some vocabulary first to practice pronunciation.</p>
      </div>
    );
  }

  return (
    <div className="pronunciation-practice">
      <div className="pronunciation-header">
        <h2>🎤 Pronunciation Practice</h2>
        <div className="progress-info">
          <span>{currentWordIndex + 1} of {words.length}</span>
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

      {!audioSupport.speechRecognition && (
        <div className="audio-warning">
          ⚠️ Speech recognition not supported in this browser. Automatic assessment unavailable.
        </div>
      )}

      <div className="word-card">
        <div className="word-content">
          <div className="polish-word">
            <h3>{currentWord.polish}</h3>
            <button
              className="play-button"
              onClick={handlePlayWord}
              disabled={isPlaying || !audioSupport.speechSynthesis}
            >
              {isPlaying ? '🔊' : '🔉'} {isPlaying ? 'Playing...' : 'Listen'}
            </button>
          </div>

          <div className="word-details">
            <div className="english-translation">
              <strong>English:</strong> {currentWord.english}
            </div>

            {currentWord.pronunciation && (
              <div className="pronunciation-guide">
                <strong>Pronunciation:</strong> /{currentWord.pronunciation}/
              </div>
            )}

            {currentWord.notes && (
              <div className="pronunciation-notes">
                <strong>Notes:</strong> {currentWord.notes}
              </div>
            )}
          </div>
        </div>

        <div className="recording-section">
          <div className="recording-controls">
            {!isRecording ? (
              <button
                className="record-button start"
                onClick={handleStartRecording}
                disabled={!audioSupport.getUserMedia}
              >
                🎤 Start Recording
              </button>
            ) : (
              <button
                className="record-button stop"
                onClick={handleStopRecording}
              >
                ⏹️ Stop Recording
              </button>
            )}

            {recordedAudio && (
              <button
                className="play-recording-button"
                onClick={handlePlayRecording}
              >
                ▶️ Play My Recording
              </button>
            )}
          </div>

          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-pulse"></div>
              <span>Recording... Speak clearly!</span>
            </div>
          )}

          {showResult && pronunciationResult && (
            <div className={`pronunciation-result ${pronunciationResult.feedback?.level || 'error'}`}>
              {pronunciationResult.error ? (
                <div className="error-message">
                  <p>{pronunciationResult.error}</p>
                </div>
              ) : (
                <div className="result-content">
                  <div className="recognition-result">
                    <strong>You said:</strong> "{pronunciationResult.userSaid}"
                  </div>
                  <div className="accuracy-score">
                    <strong>Accuracy:</strong> {Math.round(pronunciationResult.similarity * 100)}%
                  </div>
                  <div className="feedback-message">
                    {pronunciationResult.feedback.message}
                  </div>
                </div>
              )}

              <button className="try-again-button" onClick={handleTryAgain}>
                🔄 Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="navigation-controls">
        <button
          className="nav-button prev"
          onClick={handlePreviousWord}
          disabled={currentWordIndex === 0}
        >
          ← Previous
        </button>

        <button
          className="nav-button next"
          onClick={handleNextWord}
          disabled={currentWordIndex >= words.length - 1}
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
    </div>
  );
};

export default PronunciationPractice;