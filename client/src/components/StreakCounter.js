/**
 * T033: StreakCounter component
 * Component for displaying learning streak with motivational elements
 */

import React, { useState, useEffect } from 'react';
import './StreakCounter.css';

const StreakCounter = ({
  streak = 0,
  lastSessionDate = null,
  showMotivation = true,
  showCalendar = false,
  size = "medium", // small, medium, large
  theme = "default", // default, fire, stars, hearts
  className = ""
}) => {
  const [displayStreak, setDisplayStreak] = useState(streak);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate streak changes
  useEffect(() => {
    if (streak !== displayStreak) {
      setIsAnimating(true);
      const difference = streak - displayStreak;
      const steps = Math.min(Math.abs(difference), 20);
      const stepSize = difference / steps;
      const stepDelay = 50;

      let step = 0;
      const timer = setInterval(() => {
        step++;
        if (step >= steps) {
          setDisplayStreak(streak);
          setIsAnimating(false);
          clearInterval(timer);
        } else {
          setDisplayStreak(prev => Math.round(prev + stepSize));
        }
      }, stepDelay);

      return () => clearInterval(timer);
    }
  }, [streak, displayStreak]);

  // Get streak status
  const getStreakStatus = () => {
    if (!lastSessionDate) return 'no-streak';

    const today = new Date();
    const lastSession = new Date(lastSessionDate);
    const hoursDiff = (today - lastSession) / (1000 * 60 * 60);

    if (hoursDiff <= 24) return 'active';
    if (hoursDiff <= 48) return 'at-risk';
    return 'broken';
  };

  // Get motivational message
  const getMotivationalMessage = () => {
    const status = getStreakStatus();

    if (status === 'broken') {
      return "Start a new streak today!";
    }

    if (status === 'at-risk') {
      return "Don't break your streak!";
    }

    if (streak === 0) {
      return "Start your learning streak!";
    }

    if (streak === 1) {
      return "Great start! Keep it going!";
    }

    if (streak < 7) {
      return `${streak} days strong! Keep it up!`;
    }

    if (streak < 30) {
      return `Amazing ${streak}-day streak!`;
    }

    if (streak < 100) {
      return `Incredible ${streak}-day streak!`;
    }

    return `Legendary ${streak}-day streak!`;
  };

  // Get streak milestone
  const getStreakMilestone = () => {
    if (streak >= 365) return { type: 'legendary', emoji: '🏆', text: 'Year Master!' };
    if (streak >= 100) return { type: 'champion', emoji: '👑', text: 'Century Club!' };
    if (streak >= 60) return { type: 'master', emoji: '🌟', text: 'Streak Master!' };
    if (streak >= 30) return { type: 'expert', emoji: '💎', text: 'Monthly Hero!' };
    if (streak >= 14) return { type: 'advanced', emoji: '🎯', text: '2-Week Warrior!' };
    if (streak >= 7) return { type: 'good', emoji: '🔥', text: 'Week Champion!' };
    if (streak >= 3) return { type: 'started', emoji: '⭐', text: 'Getting Hot!' };
    return null;
  };

  // Get theme icon
  const getThemeIcon = () => {
    switch (theme) {
      case 'fire': return '🔥';
      case 'stars': return '⭐';
      case 'hearts': return '💚';
      default: return '🎯';
    }
  };

  const status = getStreakStatus();
  const milestone = getStreakMilestone();
  const themeIcon = getThemeIcon();

  return (
    <div className={`streak-counter ${size} ${theme} ${status} ${isAnimating ? 'animating' : ''} ${className}`}>
      <div className="streak-header">
        <div className="streak-icon">
          {themeIcon}
        </div>
        <div className="streak-title">
          {size !== 'small' ? 'Learning Streak' : 'Streak'}
        </div>
      </div>

      <div className="streak-content">
        <div className="streak-number">
          <span className="streak-value">{displayStreak}</span>
          <span className="streak-unit">day{displayStreak !== 1 ? 's' : ''}</span>
        </div>

        {milestone && size !== 'small' && (
          <div className={`streak-milestone ${milestone.type}`}>
            <span className="milestone-emoji">{milestone.emoji}</span>
            <span className="milestone-text">{milestone.text}</span>
          </div>
        )}

        {showMotivation && size !== 'small' && (
          <div className="streak-motivation">
            {getMotivationalMessage()}
          </div>
        )}

        {status === 'at-risk' && (
          <div className="streak-warning">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">Streak at risk!</span>
          </div>
        )}

        {status === 'broken' && streak > 0 && (
          <div className="streak-broken">
            <span className="broken-icon">💔</span>
            <span className="broken-text">Streak broken</span>
          </div>
        )}
      </div>

      {showCalendar && size === 'large' && (
        <div className="streak-calendar">
          <StreakCalendar streak={streak} lastSessionDate={lastSessionDate} />
        </div>
      )}

      {lastSessionDate && size !== 'small' && (
        <div className="streak-footer">
          <div className="last-session">
            Last session: {new Date(lastSessionDate).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
};

// Mini calendar component for streak visualization
const StreakCalendar = ({ streak, lastSessionDate }) => {
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 13); // Show last 14 days

    for (let i = 0; i < 14; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const isToday = currentDate.toDateString() === today.toDateString();
      const isInStreak = lastSessionDate &&
        currentDate <= new Date(lastSessionDate) &&
        currentDate >= new Date(new Date(lastSessionDate).getTime() - (streak - 1) * 24 * 60 * 60 * 1000);

      days.push({
        date: currentDate,
        isToday,
        isInStreak,
        dayOfWeek: currentDate.toLocaleDateString('en', { weekday: 'short' }),
        dayOfMonth: currentDate.getDate()
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="streak-calendar-grid">
      <div className="calendar-header">Last 14 Days</div>
      <div className="calendar-days">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`calendar-day ${day.isToday ? 'today' : ''} ${day.isInStreak ? 'in-streak' : ''}`}
            title={`${day.date.toLocaleDateString()} ${day.isInStreak ? '✓' : ''}`}
          >
            <div className="day-of-week">{day.dayOfWeek}</div>
            <div className="day-of-month">{day.dayOfMonth}</div>
            {day.isInStreak && <div className="streak-indicator">🔥</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// Streak celebration component
export const StreakCelebration = ({ milestone, onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!milestone) return null;

  return (
    <div className="streak-celebration">
      <div className="celebration-content">
        <div className="celebration-icon">{milestone.emoji}</div>
        <div className="celebration-title">Streak Milestone!</div>
        <div className="celebration-message">{milestone.text}</div>
      </div>
      <div className="celebration-fireworks">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="firework"
            style={{
              '--delay': `${index * 0.2}s`,
              '--angle': `${index * 60}deg`
            }}
          >
            🎆
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook for managing streak data
export const useStreak = (initialStreak = 0, lastSessionDate = null) => {
  const [streak, setStreak] = useState(initialStreak);
  const [lastSession, setLastSession] = useState(lastSessionDate);

  const updateStreak = (newStreak, sessionDate = null) => {
    setStreak(newStreak);
    if (sessionDate) {
      setLastSession(sessionDate);
    }
  };

  const incrementStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    setStreak(prev => prev + 1);
    setLastSession(today);
  };

  const resetStreak = () => {
    setStreak(0);
    setLastSession(null);
  };

  const getStreakStatus = () => {
    if (!lastSession) return 'no-streak';

    const today = new Date();
    const lastSessionDate = new Date(lastSession);
    const hoursDiff = (today - lastSessionDate) / (1000 * 60 * 60);

    if (hoursDiff <= 24) return 'active';
    if (hoursDiff <= 48) return 'at-risk';
    return 'broken';
  };

  return {
    streak,
    lastSession,
    updateStreak,
    incrementStreak,
    resetStreak,
    getStreakStatus
  };
};

export default StreakCounter;