/**
 * T030: ProgressionDashboard component
 * Main dashboard component for displaying user progression overview
 */

import React from 'react';
import { useProgression } from '../contexts/ProgressionContext';
import LevelDisplay from './LevelDisplay';
import XPProgressBar from './XPProgressBar';
import StreakCounter from './StreakCounter';
import './ProgressionDashboard.css';

const ProgressionDashboard = ({ className = '', showDetailed = false }) => {
  const {
    progression,
    isLoading,
    error,
    hasProgression,
    getAccuracy,
    isMaxLevel
  } = useProgression();

  if (isLoading) {
    return (
      <div className={`progression-dashboard loading ${className}`}>
        <div className="loading-spinner">Loading progression...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`progression-dashboard error ${className}`}>
        <div className="error-message">
          <h3>Unable to load progression</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!hasProgression) {
    return (
      <div className={`progression-dashboard no-data ${className}`}>
        <div className="no-data-message">
          <h3>Start Learning!</h3>
          <p>Complete your first session to see your progression</p>
        </div>
      </div>
    );
  }

  const accuracy = getAccuracy();

  return (
    <div className={`progression-dashboard ${className}`}>
      <div className="dashboard-header">
        <h2>Your Progress</h2>
        <div className="dashboard-stats">
          <div className="stat-item">
            <span className="stat-value">{progression.totalSessions}</span>
            <span className="stat-label">Sessions</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{accuracy}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="progression-overview">
          <LevelDisplay
            level={progression.level}
            title="Current Level"
            showRange={showDetailed}
            className="dashboard-level"
          />

          <XPProgressBar
            currentXP={progression.xp}
            level={progression.level}
            showNumbers={true}
            className="dashboard-xp"
          />

          <StreakCounter
            streak={progression.streak}
            lastSessionDate={progression.lastSessionDate}
            showMotivation={true}
            className="dashboard-streak"
          />
        </div>

        {showDetailed && (
          <div className="progression-details">
            <div className="detail-section">
              <h3>Difficulty Level</h3>
              <div className="difficulty-display">
                <div className="difficulty-bar">
                  <div
                    className="difficulty-fill"
                    style={{ width: `${progression.currentDifficulty}%` }}
                  ></div>
                </div>
                <span className="difficulty-value">
                  {progression.currentDifficulty}/100
                </span>
              </div>
              <div className="difficulty-range">
                Range: {progression.difficultyRange?.min || 0} - {progression.difficultyRange?.max || 100}
              </div>
            </div>

            <div className="detail-section">
              <h3>Session Statistics</h3>
              <div className="session-stats">
                <div className="session-stat">
                  <span className="stat-label">Total Questions</span>
                  <span className="stat-value">{progression.totalQuestionsAnswered}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Correct Answers</span>
                  <span className="stat-value">{progression.totalCorrectAnswers}</span>
                </div>
                <div className="session-stat">
                  <span className="stat-label">Success Rate</span>
                  <span className="stat-value">{accuracy}%</span>
                </div>
              </div>
            </div>

            {!isMaxLevel() && (
              <div className="detail-section">
                <h3>Next Level</h3>
                <div className="next-level-info">
                  <div className="xp-needed">
                    {progression.xpToNextLevel - (progression.xp - ((progression.level - 1) * 100))} XP needed
                  </div>
                  <div className="level-preview">
                    Level {progression.level + 1}
                  </div>
                </div>
              </div>
            )}

            {isMaxLevel() && (
              <div className="detail-section max-level">
                <h3>🎉 Maximum Level Reached!</h3>
                <p>Congratulations! You've mastered the progression system.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        {progression.lastSessionDate && (
          <div className="last-session">
            Last session: {new Date(progression.lastSessionDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressionDashboard;