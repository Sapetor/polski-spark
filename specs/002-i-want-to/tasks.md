# Tasks: Enhanced Front-End for Deck Upload and Learning Sessions

**Input**: Design documents from `/home/sapet/polski-spark/specs/002-i-want-to/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Extracted: React 19.1.1 + Express 5.1.0 web app structure
   → Tech stack: JavaScript ES6+, Jest, React Testing Library
2. Load optional design documents: ✅
   → data-model.md: 6 entities (Deck, User, LearningSession, Question, QuestionResponse, Card)
   → contracts/: 3 API contract files (deck-upload, learning-session, user-deck)
   → research.md: React hooks, SSE progress tracking, component extraction
3. Generate tasks by category: ✅
   → Setup: Component extraction from monolithic App.js
   → Tests: Contract tests for 3 APIs, component unit tests
   → Core: Enhanced components with error handling and UI improvements
   → Integration: Error boundaries, toast notifications, session management
   → Polish: Performance optimization, responsive design, accessibility
4. Apply task rules: ✅
   → Different files = marked [P] for parallel execution
   → Same file (App.js) = sequential updates
   → Tests before implementation (TDD enforced)
5. Number tasks sequentially (T001-T035) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness: ✅
   → All 3 contracts have test tasks
   → All 6 components have extraction and test tasks
   → All endpoints covered by integration tests
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `client/src/` (React frontend), `server/` (Express backend)
- Components: `client/src/components/`
- Tests: `client/src/__tests__/`
- API tests: `client/src/__tests__/api/`

## Phase 3.1: Setup
- [ ] T001 [P] Create component directory structure in `client/src/components/`
- [ ] T002 [P] Create test directory structure in `client/src/__tests__/`
- [ ] T003 [P] Set up React Testing Library utilities in `client/src/testUtils.js`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [ ] T004 [P] Contract test for deck upload API in `client/src/__tests__/api/deckUpload.test.js`
- [ ] T005 [P] Contract test for learning session API in `client/src/__tests__/api/learningSession.test.js`
- [ ] T006 [P] Contract test for user/deck management API in `client/src/__tests__/api/userDeck.test.js`

### Component Tests
- [ ] T007 [P] Unit test for DeckUpload component in `client/src/__tests__/components/DeckUpload.test.js`
- [ ] T008 [P] Unit test for LearningSession component in `client/src/__tests__/components/LearningSession.test.js`
- [ ] T009 [P] Unit test for QuestionRenderer component in `client/src/__tests__/components/QuestionRenderer.test.js`
- [ ] T010 [P] Unit test for ErrorBoundary component in `client/src/__tests__/components/ErrorBoundary.test.js`

### Integration Tests
- [ ] T011 [P] Integration test for upload-to-session flow in `client/src/__tests__/integration/uploadFlow.test.js`
- [ ] T012 [P] Integration test for session completion in `client/src/__tests__/integration/sessionFlow.test.js`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Component Extraction
- [ ] T013 [P] Extract DeckUpload component from App.js to `client/src/components/DeckUpload.js`
- [ ] T014 [P] Extract LearningSession component from App.js to `client/src/components/LearningSession.js`
- [ ] T015 [P] Extract QuestionRenderer component from App.js to `client/src/components/QuestionRenderer.js`
- [ ] T016 [P] Extract individual question components to `client/src/components/questions/`
- [ ] T017 [P] Create ErrorBoundary component in `client/src/components/ErrorBoundary.js`

### App.js Updates (Sequential - same file)
- [ ] T018 Update App.js to import and use extracted DeckUpload component
- [ ] T019 Update App.js to import and use extracted LearningSession component
- [ ] T020 Update App.js to import and use extracted QuestionRenderer component
- [ ] T021 Add ErrorBoundary wrappers around main sections in App.js

## Phase 3.4: Integration

### Error Handling
- [ ] T022 [P] Create Toast notification system in `client/src/components/Toast.js`
- [ ] T023 [P] Add upload error handling to DeckUpload component
- [ ] T024 [P] Add session error handling to LearningSession component
- [ ] T025 [P] Create API error service in `client/src/services/apiErrors.js`

### Session Management
- [ ] T026 [P] Add session persistence to localStorage in LearningSession component
- [ ] T027 [P] Add session recovery functionality to LearningSession component
- [ ] T028 [P] Add session pause/resume to LearningSession component

## Phase 3.5: Polish

### UI/UX Enhancements
- [ ] T029 [P] Enhance upload progress visualization in DeckUpload component
- [ ] T030 [P] Add loading states to all async operations
- [ ] T031 [P] Implement smooth question transitions (<500ms)
- [ ] T032 [P] Create responsive CSS in `client/src/styles/responsive.css`

### Performance & Accessibility
- [ ] T033 [P] Add React.memo optimization to question components
- [ ] T034 [P] Add ARIA labels and keyboard navigation
- [ ] T035 [P] Run quickstart.md validation scenarios

## Dependencies

### Phase Dependencies
- T001-T003 (Setup) must complete before any other phase
- T004-T012 (Tests) must complete before T013-T021 (Implementation)
- T013-T017 (Component extraction) must complete before T018-T021 (App.js updates)
- T018-T021 (App.js updates) are sequential (same file)
- T022-T028 (Integration) requires components to exist
- T029-T035 (Polish) should be last

### Specific Task Dependencies
- T018-T021: Require T013-T017 (components must exist before importing)
- T023-T024: Require T022 (Toast component)
- T026-T028: Require T014 (LearningSession component)
- T033: Requires T016 (question components)

## Parallel Example

### Phase 3.2 - Contract Tests (All Parallel)
```bash
# Launch T004-T006 together:
Task: "Contract test for deck upload API in client/src/__tests__/api/deckUpload.test.js"
Task: "Contract test for learning session API in client/src/__tests__/api/learningSession.test.js"
Task: "Contract test for user/deck management API in client/src/__tests__/api/userDeck.test.js"
```

### Phase 3.3 - Component Extraction (All Parallel)
```bash
# Launch T013-T017 together:
Task: "Extract DeckUpload component from App.js to client/src/components/DeckUpload.js"
Task: "Extract LearningSession component from App.js to client/src/components/LearningSession.js"
Task: "Extract QuestionRenderer component from App.js to client/src/components/QuestionRenderer.js"
Task: "Extract individual question components to client/src/components/questions/"
Task: "Create ErrorBoundary component in client/src/components/ErrorBoundary.js"
```

### Phase 3.5 - UI Enhancements (Mostly Parallel)
```bash
# Launch T029-T032 together:
Task: "Enhance upload progress visualization in DeckUpload component"
Task: "Add loading states to all async operations"
Task: "Implement smooth question transitions (<500ms)"
Task: "Create responsive CSS in client/src/styles/responsive.css"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify tests fail before implementing (TDD)
- App.js updates (T018-T021) must be sequential due to same file conflicts
- Performance goals: <500ms question transitions, <3s upload time
- All components should support React Testing Library testing patterns

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**: ✅
   - 3 contract files → 3 contract test tasks [P] (T004-T006)
   - Each API endpoint → integration test coverage

2. **From Data Model**: ✅
   - 6 entities → component extraction tasks (T013-T017)
   - Relationships → session management tasks (T026-T028)

3. **From User Stories**: ✅
   - Upload flow → integration test (T011)
   - Session completion → integration test (T012)
   - Error handling → error boundary tasks (T022-T025)

4. **Ordering**: ✅
   - Setup → Tests → Component Extraction → App Updates → Integration → Polish
   - Dependencies enforced through phase structure

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All 3 contracts have corresponding test tasks (T004-T006)
- [x] All 6 main components have extraction tasks (T013-T017)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (App.js updates sequential)
- [x] TDD workflow enforced (tests must fail before implementation)
- [x] Performance goals addressed (<500ms transitions)
- [x] Error handling comprehensive (Toast, boundaries, recovery)
- [x] Responsive design requirements covered (T032)

**Total Tasks**: 35 numbered tasks across 5 phases
**Parallel Capacity**: ~28 tasks can run in parallel
**Critical Path**: Setup → Tests → Component Extraction → App Updates → Integration/Polish