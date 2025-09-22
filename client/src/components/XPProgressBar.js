/**
 * T032: XPProgressBar component
 * Component for displaying XP progress with visual progress bar
 */

import React, { useState, useEffect } from 'react';
import './XPProgressBar.css';

const XPProgressBar = ({
  currentXP = 0,
  level = 1,
  showNumbers = true,
  showTooltip = false,
  animated = true,
  size = "medium", // small, medium, large
  color = "primary", // primary, success, warning, info
  className = ""
}) => {
  const [displayXP, setDisplayXP] = useState(currentXP);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate XP for current level
  const levelStartXP = (level - 1) * 100;
  const levelEndXP = level >= 50 ? levelStartXP : level * 100;
  const xpInCurrentLevel = currentXP - levelStartXP;
  const xpNeededForLevel = levelEndXP - levelStartXP;
  const progressPercentage = level >= 50 ? 100 : (xpInCurrentLevel / xpNeededForLevel) * 100;

  // XP needed for next level
  const xpToNextLevel = level >= 50 ? 0 : levelEndXP - currentXP;

  // Animate XP changes
  useEffect(() => {
    if (animated && currentXP !== displayXP) {
      setIsAnimating(true);
      const difference = currentXP - displayXP;
      const steps = Math.min(Math.abs(difference), 50);
      const stepSize = difference / steps;
      const stepDelay = 20;

      let step = 0;
      const timer = setInterval(() => {
        step++;
        if (step >= steps) {
          setDisplayXP(currentXP);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setDisplayXP(prev => Math.round(prev + stepSize));
        }
      }, stepDelay);

      return () => clearInterval(timer);
    } else {
      setDisplayXP(currentXP);
    }
  }, [currentXP, animated]);

  // Handle XP gain animation
  const [xpGainAnimation, setXpGainAnimation] = useState(null);

  const triggerXPGain = (gainedXP) => {
    setXpGainAnimation(gainedXP);
    setTimeout(() => setXpGainAnimation(null), 2000);
  };

  // Expose triggerXPGain to parent components
  React.useImperativeHandle(React.forwardRef(() => {}), () => ({
    triggerXPGain
  }));

  const getColorClass = () => {
    switch (color) {
      case 'success': return 'progress-success';
      case 'warning': return 'progress-warning';
      case 'info': return 'progress-info';
      default: return 'progress-primary';
    }
  };

  return (
    <div className={`xp-progress-bar ${size} ${getColorClass()} ${isAnimating ? 'animating' : ''} ${className}`}>
      {showNumbers && (
        <div className="xp-header">
          <div className="xp-current">
            <span className="xp-value">{displayXP.toLocaleString()}</span>
            <span className="xp-label">XP</span>
          </div>
          {level < 50 && (
            <div className="xp-target">
              <span className="xp-to-next">{xpToNextLevel}</span>
              <span className="xp-label">to next level</span>
            </div>
          )}
        </div>
      )}

      <div className="progress-container">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(progressPercentage, 100)}%`,
              transition: animated ? 'width 0.5s ease-in-out' : 'none'
            }}
          >
            {/* Progress shine effect */}
            <div className="progress-shine"></div>
          </div>

          {/* Level markers for visual reference */}
          {size === 'large' && (
            <div className="level-markers">
              {[25, 50, 75].map(percent => (
                <div
                  key={percent}
                  className="level-marker"
                  style={{ left: `${percent}%` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Progress percentage text overlay */}
        {size !== 'small' && (
          <div className="progress-text">
            {level >= 50 ? 'MAX LEVEL' : `${Math.round(progressPercentage)}%`}
          </div>
        )}
      </div>

      {/* Detailed breakdown for large size */}
      {size === 'large' && (
        <div className="xp-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-label">Current Level:</span>
            <span className="breakdown-value">{xpInCurrentLevel}/{xpNeededForLevel} XP</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Total XP:</span>
            <span className="breakdown-value">{currentXP.toLocaleString()}</span>
          </div>
          {level < 50 && (
            <div className="breakdown-item">
              <span className="breakdown-label">Next Level:</span>
              <span className="breakdown-value">Level {level + 1}</span>
            </div>
          )}
        </div>
      )}

      {/* XP gain animation */}
      {xpGainAnimation && (
        <div className="xp-gain-animation">
          +{xpGainAnimation} XP
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="xp-tooltip">
          <div className="tooltip-content">
            <div>Level {level}</div>
            <div>{xpInCurrentLevel}/{xpNeededForLevel} XP</div>
            {level < 50 && <div>{xpToNextLevel} XP to next level</div>}
          </div>
        </div>
      )}

      {/* Max level indicator */}
      {level >= 50 && (
        <div className="max-level-indicator">
          🏆 Maximum Level Reached!
        </div>
      )}
    </div>
  );
};

// XP gain celebration component
export const XPGainCelebration = ({ xpGained, onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="xp-gain-celebration">
      <div className="celebration-content">
        <div className="xp-gain-amount">+{xpGained} XP</div>
        <div className="xp-gain-message">Experience Gained!</div>
      </div>
      <div className="xp-particles">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="xp-particle"
            style={{
              '--delay': `${index * 0.1}s`,
              '--angle': `${index * 45}deg`
            }}
          >
            ✨
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook for managing XP progress
export const useXPProgress = (initialXP = 0, level = 1) => {
  const [currentXP, setCurrentXP] = useState(initialXP);
  const [animations, setAnimations] = useState([]);

  const addXP = (amount) => {
    setCurrentXP(prev => prev + amount);
    setAnimations(prev => [...prev, { id: Date.now(), amount }]);
  };

  const removeAnimation = (id) => {
    setAnimations(prev => prev.filter(anim => anim.id !== id));
  };

  const resetXP = (newXP = 0) => {
    setCurrentXP(newXP);
    setAnimations([]);
  };

  // Calculate if level up occurred
  const checkLevelUp = (oldXP, newXP) => {
    const oldLevel = Math.floor(oldXP / 100) + 1;
    const newLevel = Math.floor(newXP / 100) + 1;
    return newLevel > oldLevel ? newLevel : null;
  };

  return {
    currentXP,
    addXP,
    resetXP,
    animations,
    removeAnimation,
    checkLevelUp
  };
};

export default XPProgressBar;