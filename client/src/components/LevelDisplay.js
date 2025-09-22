/**
 * T031: LevelDisplay component
 * Component for displaying user level with visual styling
 */

import React from 'react';
import './LevelDisplay.css';

const LevelDisplay = ({
  level = 1,
  title = "Level",
  showRange = false,
  difficultyRange = null,
  size = "medium", // small, medium, large
  animated = false,
  className = ""
}) => {
  // Get level title based on level
  const getLevelTitle = (level) => {
    if (level >= 50) return 'Grandmaster';
    if (level >= 45) return 'Master';
    if (level >= 40) return 'Expert';
    if (level >= 35) return 'Proficient';
    if (level >= 30) return 'Advanced';
    if (level >= 25) return 'Skilled';
    if (level >= 20) return 'Intermediate';
    if (level >= 15) return 'Learner';
    if (level >= 10) return 'Student';
    if (level >= 5) return 'Novice';
    return 'Beginner';
  };

  // Get level color based on level
  const getLevelColor = (level) => {
    if (level >= 50) return '#ffd700'; // Gold
    if (level >= 40) return '#e74c3c'; // Red
    if (level >= 30) return '#9b59b6'; // Purple
    if (level >= 20) return '#3498db'; // Blue
    if (level >= 10) return '#2ecc71'; // Green
    return '#95a5a6'; // Gray
  };

  // Get level badge style
  const getLevelBadgeStyle = (level) => {
    const color = getLevelColor(level);
    return {
      backgroundColor: color,
      color: level >= 50 ? '#000' : '#fff',
      boxShadow: `0 2px 8px ${color}33`
    };
  };

  const levelTitle = getLevelTitle(level);
  const levelColor = getLevelColor(level);

  return (
    <div className={`level-display ${size} ${animated ? 'animated' : ''} ${className}`}>
      <div className="level-header">
        <h3 className="level-title">{title}</h3>
      </div>

      <div className="level-content">
        <div
          className="level-badge"
          style={getLevelBadgeStyle(level)}
        >
          <div className="level-number">{level}</div>
          {size !== 'small' && (
            <div className="level-subtitle">{levelTitle}</div>
          )}
        </div>

        {size !== 'small' && (
          <div className="level-info">
            <div className="level-description">
              Level {level} {levelTitle}
            </div>

            {showRange && difficultyRange && (
              <div className="difficulty-range">
                <span className="range-label">Difficulty Range:</span>
                <span className="range-values">
                  {difficultyRange.min} - {difficultyRange.max}
                </span>
              </div>
            )}

            {level >= 50 && (
              <div className="max-level-indicator">
                🏆 Maximum Level Achieved!
              </div>
            )}
          </div>
        )}
      </div>

      {animated && (
        <div className="level-animation">
          <div className="sparkle sparkle-1">✨</div>
          <div className="sparkle sparkle-2">⭐</div>
          <div className="sparkle sparkle-3">✨</div>
        </div>
      )}

      {/* Level progression indicators */}
      {size === 'large' && (
        <div className="level-progression">
          <div className="progression-dots">
            {[...Array(Math.min(level, 10))].map((_, index) => (
              <div
                key={index}
                className="progression-dot"
                style={{ backgroundColor: levelColor }}
              />
            ))}
            {level > 10 && (
              <div className="progression-overflow">
                +{level - 10}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Level up celebration component
export const LevelUpCelebration = ({ oldLevel, newLevel, onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="level-up-celebration">
      <div className="celebration-content">
        <div className="celebration-title">🎉 Level Up! 🎉</div>
        <div className="level-transition">
          <LevelDisplay
            level={oldLevel}
            title="From"
            size="small"
            className="old-level"
          />
          <div className="arrow">→</div>
          <LevelDisplay
            level={newLevel}
            title="To"
            size="large"
            animated={true}
            className="new-level"
          />
        </div>
        <div className="celebration-message">
          Congratulations! You've reached Level {newLevel}!
        </div>
      </div>
      <div className="celebration-background">
        <div className="confetti">🎊</div>
        <div className="confetti">🎉</div>
        <div className="confetti">✨</div>
        <div className="confetti">🌟</div>
        <div className="confetti">🎊</div>
      </div>
    </div>
  );
};

export default LevelDisplay;