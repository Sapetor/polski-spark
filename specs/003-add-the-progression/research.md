# Research: User Progression System

## Research Tasks Completed

### 1. React State Management for Progression Data
**Decision**: Use React Context API for progression state management
**Rationale**:
- Built-in React solution, no additional dependencies
- Sufficient for progression data that changes moderately frequently
- Existing codebase appears to use React hooks and context patterns
- Better performance than prop drilling for deep component trees

**Alternatives considered**:
- Redux: Overkill for this feature scope, adds complexity
- Zustand: External dependency, not necessary for current scale
- Local component state: Insufficient for cross-component progression display

### 2. XP Calculation and Level Progression Algorithms
**Decision**: Linear XP scaling within levels, exponential level thresholds
**Rationale**:
- Provides consistent progression feeling within each level
- Exponential thresholds prevent level inflation at higher levels
- Formula: Level N requires (N * 100) XP to reach (100, 200, 300, 400, etc.)
- Session XP = (correctAnswers / totalQuestions) * difficultyMultiplier * baseXP

**Alternatives considered**:
- Pure linear: Too easy at higher levels, causes level inflation
- Pure exponential: Too punishing, discourages continued play
- Complex algorithms: Unnecessary complexity for MVP

### 3. Card Difficulty Scoring System
**Decision**: Multi-factor difficulty score (0-100 scale)
**Rationale**:
- Vocabulary complexity (30%): Word frequency, complexity
- Grammar concepts (40%): Grammatical difficulty level
- Sentence length (20%): Number of words, clause complexity
- Card type weight (10%): Multiple choice easier than fill-in-blank

**Alternatives considered**:
- Single-factor scoring: Too simplistic, doesn't capture full difficulty
- Manual tagging only: Not scalable, subjective
- Machine learning approach: Overkill for current needs, requires training data

### 4. Difficulty Progression Mapping
**Decision**: Level-based difficulty bands with adaptive adjustment
**Rationale**:
- Each level corresponds to difficulty range (Level 1: 0-20, Level 2: 15-35, etc.)
- 5-point overlap between levels for smooth transitions
- Performance-based micro-adjustments within level range
- Poor performance (< 60% correct) decreases difficulty by 5 points

**Alternatives considered**:
- Fixed difficulty per level: Too rigid, doesn't adapt to user performance
- Completely adaptive: Too complex, can cause difficulty spikes
- Manual difficulty selection: Puts burden on user, breaks flow

### 5. Database Schema for Progression Tracking
**Decision**: Extend existing User table + new UserProgression table
**Rationale**:
- Maintains existing user system compatibility
- UserProgression table allows detailed session tracking
- Separate progression from core user data for flexibility
- Easy to add progression analytics later

**Alternatives considered**:
- Embedded in User table: Less flexible, harder to query progression history
- NoSQL approach: Not compatible with existing SQLite setup
- Session-only tracking: Loses historical progression data

### 6. Frontend Progression Display Patterns
**Decision**: Dashboard widget + inline progress indicators
**Rationale**:
- Dashboard widget shows overview (level, XP, streak)
- Inline indicators show progress during sessions
- Progressive disclosure: summary always visible, details on demand
- Celebration animations for level ups and streak milestones

**Alternatives considered**:
- Full-screen progression page: Takes user away from core learning flow
- Minimal display only: Misses motivation opportunity
- Complex gamification: Out of scope for MVP, may overwhelm learning focus

## Implementation Priorities

1. **High Priority**: XP calculation engine, level progression logic
2. **High Priority**: Database schema and API endpoints
3. **Medium Priority**: Frontend progression display components
4. **Medium Priority**: Card difficulty scoring integration
5. **Low Priority**: Progression animations and celebrations

## Technical Dependencies Identified

- Knex.js migration for new progression tables
- React Context for progression state management
- Express routes for progression API endpoints
- Jest tests for progression calculation logic
- Integration with existing session management system

## Performance Considerations

- Cache user progression in memory during sessions
- Batch XP updates at session completion rather than per-question
- Index progression queries on user_id for fast lookup
- Lazy load detailed progression history

## Risk Mitigation

- **Risk**: Complex difficulty scoring affects performance
  **Mitigation**: Pre-calculate and cache difficulty scores during deck processing

- **Risk**: Progression state becomes out of sync between frontend/backend
  **Mitigation**: Single source of truth in backend, frontend fetches on session start

- **Risk**: Level progression becomes too slow or too fast
  **Mitigation**: Configurable progression parameters, A/B testing capability built in