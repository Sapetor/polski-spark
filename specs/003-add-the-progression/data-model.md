# Data Model: User Progression System

## Entity Overview

The progression system extends the existing data model with progression tracking and difficulty management capabilities.

## Core Entities

### 1. User (Extended)
**Purpose**: Represents a user with extended progression capabilities
**Extends**: Existing User entity

```
User {
  id: INTEGER (Primary Key)
  name: STRING
  email: STRING
  created_at: TIMESTAMP
  // Existing fields preserved
}
```

**Relationships**:
- One-to-One with UserProgression
- One-to-Many with LearningSession (existing)

**Validation Rules**:
- All existing user validation rules preserved
- Progression data is optional (backward compatibility)

### 2. UserProgression (New)
**Purpose**: Tracks user's learning progression and performance metrics

```
UserProgression {
  id: INTEGER (Primary Key)
  user_id: INTEGER (Foreign Key → User.id)
  level: INTEGER (Default: 1, Min: 1, Max: 50)
  xp: INTEGER (Default: 0, Min: 0)
  streak: INTEGER (Default: 0, Min: 0)
  current_difficulty: INTEGER (Default: 10, Range: 0-100)
  total_sessions: INTEGER (Default: 0)
  total_correct_answers: INTEGER (Default: 0)
  total_questions_answered: INTEGER (Default: 0)
  last_session_date: DATE
  level_up_date: TIMESTAMP (nullable)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Relationships**:
- One-to-One with User (user_id)
- One-to-Many with ProgressionSession

**Validation Rules**:
- level: Must be between 1 and 50
- xp: Must be non-negative, determines level
- streak: Resets to 0 if more than 24 hours between sessions
- current_difficulty: 0-100 scale, adjusted based on performance

**State Transitions**:
- XP increase → Check for level up (level * 100 XP threshold)
- Level up → Update level_up_date, may increase current_difficulty range
- Session completion → Update streak based on consecutive days

### 3. ProgressionSession (New)
**Purpose**: Tracks individual session progression data

```
ProgressionSession {
  id: INTEGER (Primary Key)
  user_id: INTEGER (Foreign Key → User.id)
  session_id: INTEGER (Foreign Key → LearningSession.id, nullable)
  session_date: DATE
  starting_difficulty: INTEGER (Range: 0-100)
  ending_difficulty: INTEGER (Range: 0-100)
  xp_earned: INTEGER (Min: 0)
  questions_answered: INTEGER (Min: 0)
  correct_answers: INTEGER (Min: 0)
  session_accuracy: DECIMAL(5,2) (Range: 0.00-100.00)
  difficulty_adjustments: INTEGER (Default: 0)
  created_at: TIMESTAMP
}
```

**Relationships**:
- Many-to-One with User (user_id)
- One-to-One with LearningSession (session_id, optional)

**Validation Rules**:
- session_accuracy: Calculated as (correct_answers / questions_answered) * 100
- ending_difficulty: May differ from starting_difficulty based on performance
- xp_earned: Based on session_accuracy and difficulty level

### 4. CardDifficulty (New)
**Purpose**: Stores pre-calculated difficulty scores for cards

```
CardDifficulty {
  id: INTEGER (Primary Key)
  card_id: INTEGER (Foreign Key → Card.id)
  vocabulary_score: INTEGER (Range: 0-30)
  grammar_score: INTEGER (Range: 0-40)
  length_score: INTEGER (Range: 0-20)
  type_score: INTEGER (Range: 0-10)
  total_difficulty: INTEGER (Range: 0-100, Calculated)
  calculated_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Relationships**:
- One-to-One with Card (card_id)

**Validation Rules**:
- total_difficulty: Sum of all component scores (auto-calculated)
- All component scores must be within their defined ranges
- Recalculated when card content changes

**Calculation Logic**:
- vocabulary_score: Based on word frequency and complexity
- grammar_score: Based on grammatical concepts used
- length_score: Based on sentence/phrase length
- type_score: Based on question type (multiple choice vs. fill-in-blank)

## Derived Data and Calculations

### Level Progression Formula
```
Required XP for Level N = N * 100
Current Level = floor(total_xp / 100) + 1
```

### XP Calculation Formula
```
Base XP per session = 50
Difficulty Multiplier = (current_difficulty / 50) // Range: 0.0 - 2.0
Accuracy Bonus = session_accuracy / 100 // Range: 0.0 - 1.0
Session XP = Base XP * Difficulty Multiplier * Accuracy Bonus
```

### Difficulty Adjustment Logic
```
Target Accuracy = 75%
If session_accuracy < 60%: difficulty -= 5
If session_accuracy > 90%: difficulty += 5
Difficulty bounds per level:
  Level 1-2: 0-25
  Level 3-5: 15-45
  Level 6-10: 35-65
  Level 11+: 55-100
```

### Streak Calculation
```
Streak increments by 1 for each consecutive day with completed session
Streak resets to 0 if gap > 24 hours between sessions
Streak bonuses at milestones: 7, 14, 30, 60 days
```

## Database Schema Changes

### New Tables Required
1. `user_progression` - Core progression tracking
2. `progression_sessions` - Session-level progression data
3. `card_difficulty` - Pre-calculated card difficulty scores

### Existing Table Extensions
No changes required to existing tables (backward compatible)

### Indexes Required
```sql
-- Performance indexes for common queries
CREATE INDEX idx_user_progression_user_id ON user_progression(user_id);
CREATE INDEX idx_progression_sessions_user_date ON progression_sessions(user_id, session_date);
CREATE INDEX idx_card_difficulty_total ON card_difficulty(total_difficulty);
CREATE INDEX idx_card_difficulty_card_id ON card_difficulty(card_id);
```

## Data Migration Strategy

### Phase 1: Schema Creation
- Create new tables with foreign key constraints
- Add indexes for performance
- Seed default progression data for existing users

### Phase 2: Historical Data Population (Optional)
- Calculate historical progression from existing session data
- Populate progression_sessions from learning_sessions
- Calculate initial difficulty scores for existing cards

### Phase 3: Data Validation
- Verify referential integrity
- Validate progression calculations
- Test difficulty scoring accuracy

## Business Rules

### Progression Rules
1. Users start at Level 1 with 0 XP
2. Level advancement is automatic based on XP thresholds
3. Difficulty adjusts within level-appropriate ranges
4. Streak tracking encourages daily engagement

### Data Consistency Rules
1. Progression data is updated atomically per session
2. Difficulty scores are cached and recalculated on content changes
3. Historical progression data is preserved for analytics
4. User can only have one active progression state

### Performance Considerations
1. Progression calculations happen at session completion, not per-question
2. Difficulty scores are pre-calculated and cached
3. Recent progression data is indexed for fast retrieval
4. Historical data can be archived after 1 year