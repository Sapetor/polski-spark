import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001';

const ReviewWords = ({ currentUser, onBackToDashboard, onError, onStartLesson }) => {
  const [reviewWords, setReviewWords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWords, setSelectedWords] = useState(new Set());

  useEffect(() => {
    fetchReviewWords();
  }, [currentUser?.id]);

  const fetchReviewWords = async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUser.id}/review-words`);
      if (response.ok) {
        const data = await response.json();
        setReviewWords(data);
        // Select all words by default
        setSelectedWords(new Set(data.words.map(word => word.cardId)));
      } else {
        const error = await response.json();
        if (response.status === 404) {
          setReviewWords({ words: [], totalWords: 0 });
        } else {
          onError('Failed to load review words: ' + error.error);
        }
      }
    } catch (error) {
      onError('Network error loading review words');
    } finally {
      setLoading(false);
    }
  };

  const toggleWordSelection = (cardId) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const selectAllWords = () => {
    setSelectedWords(new Set(reviewWords.words.map(word => word.cardId)));
  };

  const clearSelection = () => {
    setSelectedWords(new Set());
  };

  const startReviewLesson = async () => {
    if (selectedWords.size === 0) {
      onError('Please select at least one word to review');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUser.id}/review-lesson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionTypes: 'multiple_choice,fill_blank,translation_pl_en',
          count: Math.min(selectedWords.size, 15)
        }),
      });

      if (response.ok) {
        const lessonData = await response.json();
        onStartLesson(lessonData, 'review');
      } else {
        const error = await response.json();
        onError('Failed to start review lesson: ' + error.error);
      }
    } catch (error) {
      onError('Network error starting review lesson');
    }
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return '#10b981'; // green
    if (accuracy >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (loading) {
    return (
      <div className="review-words">
        <div className="review-header">
          <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
          <h2>📖 Review Yesterday's Words</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your vocabulary from yesterday...</p>
        </div>
      </div>
    );
  }

  if (!reviewWords || reviewWords.words.length === 0) {
    return (
      <div className="review-words">
        <div className="review-header">
          <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
          <h2>📖 Review Yesterday's Words</h2>
        </div>
        <div className="empty-review">
          <div className="empty-icon">📚</div>
          <h3>No words to review</h3>
          <p>You didn't practice any vocabulary yesterday. Start learning today to build your review collection!</p>
          <button onClick={onBackToDashboard} className="cta-button">
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-words">
      <div className="review-header">
        <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
        <h2>📖 Review Yesterday's Words</h2>
        <p className="review-subtitle">
          Found {reviewWords.totalWords} words from {reviewWords.reviewDate}
        </p>
      </div>

      <div className="review-controls">
        <div className="selection-info">
          <span>{selectedWords.size} of {reviewWords.words.length} words selected</span>
        </div>
        <div className="selection-actions">
          <button onClick={selectAllWords} className="select-all-btn">Select All</button>
          <button onClick={clearSelection} className="clear-selection-btn">Clear All</button>
        </div>
      </div>

      <div className="words-grid">
        {reviewWords.words.map(word => (
          <div
            key={word.cardId}
            className={`word-card ${selectedWords.has(word.cardId) ? 'selected' : ''}`}
            onClick={() => toggleWordSelection(word.cardId)}
          >
            <div className="word-content">
              <div className="word-front">{word.front}</div>
              <div className="word-back">{word.back}</div>
              <div className="word-meta">
                <span className="deck-name">{word.deckName}</span>
                <span className="difficulty-badge">{word.difficulty}</span>
              </div>
            </div>
            <div className="word-stats">
              <div className="stat">
                <span className="stat-label">Practice:</span>
                <span className="stat-value">{word.practiceCount}x</span>
              </div>
              <div className="stat">
                <span className="stat-label">Accuracy:</span>
                <span
                  className="stat-value accuracy"
                  style={{ color: getAccuracyColor(word.accuracy) }}
                >
                  {word.accuracy}%
                </span>
              </div>
            </div>
            <div className="selection-indicator">
              {selectedWords.has(word.cardId) ? '✓' : '○'}
            </div>
          </div>
        ))}
      </div>

      <div className="review-actions">
        <button
          onClick={startReviewLesson}
          className="start-review-btn"
          disabled={selectedWords.size === 0}
        >
          Start Review ({selectedWords.size} words)
        </button>
      </div>
    </div>
  );
};

export default ReviewWords;