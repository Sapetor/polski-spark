import React, { useState } from 'react';

const API_BASE = 'http://localhost:3001';

const GrammarPractice = ({ currentUser, onBackToDashboard, onError, onStartLesson }) => {
  const [grammarSettings, setGrammarSettings] = useState({
    grammarTopics: ['word_order', 'cases', 'verb_forms'],
    count: 10,
    difficulty: 'beginner'
  });
  const [generating, setGenerating] = useState(false);

  const grammarTopicOptions = [
    { value: 'word_order', label: 'Word Order', description: 'Learn correct Polish sentence structure' },
    { value: 'cases', label: 'Cases', description: 'Practice nominative and accusative cases' },
    { value: 'verb_forms', label: 'Verb Forms', description: 'Conjugate verbs in present tense' }
  ];

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner', description: 'Basic grammar patterns and simple structures' },
    { value: 'intermediate', label: 'Intermediate', description: 'More complex grammar rules' },
    { value: 'advanced', label: 'Advanced', description: 'Advanced grammar and exceptions' }
  ];

  const toggleGrammarTopic = (topic) => {
    setGrammarSettings(prev => ({
      ...prev,
      grammarTopics: prev.grammarTopics.includes(topic)
        ? prev.grammarTopics.filter(t => t !== topic)
        : [...prev.grammarTopics, topic]
    }));
  };

  const generateGrammarPractice = async () => {
    if (grammarSettings.grammarTopics.length === 0) {
      onError('Please select at least one grammar topic');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUser.id}/grammar-practice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grammarTopics: grammarSettings.grammarTopics,
          count: grammarSettings.count,
          difficulty: grammarSettings.difficulty
        }),
      });

      if (response.ok) {
        const grammarData = await response.json();
        onStartLesson(grammarData, 'grammar');
      } else {
        const error = await response.json();
        onError('Failed to generate grammar practice: ' + error.error);
      }
    } catch (error) {
      onError('Network error generating grammar practice');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grammar-practice">
      <div className="grammar-header">
        <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
        <h2>📝 Grammar Practice</h2>
        <p className="grammar-subtitle">
          Master Polish sentence structure, cases, and verb forms
        </p>
      </div>

      <div className="grammar-config">
        <div className="config-section">
          <h3>Practice Settings</h3>

          <div className="setting-group">
            <label>Number of Questions:</label>
            <select
              value={grammarSettings.count}
              onChange={(e) => setGrammarSettings(prev => ({ ...prev, count: parseInt(e.target.value) }))}
              className="setting-select"
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Difficulty Level:</label>
            <div className="difficulty-cards">
              {difficultyOptions.map(option => (
                <div
                  key={option.value}
                  className={`difficulty-card ${grammarSettings.difficulty === option.value ? 'selected' : ''}`}
                  onClick={() => setGrammarSettings(prev => ({ ...prev, difficulty: option.value }))}
                >
                  <h4>{option.label}</h4>
                  <p>{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>Grammar Topics</h3>
          <div className="grammar-topics">
            {grammarTopicOptions.map(topic => (
              <div
                key={topic.value}
                className={`topic-card ${grammarSettings.grammarTopics.includes(topic.value) ? 'selected' : ''}`}
                onClick={() => toggleGrammarTopic(topic.value)}
              >
                <div className="topic-content">
                  <h4>{topic.label}</h4>
                  <p>{topic.description}</p>
                </div>
                <div className="selection-indicator">
                  {grammarSettings.grammarTopics.includes(topic.value) ? '✓' : '○'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grammar-info">
          <h3>What You'll Learn</h3>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon">🔄</div>
              <div className="info-content">
                <h4>Word Order</h4>
                <p>Learn the correct arrangement of words in Polish sentences, including basic patterns and question formation.</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">📋</div>
              <div className="info-content">
                <h4>Cases</h4>
                <p>Practice nominative (subject) and accusative (direct object) cases with real vocabulary.</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">⚡</div>
              <div className="info-content">
                <h4>Verb Forms</h4>
                <p>Master present tense verb conjugations for different persons (ja, ty, on/ona).</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grammar-actions">
          <button
            onClick={generateGrammarPractice}
            className="start-grammar-btn"
            disabled={generating || grammarSettings.grammarTopics.length === 0}
          >
            {generating ? 'Generating Practice...' : `Start Grammar Practice (${grammarSettings.count} questions)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrammarPractice;