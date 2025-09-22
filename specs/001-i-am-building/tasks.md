# Tasks: Duolingo-like Language Learning App with Anki Deck Integration

**Input**: Design documents from `/home/sapet/polski-spark/specs/001-i-am-building/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Node.js, React 19.1.1, Express 5.1.0, SQLite, Knex.js
   → Structure: Web app with client/ and server/ directories
2. Load optional design documents:
   → data-model.md: 3 entities (extended decks, cards, new anki_imports)
   → contracts/: 2 files → 5 endpoints total
   → research.md: Jest testing framework, AdmZip parsing decisions
3. Generate tasks by category:
   → Setup: Jest framework, database migration
   → Tests: 5 contract tests, 4 integration tests
   → Core: database schema, Anki parsing utilities, API endpoints
   → Integration: file upload validation, question generation
   → Polish: performance tests, error handling refinement
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness: ✅ All contracts tested, entities modeled, endpoints implemented
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `server/` for backend, `client/src/` for frontend
- Database migrations in `server/migrations/`
- Tests in `server/tests/` (new directory)

## Phase 3.1: Setup
- [ ] **T001** Add Jest testing framework to server/package.json and configure test scripts
- [ ] **T002** Create server/tests/ directory structure with contract/, integration/, and unit/ subdirectories
- [ ] **T003** [P] Create database migration for Anki integration schema in server/migrations/20250917000002_add_anki_integration.js

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [ ] **T004** [P] Contract test POST /api/upload-anki in server/tests/contract/test_anki_upload.js
- [ ] **T005** [P] Contract test GET /api/anki-imports in server/tests/contract/test_anki_imports_list.js
- [ ] **T006** [P] Contract test GET /api/anki-imports/{id} in server/tests/contract/test_anki_imports_detail.js
- [ ] **T007** [P] Contract test GET /api/decks/{id} (enhanced) in server/tests/contract/test_decks_enhanced.js
- [ ] **T008** [P] Contract test GET /api/decks/{id}/cards (enhanced) in server/tests/contract/test_deck_cards_enhanced.js

### Integration Tests
- [ ] **T009** [P] Integration test: Basic Anki import scenario in server/tests/integration/test_basic_anki_import.js
- [ ] **T010** [P] Integration test: Question generation from Anki cards in server/tests/integration/test_anki_question_generation.js
- [ ] **T011** [P] Integration test: Error handling for invalid files in server/tests/integration/test_anki_error_handling.js
- [ ] **T012** [P] Integration test: Large file import performance in server/tests/integration/test_large_anki_import.js

## Phase 3.3: Database Schema (ONLY after tests are failing)
- [ ] **T013** Create anki_imports table schema in migration file with all required fields
- [ ] **T014** Add Anki metadata columns to existing decks table in migration file
- [ ] **T015** Add Anki fields to existing cards table in migration file
- [ ] **T016** Run database migration and verify schema changes

## Phase 3.4: Core Implementation - Anki Parsing
- [ ] **T017** [P] Create Anki file validation utility in server/utils/ankiValidator.js
- [ ] **T018** [P] Create Anki parsing utility in server/utils/ankiParser.js using AdmZip
- [ ] **T019** [P] Create import tracking service in server/utils/importTracker.js
- [ ] **T020** Enhance existing questionGenerator.js to work with Anki card metadata

## Phase 3.5: API Implementation
- [ ] **T021** Enhance POST /api/upload-anki endpoint in server/index.js with validation and import tracking
- [ ] **T022** Implement GET /api/anki-imports endpoint in server/index.js for import history
- [ ] **T023** Implement GET /api/anki-imports/{id} endpoint in server/index.js for import details
- [ ] **T024** Enhance GET /api/decks/{id} endpoint in server/index.js with Anki metadata
- [ ] **T025** Enhance GET /api/decks/{id}/cards endpoint in server/index.js with Anki data option

## Phase 3.6: Frontend Integration
- [ ] **T026** [P] Add import status indicator to existing upload interface in client/src/App.js
- [ ] **T027** [P] Add Anki metadata display to deck view in client/src/App.js
- [ ] **T028** [P] Enhance error handling for import failures in client/src/App.js

## Phase 3.7: Integration & Data Flow
- [ ] **T029** Connect Anki import process to existing card classification system
- [ ] **T030** Integrate imported cards with existing spaced repetition algorithm
- [ ] **T031** Add comprehensive error logging for import process failures
- [ ] **T032** Implement file cleanup for successful and failed imports

## Phase 3.8: Polish & Performance
- [ ] **T033** [P] Add unit tests for ankiValidator.js in server/tests/unit/test_anki_validator.js
- [ ] **T034** [P] Add unit tests for ankiParser.js in server/tests/unit/test_anki_parser.js
- [ ] **T035** [P] Add unit tests for importTracker.js in server/tests/unit/test_import_tracker.js
- [ ] **T036** Performance optimization for large deck imports (streaming, batch processing)
- [ ] **T037** Add progress tracking for import process
- [ ] **T038** Implement rollback mechanism for failed imports
- [ ] **T039** Execute quickstart.md validation scenarios
- [ ] **T040** Update CLAUDE.md documentation with new Anki features

## Dependencies
- **Setup phase** (T001-T003) before everything else
- **Tests** (T004-T012) before implementation (T013+)
- **Database schema** (T013-T016) before API implementation (T021-T025)
- **Core utilities** (T017-T020) before API implementation (T021-T025)
- **API implementation** (T021-T025) before frontend integration (T026-T028)
- **Core implementation** before integration (T029-T032)
- **Everything else** before polish (T033-T040)

## Parallel Execution Examples

### Setup Phase (can run T002 and T003 in parallel after T001):
```bash
# After T001 completes:
Task: "Create server/tests/ directory structure"
Task: "Create database migration for Anki integration schema"
```

### Contract Tests (T004-T008 can all run in parallel):
```bash
Task: "Contract test POST /api/upload-anki in server/tests/contract/test_anki_upload.js"
Task: "Contract test GET /api/anki-imports in server/tests/contract/test_anki_imports_list.js"
Task: "Contract test GET /api/anki-imports/{id} in server/tests/contract/test_anki_imports_detail.js"
Task: "Contract test GET /api/decks/{id} (enhanced) in server/tests/contract/test_decks_enhanced.js"
Task: "Contract test GET /api/decks/{id}/cards (enhanced) in server/tests/contract/test_deck_cards_enhanced.js"
```

### Integration Tests (T009-T012 can all run in parallel):
```bash
Task: "Integration test: Basic Anki import scenario in server/tests/integration/test_basic_anki_import.js"
Task: "Integration test: Question generation from Anki cards in server/tests/integration/test_anki_question_generation.js"
Task: "Integration test: Error handling for invalid files in server/tests/integration/test_anki_error_handling.js"
Task: "Integration test: Large file import performance in server/tests/integration/test_large_anki_import.js"
```

### Core Utilities (T017-T019 can run in parallel, T020 depends on existing code):
```bash
Task: "Create Anki file validation utility in server/utils/ankiValidator.js"
Task: "Create Anki parsing utility in server/utils/ankiParser.js using AdmZip"
Task: "Create import tracking service in server/utils/importTracker.js"
```

### Frontend Integration (T026-T028 can all run in parallel):
```bash
Task: "Add import status indicator to existing upload interface in client/src/App.js"
Task: "Add Anki metadata display to deck view in client/src/App.js"
Task: "Enhance error handling for import failures in client/src/App.js"
```

### Unit Tests (T033-T035 can all run in parallel):
```bash
Task: "Add unit tests for ankiValidator.js in server/tests/unit/test_anki_validator.js"
Task: "Add unit tests for ankiParser.js in server/tests/unit/test_anki_parser.js"
Task: "Add unit tests for importTracker.js in server/tests/unit/test_import_tracker.js"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify all contract and integration tests fail before implementing features
- Commit after each completed task
- All file paths are absolute from repository root
- Maintain compatibility with existing functionality throughout implementation

## Validation Checklist
*GATE: Verified during task generation*

- [x] All contracts have corresponding tests (5 contracts → 5 contract tests)
- [x] All entities have model tasks (3 entities → database migration tasks)
- [x] All tests come before implementation (T004-T012 before T013+)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

**Total Tasks**: 40 tasks across 8 phases
**Estimated Completion**: 3-5 days for full implementation
**Critical Path**: Setup → Tests → Schema → Core → API → Integration → Polish