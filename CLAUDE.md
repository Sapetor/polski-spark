# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polski Spark is a Duolingo-style language learning web application for Polish, designed to run on local networks. It imports Anki deck files (.apkg) and transforms them into interactive learning experiences with multiple question types, difficulty classification, and progress tracking.

**Best Practices:**
- Keep functions focused on single responsibilities
- Use ES6 modules with proper imports/exports
- Preserve DOM structure in manipulations
- Document complex algorithms

## Architecture

**Full-Stack Structure:**
- **Frontend**: React SPA (port 3000) with manual state management
- **Backend**: Express.js API server (port 3001) with SQLite database
- **Database**: SQLite with Knex.js migrations and seeds

**Key Data Flow:**
1. Anki .apkg files → Server parsing → Card classification → Database storage
2. Client requests lessons → Server generates mixed question types → Client renders interactive exercises
3. User answers → Server validates + records progress → Database tracking

## Development Commands

### Server (from `/server` directory):
```bash
npm start                    # Start Express server on port 3001
npm run migrate             # Run database migrations
npx knex seed:run           # Populate question types and achievements
```

### Client (from `/client` directory):
```bash
npm start                   # Start React dev server on port 3000  
npm test                    # Run React tests
npm run build              # Production build
```

### Database Operations:
```bash
# From server directory
node migrate.js                           # Run migrations manually
curl -X POST http://localhost:3001/api/classify-cards  # Classify existing cards
```

## Core Components

### Server Architecture (`/server`):

**Main API Server** (`index.js`):
- Express server with CORS, JSON middleware
- 15+ REST endpoints for users, decks, cards, lessons, progress
- Anki .apkg file upload and parsing with AdmZip
- Automatic database migrations on startup

**Database Layer**:
- `knexfile.js`: SQLite configuration
- `migrations/`: Database schema evolution (initial tables + enhanced features)
- `seeds/`: Static data (question types, achievements)

**Core Utilities** (`/utils`):
- `cardClassifier.js`: AI-powered difficulty classification using Polish language patterns, word frequency, grammar complexity
- `questionGenerator.js`: Generates 5 question types (multiple choice, fill-blank, translation, flashcard) with smart distractors
- `spacedRepetition.js`: Enhanced SM-2 algorithm with Polish language optimizations, response time tracking, and mastery levels

### Client Architecture (`/client/src`):

**Main Application** (`App.js`):
- Single-file React app with view routing (userSelect → dashboard → lesson → lessonComplete)
- Complex state management for users, decks, lessons, progress
- **Critical RTL Text Direction Fix**: Custom input handlers for translation exercises to prevent browser RTL detection

**Question Renderers**:
- `MultipleChoiceQuestion`: 4-option selection with lettered choices
- `FillBlankQuestion`: Text input with hints
- `TranslationQuestion`: **Custom keyboard event handling** to force LTR text direction
- `FlashcardQuestion`: Traditional show/hide answer
- `LessonComplete`: Statistics and progression interface

## Important Implementation Details

### Text Direction Handling (Translation Questions):
The app implements aggressive LTR enforcement for translation inputs because browsers auto-detect Polish text and apply RTL formatting:
- Manual keystroke interception via `onKeyDown`
- Prevents default browser input handling
- Custom cursor positioning with `setSelectionRange`
- Multiple layers of CSS and JavaScript LTR enforcement

### Card Classification System:
Automatic difficulty assessment using:
- Polish diacritical mark density (ą, ę, ć, ł, ń, ó, ś, ź, ż)
- Complex consonant patterns (szcz, strz, chrz, drz)
- Word frequency analysis against common Polish vocabulary
- Grammar complexity indicators (conjugations, subjunctive mood)
- Anki tag parsing for manual difficulty overrides

### Question Generation Logic:
- **Multiple Choice**: Generates distractors from similar cards by length/topic
- **Fill Blank**: Analyzes Polish sentences to identify key words to blank out
- **Translation**: Flexible answer checking with fuzzy matching for translations
- **Mixed Lessons**: Random question type selection within difficulty levels

### Spaced Repetition System:
The app implements an enhanced SM-2 algorithm optimized for Polish language learning:
- **Response Time Tracking**: Fast correct answers boost ease factors (under 70% of expected time)
- **Difficulty Adjustments**: Beginner cards get shorter intervals, advanced cards get rewards for good performance  
- **Question Type Modifiers**: Translation exercises (better retention) get 20-30% longer intervals
- **Mastery Levels**: Three-tier system (learning → familiar → mastered) based on accuracy and intervals
- **Adaptive Sessions**: Balances new cards with review cards based on due dates and user progress

### Database Schema:
- `users`: Profiles with XP, level, streak tracking
- `decks`: Imported Anki collections  
- `cards`: Content with auto-classified difficulty, topic categories
- `user_progress`: Enhanced spaced repetition tracking with mastery levels, response times, and next review scheduling
- `exercise_results`: Detailed performance analytics per question attempt with timing data
- `question_types`: Available exercise types with descriptions
- `user_sessions`: Learning session tracking with statistics
- `achievements`: Gamification system with XP rewards (seeded and ready for implementation)
- `user_achievements`: User achievement tracking

## API Endpoints

**User Management:**
- `GET /api/users` - List all user profiles
- `POST /api/users` - Create new user profile

**Content Access:**
- `GET /api/decks` - Available decks
- `GET /api/decks/:id/lesson?difficulty=X&questionTypes=Y&count=Z` - Generate adaptive lesson
- `GET /api/decks/:id/stats` - Deck statistics and distributions

**Learning System:**
- `POST /api/check-answer` - Validate answers, record results, and update spaced repetition schedule
- `POST /api/users/:id/progress` - Update spaced repetition data
- `GET /api/users/:id/reviews` - Get cards due for review with spaced repetition
- `GET /api/users/:id/study-session` - Generate optimized study sessions with new/review card balance
- `GET /api/users/:id/stats` - Comprehensive learning analytics and mastery distribution
- `GET /api/question-types` - Available question types and descriptions
- `POST /upload-anki` - Import .apkg files with auto-classification

## Key Files to Understand

1. `/server/utils/cardClassifier.js` - Polish language analysis engine
2. `/server/utils/questionGenerator.js` - Exercise type generation algorithms  
3. `/server/utils/spacedRepetition.js` - Enhanced spaced repetition algorithm with language learning optimizations
4. `/client/src/App.js` - Single-file React application with custom text input handling and response time tracking
5. `/server/migrations/20250914000001_enhance_learning_features.js` - Enhanced schema with spaced repetition and gamification
6. `/server/index.js` - API server with Anki parsing logic and spaced repetition integration

## Known Issues

- **Text Direction**: RTL issues in translation inputs are resolved via custom input handling
- **Performance**: Large Anki decks (10K+ cards) may cause slow classification
- **Browser Compatibility**: Custom input handling may behave differently across browsers

## TODO (Future Implementation)

**AnkiWeb Compliance Features** (deferred until needed):
- Add copyright disclaimer to upload interface confirming users own/licensed content
- Create terms of use for Polski Spark stating personal/educational use only
- Add content ownership validation in upload flow
- Implement "no redistribution" policy for processed content