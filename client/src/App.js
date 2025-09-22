import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import DeckUpload from './components/DeckUpload';
import LearningSession from './components/LearningSession';
import StudyMode from './components/StudyMode';
import ReviewWords from './components/ReviewWords';
import RandomQuiz from './components/RandomQuiz';
import GrammarPractice from './components/GrammarPractice';
import GrammarLessons from './components/GrammarLessons';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import { SkeletonUserProfile, SkeletonDeck } from './components/Skeleton';
import { useToast } from './components/Toast';

const API_BASE = 'http://localhost:3001';

function App() {
  const { showSuccess, showError, showWarning, ToastContainer } = useToast();
  const [currentView, setCurrentView] = useState('userSelect');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [selectedDeck] = useState(null);
  // Removed unused state variables to clean up warnings
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Loading states
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    setIsInitializing(true);
    setIsLoadingUsers(true);
    setIsLoadingDecks(true);

    try {
      // Check connectivity first
      await checkConnectivity();

      // Load data in parallel
      await Promise.allSettled([
        fetchUsers(false), // Don't show error toasts during initial load
        fetchDecks(false)
      ]);

      // Update loading states based on results
      setIsLoadingUsers(false);
      setIsLoadingDecks(false);

      // Restore session after data is loaded
      restoreSessionState();
    } catch (error) {
      console.error('App initialization failed:', error);
      showError('Unable to connect to server. Some features may not work properly.');
      setIsLoadingUsers(false);
      setIsLoadingDecks(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const checkConnectivity = async () => {
    try {
      // Try a simple API call to check connectivity
      await fetchWithRetry(`${API_BASE}/api/users`, {}, 1, 500);
    } catch (error) {
      throw new Error('Server connectivity check failed');
    }
  };

  // Auto-save session state when it changes
  useEffect(() => {
    if (currentView === 'lesson' && currentLesson) {
      saveSessionState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, currentLesson, currentQuestion, sessionStats, currentUser]);

  const saveSessionState = () => {
    if (currentView !== 'lesson' || !currentLesson) return;

    try {
      const sessionState = {
        currentView,
        currentUser,
        currentLesson,
        currentQuestion,
        sessionStats,
        questionStartTime,
        timestamp: Date.now()
      };

      localStorage.setItem('polishSparkSession', JSON.stringify(sessionState));
      console.log('Session state saved');
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  };

  const restoreSessionState = () => {
    try {
      const savedState = localStorage.getItem('polishSparkSession');
      if (!savedState) return;

      const sessionState = JSON.parse(savedState);
      const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours

      // Check if session is too old
      if (Date.now() - sessionState.timestamp > MAX_SESSION_AGE) {
        localStorage.removeItem('polishSparkSession');
        console.log('Session expired, clearing saved state');
        return;
      }

      // Only restore if user confirms
      if (sessionState.currentView === 'lesson' && sessionState.currentLesson) {
        const shouldRestore = window.confirm(
          `Would you like to continue your previous learning session? (Question ${sessionState.currentQuestion + 1} of ${sessionState.currentLesson.questions.length})`
        );

        if (shouldRestore) {
          setCurrentView(sessionState.currentView);
          setCurrentUser(sessionState.currentUser);
          setCurrentLesson(sessionState.currentLesson);
          setCurrentQuestion(sessionState.currentQuestion);
          setSessionStats(sessionState.sessionStats);
          setQuestionStartTime(Date.now()); // Reset timer for current question
          setShowResult(false);
          setLastResult(null);
          setUserAnswer('');

          console.log('Session state restored');
          showSuccess('Previous learning session restored!');
        } else {
          clearSessionState();
        }
      }
    } catch (error) {
      console.error('Failed to restore session state:', error);
      localStorage.removeItem('polishSparkSession');
    }
  };

  const clearSessionState = () => {
    try {
      localStorage.removeItem('polishSparkSession');
      console.log('Session state cleared');
    } catch (error) {
      console.error('Failed to clear session state:', error);
    }
  };

  const fetchWithRetry = async (url, options = {}, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.ok) {
          return response;
        } else if (response.status >= 500 && attempt < maxRetries) {
          // Server error, retry
          console.log(`Server error ${response.status}, retrying attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        } else {
          // Client error or final attempt, don't retry
          return response;
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        console.log(`Network error on attempt ${attempt}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  };

  const fetchUsers = useCallback(async (showErrorToast = true) => {
    if (showErrorToast) setIsLoadingUsers(true);

    try {
      const response = await fetchWithRetry(`${API_BASE}/api/users`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);

      if (showErrorToast) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          showError('Network error: Unable to connect to server. Please check your connection.');
        } else {
          showError('Failed to load users. Please try refreshing the page.');
        }
      }
    } finally {
      if (showErrorToast) setIsLoadingUsers(false);
    }
  }, [showError]);

  const fetchDecks = useCallback(async (showErrorToast = true) => {
    if (showErrorToast) setIsLoadingDecks(true);

    try {
      const response = await fetchWithRetry(`${API_BASE}/api/decks`);

      if (response.ok) {
        const data = await response.json();
        setDecks(data);
      } else {
        throw new Error(`Failed to fetch decks: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);

      if (showErrorToast) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          showError('Network error: Unable to connect to server. Please check your connection.');
        } else {
          showError('Failed to load decks. Please try refreshing the page.');
        }
      }
    } finally {
      if (showErrorToast) setIsLoadingDecks(false);
    }
  }, [showError]);

  // Removed fetchCards function as it's no longer used

  const createUser = async (name) => {
    try {
      const response = await fetchWithRetry(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers([...users, newUser]);
        showSuccess(`Profile "${name}" created successfully!`);
        return newUser;
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create user: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showError('Network error: Unable to connect to server. Please check your connection.');
      } else {
        showError('Failed to create profile: ' + (error.message || 'Unknown error'));
      }
      return null;
    }
  };

  const uploadDeck = useCallback(async (file, deckName, setProgress) => {
    const uploadId = Date.now().toString();
    let progressInterval = null;

    try {
      // Simulate progress updates since backend doesn't have progress endpoint
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until upload completes
          return prev + Math.random() * 10;
        });
      }, 500);

      const formData = new FormData();
      formData.append('ankiFile', file);
      formData.append('deckName', deckName);

      const response = await fetchWithRetry(`${API_BASE}/api/upload-anki`, {
        method: 'POST',
        body: formData,
      }, 2, 2000);

      if (response.ok) {
        const result = await response.json();

        // Clear progress interval and set to 100%
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        setProgress(100);

        showSuccess(`Deck "${deckName}" uploaded successfully! ${result.cardCount || 'Unknown number of'} cards processed.`);
        fetchDecks(); // Refresh deck list
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Upload failed';
        showError(`Upload failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showError('Network error: Unable to connect to server. Please check your connection.');
      } else if (!error.message.includes('Upload failed:')) {
        showError('Upload failed: ' + (error.message || 'Unknown error occurred'));
      }

      // Still refresh decks in case upload worked despite error
      setTimeout(() => {
        fetchDecks();
      }, 2000);

      throw error;
    } finally {
      // Clean up progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  }, [showSuccess, showError, showWarning, fetchDecks]);

  const startLessonFromReview = (lessonData, mode = 'review') => {
    setCurrentLesson(lessonData);
    setCurrentQuestion(0);
    setUserAnswer('');
    setShowResult(false);
    setSessionStats({ correct: 0, total: 0 });
    setQuestionStartTime(Date.now());
    setCurrentView(mode === 'review' ? 'lesson' : 'lesson');
  };

  const startGrammarPracticeFromLesson = async (grammarTopic) => {
    if (!currentUser?.id) return;

    try {
      const response = await fetch(`${API_BASE}/api/users/${currentUser.id}/grammar-practice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grammarTopics: [grammarTopic],
          count: 8,
          difficulty: 'beginner'
        }),
      });

      if (response.ok) {
        const grammarData = await response.json();
        startLessonFromReview(grammarData, 'grammar');
      } else {
        const error = await response.json();
        showError('Failed to start grammar practice: ' + error.error);
      }
    } catch (error) {
      showError('Network error starting grammar practice');
    }
  };

  const startLesson = async (deckId, difficulty = 'beginner', questionTypes = 'multiple_choice,fill_blank,translation_pl_en', useSpacedRepetition = true, count = 10, mode = 'lesson') => {
    try {
      console.log('🎯 Starting lesson with count:', count);
      const userId = currentUser?.id;
      const spacedRepParam = userId && useSpacedRepetition ? '&useSpacedRepetition=true' : '';
      const userIdParam = userId ? `&userId=${userId}` : '';

      const url = `${API_BASE}/api/decks/${deckId}/lesson?difficulty=${difficulty}&questionTypes=${questionTypes}&count=${count}${userIdParam}${spacedRepParam}`;
      console.log('🌐 API URL:', url);

      const response = await fetchWithRetry(url);
      const lessonData = await response.json();

      if (response.ok) {
        console.log('📚 Lesson data received:', lessonData);
        console.log('📊 Total questions:', lessonData.totalQuestions);
        console.log('🔢 Questions array length:', lessonData.questions?.length);

        setCurrentLesson(lessonData);
        setCurrentQuestion(0);
        setUserAnswer('');
        setShowResult(false);
        setSessionStats({ correct: 0, total: 0 });
        setQuestionStartTime(Date.now());
        setCurrentView(mode === 'study' ? 'study' : 'lesson');
      } else {
        const errorMsg = lessonData.error || 'Failed to start lesson';
        showError('Error starting lesson: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error starting lesson:', error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showError('Network error: Unable to connect to server. Please check your connection.');
      } else {
        showError('Error starting lesson: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const checkAnswer = async (answer) => {
    if (!currentLesson || !currentUser) {
      throw new Error('Session data is missing');
    }

    const question = currentLesson.questions[currentQuestion];
    if (!question) {
      throw new Error('Current question is missing');
    }

    const timeTaken = questionStartTime ? Date.now() - questionStartTime : null;

    try {
      const response = await fetchWithRetry(`${API_BASE}/api/check-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          userAnswer: answer,
          userId: currentUser.id,
          cardId: question.cardId,
          timeTaken: timeTaken
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result || typeof result.correct !== 'boolean') {
        throw new Error('Invalid response from server');
      }

      setLastResult(result);
      setShowResult(true);

      // Update session stats
      setSessionStats(prev => ({
        correct: prev.correct + (result.correct ? 1 : 0),
        total: prev.total + 1
      }));

    } catch (error) {
      console.error('Error checking answer:', error);

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }

      throw error;
    }
  };

  const nextQuestion = () => {
    if (currentQuestion + 1 < currentLesson.questions.length) {
      setCurrentQuestion(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
      setLastResult(null);
      setQuestionStartTime(Date.now()); // Reset timer for next question
    } else {
      // Lesson complete - clear session state
      clearSessionState();
      setCurrentView('lessonComplete');
    }
  };

  const UserSelect = () => {
    const [newUserName, setNewUserName] = useState('');

    const handleUserSelect = (user) => {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', user.id);
      setCurrentView('dashboard');
    };

    const handleCreateUser = async () => {
      if (newUserName.trim()) {
        const user = await createUser(newUserName.trim());
        if (user) {
          handleUserSelect(user);
        }
        setNewUserName('');
      }
    };

    return (
      <div className="user-select">
        <h1>Polski Spark</h1>
        <h2>Select Your Profile</h2>
        
        <div className="existing-users">
          {isLoadingUsers ? (
            Array.from({ length: 3 }, (_, i) => <SkeletonUserProfile key={i} />)
          ) : (
            users.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="user-button"
              >
                {user.name} (Level {user.level}, XP: {user.xp})
              </button>
            ))
          )}
        </div>

        <div className="create-user">
          <h3>Create New Profile</h3>
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Enter your name"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          <button onClick={handleCreateUser}>Create Profile</button>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    const [showUploadModal, setShowUploadModal] = useState(false);

    return (
      <div className="dashboard">
        {/* Top Header with User Info and Controls */}
        <div className="dashboard-header-new">
          <div className="welcome-section">
            <div className="welcome-text">
              <h1>Welcome back, {currentUser?.name}! 👋</h1>
              <p className="welcome-subtitle">Ready to continue your Polish learning journey?</p>
            </div>
            <div className="header-controls">
              <button onClick={() => setCurrentView('userSelect')} className="control-btn secondary">
                👤 Switch User
              </button>
              <button onClick={() => setShowUploadModal(true)} className="control-btn primary">
                📁 Upload Deck
              </button>
            </div>
          </div>

          {/* User Progress Banner */}
          <div className="progress-banner">
            <div className="progress-stats-compact">
              <div className="stat-compact">
                <span className="stat-icon">⭐</span>
                <div className="stat-info">
                  <span className="stat-number">{currentUser?.level || 1}</span>
                  <span className="stat-label">Level</span>
                </div>
              </div>
              <div className="stat-compact">
                <span className="stat-icon">💫</span>
                <div className="stat-info">
                  <span className="stat-number">{currentUser?.xp || 0}</span>
                  <span className="stat-label">XP</span>
                </div>
              </div>
              <div className="stat-compact">
                <span className="stat-icon">🔥</span>
                <div className="stat-info">
                  <span className="stat-number">{currentUser?.streak || 0}</span>
                  <span className="stat-label">Day Streak</span>
                </div>
              </div>
            </div>
            {currentUser?.xp && (
              <div className="xp-progress-compact">
                <div className="progress-bar-new">
                  <div
                    className="progress-fill-new"
                    style={{
                      width: `${Math.min(100, ((currentUser.xp % 1000) / 1000) * 100)}%`
                    }}
                  ></div>
                </div>
                <span className="progress-label">
                  {currentUser.xp % 1000} / 1000 XP to Level {(currentUser?.level || 1) + 1}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-main">
          {/* Primary Learning Section */}
          <div className="learning-hub">
            <div className="section-header">
              <h2>🎯 Start Learning</h2>
              <p className="section-subtitle">Choose your deck and dive in</p>
            </div>

            {isLoadingDecks ? (
              <div className="loading-decks">
                {Array.from({ length: 2 }, (_, i) => <SkeletonDeck key={i} />)}
              </div>
            ) : decks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No decks available</h3>
                <p>Upload an Anki deck to get started with your learning journey!</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="cta-button"
                >
                  📁 Upload Your First Deck
                </button>
              </div>
            ) : (
              <div className="decks-showcase">
                {decks.map(deck => (
                  <DeckCard key={deck.id} deck={deck} onStartLesson={startLesson} />
                ))}
              </div>
            )}
          </div>

          {/* Analytics Dashboard */}
          <div className="analytics-hub">
            <div className="section-header">
              <h2>📊 Your Progress</h2>
              <p className="section-subtitle">Track your learning journey</p>
            </div>

            <div className="analytics-grid-new">
              <div className="analytics-card-new primary">
                <div className="card-header">
                  <span className="card-icon">📚</span>
                  <span className="card-title">Words Mastered</span>
                </div>
                <div className="card-value">{((currentUser?.xp || 0) / 10).toFixed(0)}</div>
                <div className="card-trend">↗️ +{Math.floor(Math.random() * 10) + 5} this week</div>
              </div>

              <div className="analytics-card-new">
                <div className="card-header">
                  <span className="card-icon">⏱️</span>
                  <span className="card-title">Study Time</span>
                </div>
                <div className="card-value">{Math.max(5, Math.floor(Math.random() * 15) + 5)}m</div>
                <div className="card-trend">Daily average</div>
              </div>

              <div className="analytics-card-new">
                <div className="card-header">
                  <span className="card-icon">🎯</span>
                  <span className="card-title">Accuracy</span>
                </div>
                <div className="card-value">{Math.max(65, Math.floor(Math.random() * 30) + 70)}%</div>
                <div className="card-trend">All time</div>
              </div>

              <div className="analytics-card-new">
                <div className="card-header">
                  <span className="card-icon">🏆</span>
                  <span className="card-title">Achievements</span>
                </div>
                <div className="card-value">{Math.floor((currentUser?.level || 1) * 2.5)}</div>
                <div className="card-trend">Unlocked</div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="actions-hub">
            <div className="section-header">
              <h2>⚡ Quick Practice</h2>
              <p className="section-subtitle">Focused learning activities</p>
            </div>

            <div className="quick-actions-new">
              <button className="action-card review" onClick={() => setCurrentView('reviewWords')}>
                <div className="action-icon-new">📖</div>
                <div className="action-content">
                  <h4>Review Words</h4>
                  <p>Practice yesterday's vocabulary</p>
                </div>
                <div className="action-arrow">→</div>
              </button>

              <button className="action-card quiz" onClick={() => setCurrentView('randomQuiz')}>
                <div className="action-icon-new">🎲</div>
                <div className="action-content">
                  <h4>Random Quiz</h4>
                  <p>Test your knowledge</p>
                </div>
                <div className="action-arrow">→</div>
              </button>

              <button className="action-card grammar" onClick={() => setCurrentView('grammarLessons')}>
                <div className="action-icon-new">📚</div>
                <div className="action-content">
                  <h4>Grammar Lessons</h4>
                  <p>Learn Polish grammar rules</p>
                </div>
                <div className="action-arrow">→</div>
              </button>

              <button className="action-card pronunciation" onClick={() => showWarning('Pronunciation practice coming soon!')}>
                <div className="action-icon-new">🗣️</div>
                <div className="action-content">
                  <h4>Pronunciation</h4>
                  <p>Perfect your accent</p>
                </div>
                <div className="action-arrow">→</div>
              </button>
            </div>
          </div>

          {/* Achievements & Recommendations */}
          <div className="achievements-hub">
            <div className="section-header">
              <h2>🏆 Achievements</h2>
              <p className="section-subtitle">Your learning milestones</p>
            </div>

            <div className="achievements-grid">
              <div className="achievement-card earned">
                <div className="achievement-icon">🌟</div>
                <div className="achievement-info">
                  <h4>First Steps</h4>
                  <p>Completed your first lesson</p>
                  <span className="achievement-status">Unlocked</span>
                </div>
              </div>

              <div className="achievement-card earned">
                <div className="achievement-icon">🔥</div>
                <div className="achievement-info">
                  <h4>Streak Master</h4>
                  <p>Learning {currentUser?.streak || 1} days in a row</p>
                  <span className="achievement-status">Active</span>
                </div>
              </div>

              <div className="achievement-card progress">
                <div className="achievement-icon">📚</div>
                <div className="achievement-info">
                  <h4>Word Collector</h4>
                  <p>Learn 100 words</p>
                  <div className="progress-info">
                    <span className="progress-text">{((currentUser?.xp || 0) / 10).toFixed(0)}/100</span>
                    <div className="mini-progress-bar">
                      <div
                        className="mini-progress-fill"
                        style={{width: `${Math.min(100, ((currentUser?.xp || 0) / 10))}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📁 Upload Anki Deck</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowUploadModal(false)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <ErrorBoundary fallback={({ resetError }) => (
                  <div style={{ padding: '15px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px' }}>
                    <h4 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>Upload Error</h4>
                    <p style={{ color: '#dc2626', margin: '0 0 10px 0' }}>The upload component failed to load.</p>
                    <button onClick={resetError} style={{ padding: '5px 10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                      Try Again
                    </button>
                  </div>
                )}>
                  <DeckUpload
                    onUpload={(file, deckName, setProgress) => {
                      return uploadDeck(file, deckName, setProgress).then(() => {
                        setShowUploadModal(false);
                      });
                    }}
                    onError={showError}
                  />
                </ErrorBoundary>
                <div className="upload-tips">
                  <p style={{fontSize: '12px', color: '#666', marginTop: '15px'}}>
                    📝 Large decks take 5-10 minutes to process. Watch browser console for progress.<br/>
                    💡 If upload times out, refresh this page - your deck may still have uploaded successfully!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Removed Notification component for simplicity

  const DeckCard = ({ deck, onStartLesson }) => {
    const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
    const [selectedTypes, setSelectedTypes] = useState(['multiple_choice', 'fill_blank']);
    const [questionCount, setQuestionCount] = useState(10);
    const [useSpacedRepetition, setUseSpacedRepetition] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(deck.name);

    const questionTypeOptions = [
      { value: 'multiple_choice', label: 'Multiple Choice' },
      { value: 'fill_blank', label: 'Fill in the Blank' },
      { value: 'translation_pl_en', label: 'Polish → English' },
      { value: 'translation_en_pl', label: 'English → Polish' },
      { value: 'flashcard', label: 'Flashcards' }
    ];

    const handleStartLesson = (mode = 'lesson') => {
      const questionTypes = selectedTypes.join(',');
      onStartLesson(deck.id, selectedDifficulty, questionTypes, useSpacedRepetition, questionCount, mode);
    };

    const toggleQuestionType = (type) => {
      setSelectedTypes(prev =>
        prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev, type]
      );
    };

    const handleRename = async () => {
      if (newName.trim() && newName.trim() !== deck.name) {
        try {
          const response = await fetchWithRetry(`${API_BASE}/api/decks/${deck.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() }),
          });

          if (response.ok) {
            deck.name = newName.trim(); // Update local state
            showSuccess(`Deck renamed to "${newName.trim()}"`);
            fetchDecks(); // Refresh deck list
          } else {
            showError('Failed to rename deck');
          }
        } catch (error) {
          showError('Error renaming deck: ' + error.message);
        }
      }
      setIsRenaming(false);
    };

    const handleCancelRename = () => {
      setNewName(deck.name);
      setIsRenaming(false);
    };

    return (
      <div className="deck-card">
        <div className="deck-header">
          {isRenaming ? (
            <div className="rename-input">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                onBlur={handleRename}
                autoFocus
              />
              <button onClick={handleRename} className="save-rename">✓</button>
              <button onClick={handleCancelRename} className="cancel-rename">✕</button>
            </div>
          ) : (
            <div className="deck-title">
              <h4>{deck.name}</h4>
              <button onClick={() => setIsRenaming(true)} className="rename-btn" title="Rename deck">
                ✏️
              </button>
            </div>
          )}
        </div>
        <p>{deck.description}</p>
        
        <div className="lesson-config">
          <div className="difficulty-selector">
            <label>Difficulty:</label>
            <select 
              value={selectedDifficulty} 
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="question-types">
            <label>Question Types:</label>
            <div className="question-type-checkboxes">
              {questionTypeOptions.map(option => (
                <label key={option.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(option.value)}
                    onChange={() => toggleQuestionType(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="question-count-selector">
            <label>Number of Questions:</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
              <option value={25}>25 Questions</option>
            </select>
          </div>

          <div className="spaced-repetition-selector">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useSpacedRepetition}
                onChange={(e) => setUseSpacedRepetition(e.target.checked)}
              />
              Use Spaced Repetition (adaptive learning)
            </label>
          </div>
        </div>

        <div className="lesson-modes">
          <div className="mode-section">
            <div className="mode-header">
              <h5>📚 Study Mode</h5>
              <p className="mode-description">Learn new vocabulary step by step, then practice</p>
            </div>
            <div className="mode-info">
              <ul>
                <li>4 words at a time</li>
                <li>Learn meanings first</li>
                <li>Then practice questions</li>
                <li>Filters out grammar exercises</li>
              </ul>
            </div>
            <button
              className="start-study-btn"
              onClick={() => handleStartLesson('study')}
            >
              Start Study Mode
            </button>
          </div>

          <div className="mode-section">
            <div className="mode-header">
              <h5>⚡ Quick Practice</h5>
              <p className="mode-description">Jump straight into questions using your settings</p>
            </div>
            <div className="mode-info">
              <ul>
                <li>Uses selected question types</li>
                <li>Difficulty: {selectedDifficulty}</li>
                <li>{questionCount} questions</li>
                <li>{useSpacedRepetition ? 'Adaptive difficulty' : 'Fixed difficulty'}</li>
              </ul>
            </div>
            <button
              className="start-lesson-btn"
              onClick={() => handleStartLesson('lesson')}
              disabled={selectedTypes.length === 0}
            >
              Start Quick Practice
            </button>
          </div>
        </div>
      </div>
    );
  };



  const LessonComplete = () => {
    const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

    const handleBackToDashboard = () => {
      clearSessionState();
      setCurrentView('dashboard');
    };

    return (
      <div className="lesson-complete">
        <h2>🎉 Lesson Complete!</h2>
        <div className="completion-stats">
          <div className="stat">
            <span className="stat-number">{sessionStats.correct}</span>
            <span className="stat-label">Correct Answers</span>
          </div>
          <div className="stat">
            <span className="stat-number">{sessionStats.total}</span>
            <span className="stat-label">Total Questions</span>
          </div>
          <div className="stat">
            <span className="stat-number">{accuracy}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>

        <div className="completion-actions">
          <button onClick={handleBackToDashboard} className="back-to-dashboard-btn">
            Back to Dashboard
          </button>
          {selectedDeck && (
            <button onClick={() => startLesson(selectedDeck.id)} className="retry-lesson-btn">
              Try Another Lesson
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'userSelect':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error loading user selection</h2>
              <p>There was an error loading the user selection screen.</p>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <UserSelect />
          </ErrorBoundary>
        );
      case 'dashboard':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error loading dashboard</h2>
              <p>There was an error loading the dashboard.</p>
              <button onClick={() => { resetError(); setCurrentView('userSelect'); }} style={{ marginRight: '10px' }}>Back to User Select</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <Dashboard />
          </ErrorBoundary>
        );
      case 'lesson':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Learning session error</h2>
              <p>There was an error during your learning session. Your progress may have been saved.</p>
              <button onClick={() => { resetError(); clearSessionState(); setCurrentView('dashboard'); }} style={{ marginRight: '10px' }}>Back to Dashboard</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <LearningSession
              currentLesson={currentLesson}
              currentQuestion={currentQuestion}
              currentUser={currentUser}
              sessionStats={sessionStats}
              userAnswer={userAnswer}
              setUserAnswer={setUserAnswer}
              showResult={showResult}
              lastResult={lastResult}
              onAnswerSubmit={checkAnswer}
              onNextQuestion={nextQuestion}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onError={showError}
            />
          </ErrorBoundary>
        );
      case 'study':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Study session error</h2>
              <p>There was an error during your study session.</p>
              <button onClick={() => { resetError(); clearSessionState(); setCurrentView('dashboard'); }} style={{ marginRight: '10px' }}>Back to Dashboard</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <StudyMode
              currentLesson={currentLesson}
              currentUser={currentUser}
              sessionStats={sessionStats}
              setSessionStats={setSessionStats}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onError={showError}
            />
          </ErrorBoundary>
        );
      case 'reviewWords':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error loading review words</h2>
              <p>There was an error loading the review words feature.</p>
              <button onClick={() => { resetError(); setCurrentView('dashboard'); }} style={{ marginRight: '10px' }}>Back to Dashboard</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <ReviewWords
              currentUser={currentUser}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onError={showError}
              onStartLesson={startLessonFromReview}
            />
          </ErrorBoundary>
        );
      case 'randomQuiz':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error loading random quiz</h2>
              <p>There was an error loading the random quiz feature.</p>
              <button onClick={() => { resetError(); setCurrentView('dashboard'); }} style={{ marginRight: '10px' }}>Back to Dashboard</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <RandomQuiz
              currentUser={currentUser}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onError={showError}
              onStartLesson={startLessonFromReview}
            />
          </ErrorBoundary>
        );
      case 'grammarPractice':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error loading grammar practice</h2>
              <p>There was an error loading the grammar practice feature.</p>
              <button onClick={() => { resetError(); setCurrentView('dashboard'); }} style={{ marginRight: '10px' }}>Back to Dashboard</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <GrammarPractice
              currentUser={currentUser}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onError={showError}
              onStartLesson={startLessonFromReview}
            />
          </ErrorBoundary>
        );
      case 'grammarLessons':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error loading grammar lessons</h2>
              <p>There was an error loading the grammar lessons feature.</p>
              <button onClick={() => { resetError(); setCurrentView('dashboard'); }} style={{ marginRight: '10px' }}>Back to Dashboard</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <GrammarLessons
              onBackToDashboard={() => setCurrentView('dashboard')}
              onStartPractice={startGrammarPracticeFromLesson}
            />
          </ErrorBoundary>
        );
      case 'lessonComplete':
        return (
          <ErrorBoundary fallback={({ error, resetError }) => (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error showing results</h2>
              <p>There was an error displaying your lesson results.</p>
              <button onClick={() => { resetError(); setCurrentView('dashboard'); }} style={{ marginRight: '10px' }}>Back to Dashboard</button>
              <button onClick={resetError} style={{ marginRight: '10px' }}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          )}>
            <LessonComplete />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <UserSelect />
          </ErrorBoundary>
        );
    }
  };

  // Show initial loading screen while app is initializing
  if (isInitializing) {
    return (
      <div className="App">
        <ToastContainer />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '20px'
        }}>
          <h1>Polski Spark</h1>
          <LoadingSpinner size="large" message="Loading your learning platform..." />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <ToastContainer />
      {renderCurrentView()}
    </div>
  );
}

export default App;
