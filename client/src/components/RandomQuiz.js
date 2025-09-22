import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001';

const RandomQuiz = ({ currentUser, onBackToDashboard, onError, onStartLesson }) => {
  const [quizSettings, setQuizSettings] = useState({
    questionTypes: ['multiple_choice', 'fill_blank', 'translation_pl_en'],
    count: 15,
    difficulty: 'all'
  });
  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [learningStats, setLearningStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const questionTypeOptions = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'fill_blank', label: 'Fill in the Blank' },
    { value: 'translation_pl_en', label: 'Polish → English' },
    { value: 'translation_en_pl', label: 'English → Polish' },
    { value: 'flashcard', label: 'Flashcards' }
  ];

  const difficultyOptions = [
    { value: 'all', label: 'All Difficulties' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    fetchLearningData();
  }, [currentUser?.id]);

  const fetchLearningData = async () => {
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      // Fetch user stats to see what they've learned
      const statsResponse = await fetch(`${API_BASE}/api/users/${currentUser.id}/stats`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setLearningStats(stats);
      }

      // Fetch available decks
      const decksResponse = await fetch(`${API_BASE}/api/decks`);
      if (decksResponse.ok) {
        const decks = await decksResponse.json();
        setAvailableDecks(decks);
        // Select all decks by default
        setSelectedDecks(new Set(decks.map(deck => deck.id)));
      }
    } catch (error) {
      onError('Failed to load learning data');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionType = (type) => {
    setQuizSettings(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const toggleDeckSelection = (deckId) => {
    setSelectedDecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) {
        newSet.delete(deckId);
      } else {
        newSet.add(deckId);
      }
      return newSet;
    });
  };

  const selectAllDecks = () => {
    setSelectedDecks(new Set(availableDecks.map(deck => deck.id)));
  };

  const clearDeckSelection = () => {
    setSelectedDecks(new Set());
  };

  const generateRandomQuiz = async () => {
    if (quizSettings.questionTypes.length === 0) {
      onError('Please select at least one question type');
      return;
    }

    if (selectedDecks.size === 0) {
      onError('Please select at least one deck');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUser.id}/random-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionTypes: quizSettings.questionTypes.join(','),
          count: quizSettings.count,
          difficulty: quizSettings.difficulty,
          deckIds: Array.from(selectedDecks)
        }),
      });

      if (response.ok) {
        const quizData = await response.json();
        onStartLesson(quizData, 'quiz');
      } else {
        const error = await response.json();
        onError('Failed to generate quiz: ' + error.error);
      }
    } catch (error) {
      onError('Network error generating quiz');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="random-quiz">
        <div className="quiz-header">
          <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
          <h2>🎲 Random Quiz</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your learning data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="random-quiz">
      <div className="quiz-header">
        <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
        <h2>🎲 Random Quiz</h2>
        <p className="quiz-subtitle">
          Test your knowledge with words from your learning history
        </p>
      </div>

      {learningStats && learningStats.totalCardsStudied === 0 ? (
        <div className="empty-quiz">
          <div className="empty-icon">📚</div>
          <h3>No learned words yet</h3>
          <p>Complete some lessons first to build your vocabulary, then come back for a quiz!</p>
          <button onClick={onBackToDashboard} className="cta-button">
            Start Learning
          </button>
        </div>
      ) : (
        <div className="quiz-config">
          <div className="config-section">
            <h3>Quiz Settings</h3>

            <div className="setting-group">
              <label>Number of Questions:</label>
              <select
                value={quizSettings.count}
                onChange={(e) => setQuizSettings(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                className="setting-select"
              >
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={25}>25 Questions</option>
                <option value={30}>30 Questions</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Difficulty Level:</label>
              <select
                value={quizSettings.difficulty}
                onChange={(e) => setQuizSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                className="setting-select"
              >
                {difficultyOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label>Question Types:</label>
              <div className="question-type-checkboxes">
                {questionTypeOptions.map(option => (
                  <label key={option.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={quizSettings.questionTypes.includes(option.value)}
                      onChange={() => toggleQuestionType(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3>Select Decks</h3>
            <div className="deck-selection-controls">
              <button onClick={selectAllDecks} className="deck-control-btn">Select All</button>
              <button onClick={clearDeckSelection} className="deck-control-btn">Clear All</button>
              <span className="selection-count">{selectedDecks.size} of {availableDecks.length} selected</span>
            </div>

            <div className="deck-selection-grid">
              {availableDecks.map(deck => (
                <div
                  key={deck.id}
                  className={`deck-selection-card ${selectedDecks.has(deck.id) ? 'selected' : ''}`}
                  onClick={() => toggleDeckSelection(deck.id)}
                >
                  <div className="deck-selection-info">
                    <h4>{deck.name}</h4>
                    <p>{deck.description || 'No description'}</p>
                  </div>
                  <div className="selection-indicator">
                    {selectedDecks.has(deck.id) ? '✓' : '○'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="quiz-stats">
            <h3>Your Learning Progress</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{learningStats?.totalCardsStudied || 0}</div>
                <div className="stat-label">Words Studied</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{learningStats?.cardsDueToday || 0}</div>
                <div className="stat-label">Due for Review</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {learningStats?.accuracyByDifficulty?.length > 0
                    ? Math.round(learningStats.accuracyByDifficulty.reduce((sum, item) => sum + item.accuracy, 0) / learningStats.accuracyByDifficulty.length)
                    : 0}%
                </div>
                <div className="stat-label">Average Accuracy</div>
              </div>
            </div>
          </div>

          <div className="quiz-actions">
            <button
              onClick={generateRandomQuiz}
              className="generate-quiz-btn"
              disabled={generating || quizSettings.questionTypes.length === 0 || selectedDecks.size === 0}
            >
              {generating ? 'Generating Quiz...' : `Generate Quiz (${quizSettings.count} questions)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RandomQuiz;