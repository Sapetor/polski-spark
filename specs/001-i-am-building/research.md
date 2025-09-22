# Research: Anki Deck Integration

## Technical Research Findings

### Anki File Format (.apkg)
- **Decision**: Use existing AdmZip library for parsing
- **Rationale**: Already installed and used successfully in current codebase
- **Alternatives considered**: anki-apkg-export package (unnecessary complexity for read-only operations)

### Question Type Generation Strategy
- **Decision**: Extend existing questionGenerator.js utility
- **Rationale**: Current system already generates 5 question types with smart Polish language features
- **Alternatives considered**: New question engine (would break existing optimization patterns)

### Database Schema Extensions
- **Decision**: Extend existing schema with migration approach
- **Rationale**: Maintain compatibility with current user progress and deck storage
- **Alternatives considered**: New schema (would require data migration and break existing features)

### File Upload Handling
- **Decision**: Extend existing multer-based upload API endpoint
- **Rationale**: Upload infrastructure already exists at POST /upload-anki
- **Alternatives considered**: New upload service (unnecessary duplication)

### Error Handling for Corrupted Files
- **Decision**: Add validation layer before parsing with proper error responses
- **Rationale**: Current system lacks comprehensive file validation
- **Alternatives considered**: Try-catch only (insufficient user feedback)

### Testing Strategy
- **Decision**: Add Jest framework for backend testing
- **Rationale**: Backend currently lacks test framework, needed for reliable Anki parsing
- **Alternatives considered**: Manual testing only (insufficient for file parsing edge cases)

## Integration Points Identified

1. **File Upload Flow**: POST /upload-anki → validation → parsing → database storage
2. **Question Generation**: Existing questionGenerator.js → extend with Anki card metadata
3. **Progress Tracking**: Existing spaced repetition system → works with imported cards
4. **UI Integration**: Existing React components → support Anki-sourced content

## Risk Mitigation

- **Large Files**: Use streaming for large .apkg files, add size limits
- **Invalid Content**: Comprehensive validation before database insertion
- **Performance**: Leverage existing card classification for imported content
- **User Experience**: Maintain existing UI patterns for consistency