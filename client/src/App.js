import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:3001';

function App() {
  const [currentView, setCurrentView] = useState('userSelect');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [questionStartTime, setQuestionStartTime] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchDecks();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDecks = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/decks`);
      const data = await response.json();
      setDecks(data);
    } catch (error) {
      console.error('Error fetching decks:', error);
    }
  };

  const fetchCards = async (deckId) => {
    try {
      const response = await fetch(`${API_BASE}/api/decks/${deckId}/cards`);
      const data = await response.json();
      setCards(data);
      setCurrentCard(0);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const createUser = async (name) => {
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const newUser = await response.json();
      setUsers([...users, newUser]);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const uploadDeck = async (file, deckName) => {
    try {
      const formData = new FormData();
      formData.append('ankiDeck', file);
      formData.append('deckName', deckName);

      const response = await fetch(`${API_BASE}/upload-anki`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        fetchDecks();
        alert('Deck uploaded successfully!');
      } else {
        alert('Error uploading deck');
      }
    } catch (error) {
      console.error('Error uploading deck:', error);
      alert('Error uploading deck');
    }
  };

  const startLesson = async (deckId, difficulty = 'beginner', questionTypes = 'multiple_choice,fill_blank,translation_pl_en', useSpacedRepetition = true) => {
    try {
      const userId = currentUser?.id;
      const spacedRepParam = userId && useSpacedRepetition ? '&useSpacedRepetition=true' : '';
      const userIdParam = userId ? `&userId=${userId}` : '';
      
      const response = await fetch(`${API_BASE}/api/decks/${deckId}/lesson?difficulty=${difficulty}&questionTypes=${questionTypes}&count=10${userIdParam}${spacedRepParam}`);
      const lessonData = await response.json();
      
      if (response.ok) {
        setCurrentLesson(lessonData);
        setCurrentQuestion(0);
        setUserAnswer('');
        setShowResult(false);
        setSessionStats({ correct: 0, total: 0 });
        setQuestionStartTime(Date.now());
        setCurrentView('lesson');
      } else {
        alert('Error starting lesson: ' + lessonData.error);
      }
    } catch (error) {
      console.error('Error starting lesson:', error);
      alert('Error starting lesson');
    }
  };

  const checkAnswer = async (answer) => {
    if (!currentLesson || !currentUser) return;
    
    const question = currentLesson.questions[currentQuestion];
    const timeTaken = questionStartTime ? Date.now() - questionStartTime : null;
    
    try {
      const response = await fetch(`${API_BASE}/api/check-answer`, {
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
      
      const result = await response.json();
      setLastResult(result);
      setShowResult(true);
      
      // Update session stats
      setSessionStats(prev => ({
        correct: prev.correct + (result.correct ? 1 : 0),
        total: prev.total + 1
      }));
      
    } catch (error) {
      console.error('Error checking answer:', error);
      alert('Error checking answer');
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
      // Lesson complete
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
          {users.map(user => (
            <button 
              key={user.id} 
              onClick={() => handleUserSelect(user)}
              className="user-button"
            >
              {user.name} (Level {user.level}, XP: {user.xp})
            </button>
          ))}
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
    return (
      <div className="dashboard">
        <div className="user-info">
          <h2>Welcome, {currentUser?.name}!</h2>
          <p>Level: {currentUser?.level} | XP: {currentUser?.xp} | Streak: {currentUser?.streak}</p>
          <button onClick={() => setCurrentView('userSelect')}>Switch User</button>
        </div>

        <div className="admin-section">
          <h3>Admin: Upload Anki Deck</h3>
          <DeckUpload onUpload={uploadDeck} />
        </div>

        <div className="decks-section">
          <h3>Available Decks</h3>
          {decks.map(deck => (
            <DeckCard key={deck.id} deck={deck} onStartLesson={startLesson} />
          ))}
        </div>
      </div>
    );
  };

  const DeckUpload = ({ onUpload }) => {
    const [file, setFile] = useState(null);
    const [deckName, setDeckName] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (file && deckName) {
        onUpload(file, deckName);
        setFile(null);
        setDeckName('');
      }
    };

    return (
      <form onSubmit={handleSubmit} className="deck-upload">
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="Deck name"
          required
          dir="ltr"
          style={{ direction: 'ltr', textAlign: 'left' }}
        />
        <input
          type="file"
          accept=".apkg"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <button type="submit">Upload Deck</button>
      </form>
    );
  };

  const DeckCard = ({ deck, onStartLesson }) => {
    const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
    const [selectedTypes, setSelectedTypes] = useState(['multiple_choice', 'fill_blank']);

    const questionTypeOptions = [
      { value: 'multiple_choice', label: 'Multiple Choice' },
      { value: 'fill_blank', label: 'Fill in the Blank' },
      { value: 'translation_pl_en', label: 'Polish → English' },
      { value: 'translation_en_pl', label: 'English → Polish' },
      { value: 'flashcard', label: 'Flashcards' }
    ];

    const handleStartLesson = () => {
      const questionTypes = selectedTypes.join(',');
      onStartLesson(deck.id, selectedDifficulty, questionTypes);
    };

    const toggleQuestionType = (type) => {
      setSelectedTypes(prev => 
        prev.includes(type) 
          ? prev.filter(t => t !== type)
          : [...prev, type]
      );
    };

    return (
      <div className="deck-card">
        <h4>{deck.name}</h4>
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
        </div>

        <button 
          className="start-lesson-btn"
          onClick={handleStartLesson}
          disabled={selectedTypes.length === 0}
        >
          Start Learning ({selectedDifficulty})
        </button>
      </div>
    );
  };

  const Lesson = () => {
    if (!currentLesson || !currentLesson.questions.length) {
      return <div>No questions available for this lesson.</div>;
    }

    const question = currentLesson.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / currentLesson.questions.length) * 100;

    return (
      <div className="lesson">
        <div className="lesson-header">
          <button onClick={() => setCurrentView('dashboard')}>← Back to Dashboard</button>
          <div className="lesson-info">
            <h2>Learning Session</h2>
            <p>Question {currentQuestion + 1} of {currentLesson.questions.length}</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="session-stats">
            <span>Correct: {sessionStats.correct}/{sessionStats.total}</span>
            {sessionStats.total > 0 && (
              <span>Accuracy: {Math.round((sessionStats.correct / sessionStats.total) * 100)}%</span>
            )}
          </div>
        </div>

        <div className="question-content">
          <QuestionRenderer 
            question={question}
            userAnswer={userAnswer}
            setUserAnswer={setUserAnswer}
            onSubmit={checkAnswer}
            showResult={showResult}
            result={lastResult}
            onNext={nextQuestion}
          />
        </div>
      </div>
    );
  };

  const QuestionRenderer = ({ question, userAnswer, setUserAnswer, onSubmit, showResult, result, onNext }) => {
    const handleSubmit = (answer) => {
      onSubmit(answer || userAnswer);
    };

    const renderQuestionContent = () => {
      switch (question.type) {
        case 'multiple_choice':
          return (
            <MultipleChoiceQuestion 
              question={question}
              onSelect={handleSubmit}
              disabled={showResult}
            />
          );
        
        case 'fill_blank':
          return (
            <FillBlankQuestion 
              question={question}
              userAnswer={userAnswer}
              setUserAnswer={setUserAnswer}
              onSubmit={() => handleSubmit()}
              disabled={showResult}
            />
          );
        
        case 'translation_pl_en':
        case 'translation_en_pl':
          return (
            <TranslationQuestion 
              question={question}
              userAnswer={userAnswer}
              setUserAnswer={setUserAnswer}
              onSubmit={() => handleSubmit()}
              disabled={showResult}
            />
          );
        
        case 'flashcard':
        default:
          return (
            <FlashcardQuestion 
              question={question}
              onNext={onNext}
            />
          );
      }
    };

    return (
      <div className="question-renderer">
        <div className="question-header">
          <span className="question-type">{question.type.replace('_', ' ').toUpperCase()}</span>
          {question.difficulty && <span className="difficulty">{question.difficulty}</span>}
        </div>
        
        {renderQuestionContent()}
        
        {showResult && result && (
          <div className={`result-feedback ${result.correct ? 'correct' : 'incorrect'}`}>
            <h3>{result.correct ? '✅ Correct!' : '❌ Incorrect'}</h3>
            <p>{result.feedback}</p>
            {result.spacedRepetition && (
              <div className="spaced-repetition-info">
                <small>
                  📚 Mastery: {result.spacedRepetition.masteryLevel} | 
                  Next review: {new Date(result.spacedRepetition.nextReview).toLocaleDateString()}
                  {result.spacedRepetition.interval > 1 && ` (${result.spacedRepetition.interval} days)`}
                </small>
              </div>
            )}
            <button onClick={onNext} className="next-question-btn">
              {currentQuestion + 1 < currentLesson.questions.length ? 'Next Question' : 'Finish Lesson'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const MultipleChoiceQuestion = ({ question, onSelect, disabled }) => {
    return (
      <div className="multiple-choice-question">
        <h3 className="question-text">{question.question}</h3>
        <div className="options">
          {question.options.map((option, index) => (
            <button
              key={index}
              className="option-button"
              onClick={() => onSelect(option)}
              disabled={disabled}
            >
              {String.fromCharCode(65 + index)}. {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const FillBlankQuestion = ({ question, userAnswer, setUserAnswer, onSubmit, disabled }) => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !disabled) {
        onSubmit();
      }
    };

    return (
      <div className="fill-blank-question">
        <h3 className="question-text">{question.question}</h3>
        {question.hint && <p className="hint">💡 {question.hint}</p>}
        <div className="answer-input">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer..."
            disabled={disabled}
            autoFocus
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          <button onClick={onSubmit} disabled={disabled || !userAnswer.trim()}>
            Submit
          </button>
        </div>
      </div>
    );
  };

  const TranslationQuestion = ({ question, userAnswer, setUserAnswer, onSubmit, disabled }) => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !disabled) {
        onSubmit();
      }
    };

    return (
      <div className="translation-question">
        <h3 className="question-text">{question.question}</h3>
        <div className="source-text">{question.sourceText}</div>
        <div className="answer-input">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Enter your ${question.targetLanguage} translation...`}
            disabled={disabled}
            autoFocus
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          <button onClick={onSubmit} disabled={disabled || !userAnswer.trim()}>
            Submit Translation
          </button>
        </div>
      </div>
    );
  };

  const FlashcardQuestion = ({ question, onNext }) => {
    const [showAnswer, setShowAnswer] = useState(false);

    return (
      <div className="flashcard-question">
        <div className="flashcard">
          <h3 className="question-text">{question.question}</h3>
          {showAnswer && (
            <div className="answer-text">
              <h4>Answer:</h4>
              <p>{question.answer}</p>
            </div>
          )}
        </div>
        <div className="flashcard-controls">
          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)} className="show-answer-btn">
              Show Answer
            </button>
          ) : (
            <button onClick={onNext} className="next-btn">
              Next Card
            </button>
          )}
        </div>
      </div>
    );
  };

  const LessonComplete = () => {
    const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    
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
          <button onClick={() => setCurrentView('dashboard')} className="back-to-dashboard-btn">
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
        return <UserSelect />;
      case 'dashboard':
        return <Dashboard />;
      case 'lesson':
        return <Lesson />;
      case 'lessonComplete':
        return <LessonComplete />;
      default:
        return <UserSelect />;
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

export default App;
