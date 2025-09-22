# Quickstart: User Progression System Testing

## Overview

This quickstart guide validates the user progression system implementation through comprehensive testing scenarios. It covers progression display, XP calculation, level advancement, and difficulty adjustment.

## Prerequisites

- Polski Spark development environment running
- Test database with sample users and decks
- Both frontend (React) and backend (Express) servers running

## Test Scenarios

### Scenario 1: New User Progression Initialization
**Objective**: Verify new users start with correct default progression values

**Steps**:
1. Create a new user account
2. Navigate to user dashboard/profile
3. Verify initial progression display

**Expected Results**:
- Level: 1
- XP: 0
- Streak: 0
- Current Difficulty: 10
- Progress bar shows 0% to next level

**API Validation**:
```bash
curl -X GET http://localhost:3000/api/users/{userId}/progression
```
Expected response matches UserProgression schema with default values.

---

### Scenario 2: XP Calculation and Award
**Objective**: Verify XP is correctly calculated and awarded after session completion

**Setup**:
- User at Level 1 (0 XP)
- Complete a session with known parameters

**Test Cases**:

**Case 2a: Perfect Session**
- Questions answered: 10
- Correct answers: 10 (100% accuracy)
- Session difficulty: 20
- Expected XP: 50 * (20/50) * 1.0 = 20 XP

**Case 2b: Average Session**
- Questions answered: 10
- Correct answers: 7 (70% accuracy)
- Session difficulty: 30
- Expected XP: 50 * (30/50) * 0.7 = 21 XP

**Case 2c: Poor Session**
- Questions answered: 10
- Correct answers: 4 (40% accuracy)
- Session difficulty: 10
- Expected XP: 50 * (10/50) * 0.4 = 4 XP

**Validation Steps**:
1. Complete each session type
2. Check XP update in UI
3. Verify calculation via API call

---

### Scenario 3: Level Advancement
**Objective**: Verify level progression works correctly at XP thresholds

**Setup**:
- User with 95 XP (Level 1, near threshold)
- Complete session earning 10+ XP

**Steps**:
1. Record current progression state
2. Complete session to cross 100 XP threshold
3. Observe level advancement

**Expected Results**:
- Level increases from 1 to 2
- XP continues to accumulate (e.g., 105 XP at Level 2)
- Level-up celebration/notification appears
- Difficulty range updates to Level 2 range (15-45)

**API Validation**:
```bash
curl -X POST http://localhost:3000/api/users/{userId}/progression/update \
  -H "Content-Type: application/json" \
  -d '{
    "questionsAnswered": 10,
    "correctAnswers": 8,
    "sessionDuration": 300,
    "startingDifficulty": 20
  }'
```

---

### Scenario 4: Difficulty Adjustment
**Objective**: Verify difficulty adjusts based on performance

**Test Cases**:

**Case 4a: Difficulty Decrease (Poor Performance)**
- Starting difficulty: 30
- Session accuracy: 50% (below 60% threshold)
- Expected: Difficulty decreases by 5 to 25

**Case 4b: Difficulty Increase (Excellent Performance)**
- Starting difficulty: 30
- Session accuracy: 95% (above 90% threshold)
- Expected: Difficulty increases by 5 to 35

**Case 4c: Difficulty Bounds Respect**
- Level 1 user with difficulty 20
- Excellent performance
- Expected: Difficulty increases but stays within Level 1 bounds (0-25)

**Validation**:
1. Complete sessions with specified accuracy
2. Check difficulty update in progression data
3. Verify next session uses adjusted difficulty

---

### Scenario 5: Streak Tracking
**Objective**: Verify streak counting and reset logic

**Test Cases**:

**Case 5a: Streak Increment**
- Complete session today
- Check streak increases by 1
- Complete session tomorrow (within 24 hours)
- Verify streak increases again

**Case 5b: Streak Reset**
- Have existing streak of 5 days
- Skip sessions for 25+ hours
- Complete next session
- Verify streak resets to 1

**Case 5c: Streak Milestones**
- Build streak to 7 days
- Verify milestone celebration
- Continue to 14, 30 days for additional milestones

---

### Scenario 6: Card Difficulty Filtering
**Objective**: Verify cards are filtered by appropriate difficulty levels

**Setup**:
- Deck with cards of varying difficulties (0-100 range)
- User at Level 3 (difficulty range 15-45)

**Steps**:
1. Start learning session
2. Monitor cards presented
3. Verify all cards fall within difficulty range

**API Validation**:
```bash
curl -X GET "http://localhost:3000/api/decks/{deckId}/cards/by-difficulty?minDifficulty=15&maxDifficulty=45&limit=20"
```

**Expected Results**:
- All returned cards have difficulty scores between 15-45
- Cards are varied but appropriate for user level
- No cards below minimum or above maximum difficulty

---

### Scenario 7: Frontend Progression Display
**Objective**: Verify UI correctly displays progression information

**Components to Test**:

**Dashboard Widget**:
- Level display with clear numbering
- XP progress bar with current/required XP
- Streak counter with days
- Visual level progression indicator

**Session Interface**:
- Current level visible during practice
- XP earning feedback after correct answers
- Difficulty indicator (optional)

**Level-up Celebrations**:
- Animation or notification on level advancement
- Updated progression display after level-up
- Streak milestone celebrations

**Visual Tests**:
1. Navigate through UI with different progression states
2. Complete sessions and observe real-time updates
3. Trigger level-ups and streak milestones
4. Verify all numbers match backend data

---

## Performance Benchmarks

### Response Time Requirements
- GET /api/users/{userId}/progression: < 200ms
- POST /api/progression/update: < 500ms
- GET /api/cards/by-difficulty: < 300ms

### Load Testing
- Simulate 50 concurrent progression updates
- Verify no data corruption or race conditions
- Test progression calculations under load

### Database Performance
- Progression queries should use indexes effectively
- Large progression history should not slow current data retrieval

---

## Integration Tests

### End-to-End User Journey
1. New user creates account
2. Completes multiple learning sessions
3. Advances through 3+ levels
4. Maintains 7+ day streak
5. Experiences difficulty adjustments

**Success Criteria**:
- Smooth progression without errors
- Accurate calculations throughout journey
- Responsive UI updates
- Consistent data between frontend/backend

### Error Handling Tests
- Invalid session data submission
- Network failures during progression updates
- Database unavailability scenarios
- Concurrent progression updates

---

## Data Validation Checks

### Progression Data Integrity
```sql
-- Verify XP and level consistency
SELECT user_id, level, xp, (level * 100) as expected_min_xp
FROM user_progression
WHERE xp < ((level - 1) * 100) OR xp >= (level * 100);

-- Check difficulty bounds per level
SELECT user_id, level, current_difficulty
FROM user_progression
WHERE (level <= 2 AND current_difficulty > 25)
   OR (level BETWEEN 3 AND 5 AND current_difficulty > 45)
   OR (level BETWEEN 6 AND 10 AND current_difficulty > 65);
```

### Session Data Consistency
```sql
-- Verify session accuracy calculations
SELECT id, correct_answers, questions_answered, session_accuracy,
       (correct_answers * 100.0 / questions_answered) as calculated_accuracy
FROM progression_sessions
WHERE ABS(session_accuracy - (correct_answers * 100.0 / questions_answered)) > 0.01;
```

---

## Rollback and Recovery Testing

### Data Migration Rollback
- Test rollback of progression table creation
- Verify system works without progression data
- Test re-migration after rollback

### User Data Recovery
- Simulate progression data corruption
- Test recovery from session history
- Verify recalculation accuracy

---

## Success Criteria

### Functional Requirements Met
- [ ] All progression data displays correctly
- [ ] XP calculations are accurate
- [ ] Level advancement works at thresholds
- [ ] Difficulty adjustments respond to performance
- [ ] Streak tracking handles daily patterns
- [ ] Card filtering respects difficulty ranges

### Performance Requirements Met
- [ ] All API responses under target times
- [ ] UI updates are smooth and responsive
- [ ] No performance degradation with progression data

### User Experience Requirements Met
- [ ] Progression provides clear motivation
- [ ] Difficulty feels appropriately challenging
- [ ] Level-ups feel rewarding
- [ ] Streak encourages daily practice

### Technical Requirements Met
- [ ] Backward compatibility maintained
- [ ] Database performance optimized
- [ ] Error handling comprehensive
- [ ] Integration tests pass

## Cleanup

After testing completion:
1. Reset test user progression data if needed
2. Clear test session data
3. Verify production readiness
4. Document any configuration needed for deployment