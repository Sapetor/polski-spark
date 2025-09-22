/**
 * T028: ProgressionContext provider
 * React Context for managing user progression state
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  progression: null,
  isLoading: false,
  error: null,
  lastUpdated: null
};

// Action types
const PROGRESSION_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_PROGRESSION: 'SET_PROGRESSION',
  SET_ERROR: 'SET_ERROR',
  UPDATE_PROGRESSION: 'UPDATE_PROGRESSION',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET: 'RESET'
};

// Reducer function
const progressionReducer = (state, action) => {
  switch (action.type) {
    case PROGRESSION_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error
      };

    case PROGRESSION_ACTIONS.SET_PROGRESSION:
      return {
        ...state,
        progression: action.payload,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      };

    case PROGRESSION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case PROGRESSION_ACTIONS.UPDATE_PROGRESSION:
      return {
        ...state,
        progression: state.progression ? {
          ...state.progression,
          ...action.payload
        } : action.payload,
        lastUpdated: new Date()
      };

    case PROGRESSION_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case PROGRESSION_ACTIONS.RESET:
      return initialState;

    default:
      return state;
  }
};

// Create context
const ProgressionContext = createContext();

// Provider component
export const ProgressionProvider = ({ children, userId }) => {
  const [state, dispatch] = useReducer(progressionReducer, initialState);

  // API base URL - adjust as needed
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Load progression data
  const loadProgression = async (userIdOverride = null) => {
    const targetUserId = userIdOverride || userId;

    if (!targetUserId) {
      dispatch({
        type: PROGRESSION_ACTIONS.SET_ERROR,
        payload: 'User ID is required'
      });
      return;
    }

    dispatch({ type: PROGRESSION_ACTIONS.SET_LOADING, payload: true });

    try {
      const response = await fetch(`${API_BASE}/api/users/${targetUserId}/progression`);

      if (!response.ok) {
        throw new Error(`Failed to load progression: ${response.status}`);
      }

      const progressionData = await response.json();

      dispatch({
        type: PROGRESSION_ACTIONS.SET_PROGRESSION,
        payload: progressionData
      });

    } catch (error) {
      console.error('Error loading progression:', error);
      dispatch({
        type: PROGRESSION_ACTIONS.SET_ERROR,
        payload: error.message
      });
    }
  };

  // Update progression after session
  const updateProgressionAfterSession = async (sessionData) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    dispatch({ type: PROGRESSION_ACTIONS.SET_LOADING, payload: true });

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/progression/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Update failed: ${response.status}`);
      }

      const updateResult = await response.json();

      // Update the progression state with new values
      if (state.progression) {
        dispatch({
          type: PROGRESSION_ACTIONS.UPDATE_PROGRESSION,
          payload: {
            level: updateResult.newLevel,
            xp: updateResult.newXp,
            streak: updateResult.newStreak,
            currentDifficulty: updateResult.newDifficulty,
            totalSessions: state.progression.totalSessions + 1,
            totalCorrectAnswers: state.progression.totalCorrectAnswers + sessionData.correctAnswers,
            totalQuestionsAnswered: state.progression.totalQuestionsAnswered + sessionData.questionsAnswered
          }
        });
      }

      dispatch({ type: PROGRESSION_ACTIONS.SET_LOADING, payload: false });

      return updateResult;

    } catch (error) {
      console.error('Error updating progression:', error);
      dispatch({
        type: PROGRESSION_ACTIONS.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Get level progression info
  const getLevelProgression = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/progression/levels`);

      if (!response.ok) {
        throw new Error(`Failed to load level progression: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error loading level progression:', error);
      throw error;
    }
  };

  // Get progression history
  const getProgressionHistory = async (options = {}) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await fetch(
        `${API_BASE}/api/users/${userId}/progression/history?${params}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load progression history: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error loading progression history:', error);
      throw error;
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: PROGRESSION_ACTIONS.CLEAR_ERROR });
  };

  // Reset progression state
  const resetProgression = () => {
    dispatch({ type: PROGRESSION_ACTIONS.RESET });
  };

  // Load progression on mount or when userId changes
  useEffect(() => {
    if (userId) {
      loadProgression();
    }
  }, [userId]);

  // Context value
  const value = {
    // State
    progression: state.progression,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    loadProgression,
    updateProgressionAfterSession,
    getLevelProgression,
    getProgressionHistory,
    clearError,
    resetProgression,

    // Computed values
    hasProgression: !!state.progression,
    isInitialized: state.progression !== null,

    // Helper methods
    getAccuracy: () => {
      if (!state.progression) return 0;
      const { totalCorrectAnswers, totalQuestionsAnswered } = state.progression;
      return totalQuestionsAnswered > 0
        ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100 * 100) / 100
        : 0;
    },

    getXPProgress: () => {
      if (!state.progression) return 0;
      const { xp, level } = state.progression;
      const levelStartXP = (level - 1) * 100;
      return xp - levelStartXP;
    },

    getXPToNextLevel: () => {
      if (!state.progression) return 100;
      const { level } = state.progression;
      return level >= 50 ? 0 : level * 100;
    },

    isMaxLevel: () => {
      return state.progression?.level >= 50;
    }
  };

  return (
    <ProgressionContext.Provider value={value}>
      {children}
    </ProgressionContext.Provider>
  );
};

// Custom hook to use progression context
export const useProgression = () => {
  const context = useContext(ProgressionContext);

  if (!context) {
    throw new Error('useProgression must be used within a ProgressionProvider');
  }

  return context;
};

// Export action types for testing
export { PROGRESSION_ACTIONS };

export default ProgressionContext;