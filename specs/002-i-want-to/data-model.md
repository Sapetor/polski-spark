# Data Model: Enhanced Front-End for Deck Upload and Learning Sessions

## Entity Definitions

### Deck Entity
**Purpose**: Represents an uploaded Anki deck with metadata and processing status

**Fields**:
- `id` (number): Unique identifier, auto-generated
- `name` (string): User-provided deck name, required, max 100 chars
- `description` (string): Auto-generated or user-provided description, optional
- `fileName` (string): Original .apkg file name for reference
- `cardCount` (number): Total number of cards in the deck
- `uploadedAt` (Date): Timestamp of successful upload
- `status` (enum): 'processing' | 'ready' | 'error'
- `errorMessage` (string): Error details if status is 'error', optional

**Relationships**:
- One deck has many Cards (1:N)
- One deck has many LearningSessions (1:N)

**Validation Rules**:
- Name must be non-empty and trimmed
- CardCount must be > 0 for ready status
- Status transitions: processing → ready|error (one-way)

### User Entity
**Purpose**: Represents a learner profile with progress tracking

**Fields**:
- `id` (number): Unique identifier, auto-generated
- `name` (string): Display name, required, max 50 chars
- `level` (number): Current learning level, starts at 1
- `xp` (number): Experience points earned, starts at 0
- `streak` (number): Consecutive days of study, starts at 0
- `createdAt` (Date): Account creation timestamp
- `lastActiveAt` (Date): Last session timestamp

**Relationships**:
- One user has many LearningSessions (1:N)
- One user has many UserProgress records (1:N)

**Validation Rules**:
- Name must be non-empty and trimmed
- Level, XP, and streak must be >= 0
- LastActiveAt updated on session start

### LearningSession Entity
**Purpose**: Represents an active or completed study session

**Fields**:
- `id` (number): Unique identifier, auto-generated
- `userId` (number): Foreign key to User
- `deckId` (number): Foreign key to Deck
- `difficulty` (enum): 'beginner' | 'intermediate' | 'advanced'
- `questionTypes` (string[]): Array of enabled question types
- `totalQuestions` (number): Total questions in session
- `currentQuestion` (number): Current question index (0-based)
- `correctAnswers` (number): Count of correct answers
- `sessionStartTime` (Date): When session began
- `sessionEndTime` (Date): When session completed, optional
- `status` (enum): 'active' | 'completed' | 'paused' | 'abandoned'
- `timeSpent` (number): Total time in milliseconds

**Relationships**:
- Belongs to one User (N:1)
- Belongs to one Deck (N:1)
- Has many QuestionResponses (1:N)

**Validation Rules**:
- CurrentQuestion must be <= totalQuestions
- CorrectAnswers must be <= totalQuestions
- TimeSpent calculated from start/end times for completed sessions
- Status transitions: active ↔ paused → completed|abandoned

### Question Entity
**Purpose**: Represents a generated question from deck content

**Fields**:
- `id` (number): Unique identifier, auto-generated
- `cardId` (number): Source card from deck
- `type` (enum): 'multiple_choice' | 'fill_blank' | 'translation_pl_en' | 'translation_en_pl' | 'flashcard'
- `difficulty` (enum): 'beginner' | 'intermediate' | 'advanced'
- `question` (string): The question text displayed to user
- `correctAnswer` (string): The correct answer for validation
- `options` (string[]): Multiple choice options, optional
- `hint` (string): Optional hint text
- `sourceText` (string): Original text for translation questions, optional
- `targetLanguage` (string): Target language for translations, optional

**Relationships**:
- Generated from one Card (N:1)
- Has many QuestionResponses (1:N)

**Validation Rules**:
- Question and correctAnswer are required
- Options required for multiple_choice type (3-4 options)
- SourceText and targetLanguage required for translation types
- Type-specific validation based on question format

### QuestionResponse Entity
**Purpose**: Tracks user responses to questions in learning sessions

**Fields**:
- `id` (number): Unique identifier, auto-generated
- `sessionId` (number): Foreign key to LearningSession
- `questionId` (number): Foreign key to Question
- `userAnswer` (string): User's submitted answer
- `isCorrect` (boolean): Whether answer was correct
- `timeTaken` (number): Time to answer in milliseconds
- `feedback` (string): Explanation provided to user
- `answeredAt` (Date): Timestamp of response

**Relationships**:
- Belongs to one LearningSession (N:1)
- Belongs to one Question (N:1)

**Validation Rules**:
- UserAnswer is required (can be empty string for unanswered)
- TimeTaken must be > 0 for answered questions
- IsCorrect determined by answer validation logic

### Card Entity
**Purpose**: Represents individual flashcard from original Anki deck

**Fields**:
- `id` (number): Unique identifier, auto-generated
- `deckId` (number): Foreign key to Deck
- `frontText` (string): Front side of card (question/prompt)
- `backText` (string): Back side of card (answer/definition)
- `tags` (string[]): Tags from original Anki card, optional
- `difficulty` (enum): Inferred difficulty level
- `createdAt` (Date): When card was imported

**Relationships**:
- Belongs to one Deck (N:1)
- Generates many Questions (1:N)

**Validation Rules**:
- FrontText and backText are required
- Tags array can be empty but not null
- Difficulty inferred from text complexity or assigned randomly

## State Transitions

### Deck Status Flow
```
[Upload Started] → processing
processing → ready (successful import)
processing → error (import failed)
error → processing (retry upload)
```

### Learning Session Flow
```
[Session Created] → active
active → paused (user pauses)
paused → active (user resumes)
active → completed (all questions answered)
active → abandoned (user leaves without completing)
```

### Question Response Flow
```
[Question Displayed] → [awaiting response]
[awaiting response] → [answered] (user submits)
[answered] → [feedback shown] (immediate validation)
```

## Data Relationships Summary

```
User (1) ←→ (N) LearningSession (N) → (1) Deck
                     ↓ (1)
                     ↓
                (N) QuestionResponse (N) → (1) Question
                                                ↑ (N)
                                                ↓ (1)
                                             Card (N) → (1) Deck
```

## Performance Considerations

### Indexing Strategy
- Primary keys on all entities (auto-indexed)
- Foreign key indexes: userId, deckId, sessionId, questionId, cardId
- Composite index on (userId, deckId) for user's deck access
- Index on sessionStartTime for recent sessions query

### Data Volume Estimates
- Users: 100-1000 (single user focused initially)
- Decks: 10-50 per user
- Cards: 100-5000 per deck
- Questions: 3-5x cards (multiple question types per card)
- Sessions: 10-100 per user per deck
- Responses: 10-50 per session

### Query Optimization
- Lazy load cards when generating questions
- Paginate question loading in sessions
- Cache deck metadata for dashboard display
- Batch insert question responses for performance

## Validation Summary

Each entity includes comprehensive validation rules to ensure data integrity and user experience quality. State transitions are clearly defined to prevent invalid data states. The model supports the full feature requirements while maintaining performance for the expected data volumes.