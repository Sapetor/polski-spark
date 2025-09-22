# Tasks: User Progression System

**Input**: Design documents from `/specs/003-add-the-progression/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: React 19.1.1, Express 5.1.0, SQLite3, Knex.js, Jest
   → Structure: Web app (frontend/backend)
2. Load design documents:
   → data-model.md: 3 entities (UserProgression, ProgressionSession, CardDifficulty)
   → contracts/: 5 API endpoints for progression management
   → research.md: React Context, XP formulas, difficulty scoring
   → quickstart.md: 7 test scenarios for validation
3. Generate tasks by category:
   → Setup: database migrations, dependencies
   → Tests: 5 contract tests, 7 integration tests
   → Core: 3 models, progression service, 5 API endpoints
   → Frontend: React context, 4 UI components
   → Integration: difficulty calculation, card filtering
   → Polish: unit tests, performance validation
4. Task rules applied:
   → Different files = [P] for parallel execution
   → Database migrations before API implementation
   → Tests before implementation (TDD)
5. 35 tasks numbered sequentially (T001-T035)
6. Dependency graph validated
7. Parallel execution examples provided
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths use web app structure: `backend/` and `client/`

## Path Conventions
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `client/src/`, `client/tests/`
- Database migrations: `backend/migrations/`

## Phase 3.1: Setup & Database

- [ ] T001 Create database migration for user_progression table in `backend/migrations/003_create_user_progression.js`
- [ ] T002 Create database migration for progression_sessions table in `backend/migrations/004_create_progression_sessions.js`
- [ ] T003 Create database migration for card_difficulty table in `backend/migrations/005_create_card_difficulty.js`
- [ ] T004 Create database indexes migration in `backend/migrations/006_add_progression_indexes.js`
- [ ] T005 [P] Add progression calculation utilities in `backend/src/utils/progressionCalculator.js`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [ ] T006 [P] Contract test GET /api/users/{userId}/progression in `backend/tests/contract/progression-get.test.js`
- [ ] T007 [P] Contract test POST /api/users/{userId}/progression/update in `backend/tests/contract/progression-update.test.js`
- [ ] T008 [P] Contract test GET /api/decks/{deckId}/cards/by-difficulty in `backend/tests/contract/cards-difficulty.test.js`
- [ ] T009 [P] Contract test GET /api/cards/{cardId}/difficulty in `backend/tests/contract/card-difficulty.test.js`
- [ ] T010 [P] Contract test GET /api/progression/levels in `backend/tests/contract/progression-levels.test.js`

### Integration Tests (User Scenarios)
- [ ] T011 [P] Integration test new user progression initialization in `backend/tests/integration/new-user-progression.test.js`
- [ ] T012 [P] Integration test XP calculation and award in `backend/tests/integration/xp-calculation.test.js`
- [ ] T013 [P] Integration test level advancement in `backend/tests/integration/level-advancement.test.js`
- [ ] T014 [P] Integration test difficulty adjustment in `backend/tests/integration/difficulty-adjustment.test.js`
- [ ] T015 [P] Integration test streak tracking in `backend/tests/integration/streak-tracking.test.js`
- [ ] T016 [P] Integration test card difficulty filtering in `backend/tests/integration/card-filtering.test.js`
- [ ] T017 [P] Frontend progression display test in `client/src/components/__tests__/ProgressionDisplay.test.js`

## Phase 3.3: Backend Models & Services (ONLY after tests are failing)

### Database Models
- [ ] T018 [P] UserProgression model in `backend/src/models/UserProgression.js`
- [ ] T019 [P] ProgressionSession model in `backend/src/models/ProgressionSession.js`
- [ ] T020 [P] CardDifficulty model in `backend/src/models/CardDifficulty.js`

### Services
- [ ] T021 ProgressionService with XP and level calculations in `backend/src/services/ProgressionService.js`
- [ ] T022 DifficultyService for card scoring and filtering in `backend/src/services/DifficultyService.js`

### API Endpoints
- [ ] T023 GET /api/users/{userId}/progression endpoint in `backend/src/routes/progression.js`
- [ ] T024 POST /api/users/{userId}/progression/update endpoint in `backend/src/routes/progression.js`
- [ ] T025 GET /api/decks/{deckId}/cards/by-difficulty endpoint in `backend/src/routes/cards.js`
- [ ] T026 GET /api/cards/{cardId}/difficulty endpoint in `backend/src/routes/cards.js`
- [ ] T027 GET /api/progression/levels endpoint in `backend/src/routes/progression.js`

## Phase 3.4: Frontend Components

### React Context & State
- [ ] T028 ProgressionContext provider in `client/src/contexts/ProgressionContext.js`
- [ ] T029 useProgression custom hook in `client/src/hooks/useProgression.js`

### UI Components
- [ ] T030 [P] ProgressionDashboard component in `client/src/components/ProgressionDashboard.js`
- [ ] T031 [P] LevelDisplay component in `client/src/components/LevelDisplay.js`
- [ ] T032 [P] XPProgressBar component in `client/src/components/XPProgressBar.js`
- [ ] T033 [P] StreakCounter component in `client/src/components/StreakCounter.js`

## Phase 3.5: Integration & Polish

- [ ] T034 Integrate progression updates with session completion in `backend/src/middleware/sessionMiddleware.js`
- [ ] T035 Run quickstart validation scenarios and fix any issues

## Dependencies

### Critical Path
1. **Database Setup** (T001-T004) → **Models** (T018-T020) → **Services** (T021-T022) → **API Endpoints** (T023-T027)
2. **Contract Tests** (T006-T010) must fail before implementing endpoints (T023-T027)
3. **Integration Tests** (T011-T016) must fail before implementing services (T021-T022)

### Blocking Relationships
- T001-T004 block T018-T020 (models need tables)
- T018-T020 block T021-T022 (services need models)
- T021-T022 block T023-T027 (endpoints need services)
- T028-T029 block T030-T033 (components need context)
- T023-T027 block T034 (integration needs API)

### Parallel Groups
- **Migrations** (T001-T004): Can run sequentially as they're migration files
- **Contract Tests** (T006-T010): All parallel, different files
- **Integration Tests** (T011-T017): All parallel, different files
- **Models** (T018-T020): All parallel, different files
- **UI Components** (T030-T033): All parallel, different files

## Parallel Example

### Phase 3.2: All Contract Tests Together
```bash
# Launch T006-T010 together:
Task: "Contract test GET /api/users/{userId}/progression in backend/tests/contract/progression-get.test.js"
Task: "Contract test POST /api/users/{userId}/progression/update in backend/tests/contract/progression-update.test.js"
Task: "Contract test GET /api/decks/{deckId}/cards/by-difficulty in backend/tests/contract/cards-difficulty.test.js"
Task: "Contract test GET /api/cards/{cardId}/difficulty in backend/tests/contract/card-difficulty.test.js"
Task: "Contract test GET /api/progression/levels in backend/tests/contract/progression-levels.test.js"
```

### Phase 3.2: All Integration Tests Together
```bash
# Launch T011-T017 together:
Task: "Integration test new user progression initialization in backend/tests/integration/new-user-progression.test.js"
Task: "Integration test XP calculation and award in backend/tests/integration/xp-calculation.test.js"
Task: "Integration test level advancement in backend/tests/integration/level-advancement.test.js"
Task: "Integration test difficulty adjustment in backend/tests/integration/difficulty-adjustment.test.js"
Task: "Integration test streak tracking in backend/tests/integration/streak-tracking.test.js"
Task: "Integration test card difficulty filtering in backend/tests/integration/card-filtering.test.js"
Task: "Frontend progression display test in client/src/components/__tests__/ProgressionDisplay.test.js"
```

### Phase 3.3: All Models Together
```bash
# Launch T018-T020 together (after migrations complete):
Task: "UserProgression model in backend/src/models/UserProgression.js"
Task: "ProgressionSession model in backend/src/models/ProgressionSession.js"
Task: "CardDifficulty model in backend/src/models/CardDifficulty.js"
```

### Phase 3.4: All UI Components Together
```bash
# Launch T030-T033 together (after context is ready):
Task: "ProgressionDashboard component in client/src/components/ProgressionDashboard.js"
Task: "LevelDisplay component in client/src/components/LevelDisplay.js"
Task: "XPProgressBar component in client/src/components/XPProgressBar.js"
Task: "StreakCounter component in client/src/components/StreakCounter.js"
```

## Implementation Details

### Key Formulas to Implement
```javascript
// XP Calculation (T021)
const baseXP = 50;
const difficultyMultiplier = currentDifficulty / 50; // 0.0 - 2.0
const accuracyBonus = correctAnswers / totalQuestions; // 0.0 - 1.0
const sessionXP = baseXP * difficultyMultiplier * accuracyBonus;

// Level Progression (T021)
const requiredXP = level * 100;
const newLevel = Math.floor(totalXP / 100) + 1;

// Difficulty Adjustment (T022)
if (sessionAccuracy < 0.6) difficulty -= 5;
if (sessionAccuracy > 0.9) difficulty += 5;
```

### Database Schema Validation
```sql
-- T001: user_progression table
CREATE TABLE user_progression (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  current_difficulty INTEGER DEFAULT 10,
  total_sessions INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  last_session_date DATE,
  level_up_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Notes
- [P] tasks = different files, no dependencies
- Verify all tests fail before implementing
- Commit after each task completion
- Follow TDD strictly: red → green → refactor
- All progression calculations must be atomic transactions
- Frontend components should handle loading states
- Error handling required for all API endpoints

## Task Generation Rules Applied

1. **From Contracts**: 5 contract files → 5 contract test tasks [P]
2. **From Data Model**: 3 entities → 3 model creation tasks [P]
3. **From User Stories**: 7 quickstart scenarios → 7 integration tests [P]
4. **Ordering**: Setup → Tests → Models → Services → Endpoints → Frontend → Integration
5. **Dependencies**: Strict sequential for shared files, parallel for independent files

## Validation Checklist

- [x] All 5 contracts have corresponding tests (T006-T010)
- [x] All 3 entities have model tasks (T018-T020)
- [x] All tests come before implementation
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Critical path dependencies clearly defined
- [x] TDD order enforced (tests must fail first)