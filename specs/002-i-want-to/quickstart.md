# Quickstart Guide: Enhanced Front-End Testing

## Overview
This quickstart guide provides step-by-step validation of the enhanced front-end functionality for deck upload and learning sessions. Follow these scenarios to verify all features work correctly.

## Prerequisites

### Environment Setup
1. **Node.js 18+** installed
2. **npm** package manager
3. **Sample Anki deck file** (.apkg format) for testing
4. **Modern browser** (Chrome, Firefox, Safari latest versions)

### Starting the Application
```bash
# Terminal 1: Start backend server
cd server
npm start
# Should show: "Polski Lokalny Backend listening at http://localhost:3001"

# Terminal 2: Start frontend development server
cd client
npm start
# Should open browser to http://localhost:3000
```

## Test Scenarios

### Scenario 1: User Profile Management
**Objective**: Verify user creation and selection works correctly

**Steps**:
1. Navigate to http://localhost:3000
2. Verify you see "Polski Spark" title and "Select Your Profile" section
3. Create new user:
   - Enter name "Test User" in the input field
   - Click "Create Profile" button
   - Verify user is created and dashboard loads automatically
4. Test user switching:
   - Click "Switch User" button on dashboard
   - Verify you return to user selection screen
   - Verify "Test User" appears in existing users list
   - Click on "Test User" button to select existing user

**Expected Results**:
- User creation works without errors
- Dashboard shows user information (name, level 1, XP 0, streak 0)
- User selection and switching functions correctly

### Scenario 2: Deck Upload - Happy Path
**Objective**: Verify successful deck upload with progress tracking

**Steps**:
1. Ensure you're on the dashboard as a selected user
2. Locate "Admin: Upload Anki Deck" section
3. Upload deck:
   - Click "Choose File" and select a valid .apkg file
   - Enter deck name "Test Polish Deck"
   - Click "Upload Deck" button
4. Monitor upload progress:
   - Verify progress bar appears and shows increasing percentage
   - Verify progress messages update ("Processing cards...", "Almost done!", etc.)
   - Wait for completion (progress reaches 100%)

**Expected Results**:
- Progress bar shows smooth progression from 0% to 100%
- Progress messages are informative and update appropriately
- Upload completes successfully
- New deck appears in "Available Decks" section below
- Upload form resets after completion

### Scenario 3: Deck Upload - Error Handling
**Objective**: Verify error handling for invalid uploads

**Steps**:
1. Test invalid file format:
   - Try uploading a .txt or .pdf file instead of .apkg
   - Verify appropriate error message appears
2. Test missing deck name:
   - Select valid .apkg file but leave deck name empty
   - Verify upload button is disabled
3. Test corrupted file (if available):
   - Try uploading a renamed non-Anki file with .apkg extension
   - Verify server returns appropriate error message

**Expected Results**:
- Clear error messages for invalid file types
- Form validation prevents submission with missing required fields
- Server errors are displayed to user with actionable guidance

### Scenario 4: Learning Session - Configuration
**Objective**: Verify learning session can be configured and started

**Steps**:
1. Locate uploaded deck in "Available Decks" section
2. Configure lesson options:
   - Select difficulty level (Beginner/Intermediate/Advanced)
   - Choose question types (at least 2 different types)
   - Verify "Start Learning" button shows selected difficulty
3. Start learning session:
   - Click "Start Learning" button
   - Verify session loads without errors

**Expected Results**:
- All difficulty options are selectable
- Question type checkboxes work correctly
- Cannot start with zero question types selected
- Session starts smoothly with proper configuration

### Scenario 5: Learning Session - Question Flow
**Objective**: Verify learning session functionality and question types

**Steps**:
1. Start a learning session (following Scenario 4)
2. Verify session header information:
   - Current question number (e.g., "Question 1 of 10")
   - Progress bar showing completion percentage
   - Session statistics (Correct: 0/0, Accuracy: -)
3. Test different question types:
   - **Multiple Choice**: Select an option and verify feedback
   - **Fill-in-blank**: Type answer and submit
   - **Translation**: Enter translation and submit
   - **Flashcard**: Show answer and proceed
4. Complete entire session:
   - Answer all questions (mix of correct and incorrect)
   - Verify completion statistics page appears

**Expected Results**:
- Progress bar updates correctly after each question
- Session statistics update in real-time
- Different question types render and function correctly
- Immediate feedback appears after each answer
- Session completion shows final statistics

### Scenario 6: Learning Session - Error Recovery
**Objective**: Verify session handles errors gracefully

**Steps**:
1. Start a learning session
2. Test network interruption (disconnect network briefly)
3. Test browser refresh during session
4. Test navigation away and back

**Expected Results**:
- Appropriate error messages for network issues
- Graceful handling of session interruption
- User can recover or restart session as needed

### Scenario 7: Responsive Design
**Objective**: Verify application works on different screen sizes

**Steps**:
1. Test on desktop browser (1920x1080)
2. Test on tablet size (768x1024) using browser dev tools
3. Test on mobile size (375x667) using browser dev tools
4. Verify all features remain usable at each size

**Expected Results**:
- Layout adapts appropriately to screen size
- All buttons and inputs remain accessible
- Text remains readable at all sizes
- Upload and session functionality works on all devices

## Performance Benchmarks

### Upload Performance
- **Small deck** (50-100 cards): Upload completes in <10 seconds
- **Medium deck** (200-500 cards): Upload completes in <30 seconds
- **Large deck** (1000+ cards): Upload completes in <2 minutes

### Session Performance
- **Question transitions**: <500ms between questions
- **Answer validation**: <200ms response time
- **Progress updates**: Real-time without delays

## Browser Compatibility

### Supported Browsers
- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+

### Known Limitations
- Internet Explorer not supported
- Very old mobile browsers may have limited functionality

## Troubleshooting

### Common Issues

**Upload fails with "Network Error"**:
- Verify backend server is running on port 3001
- Check browser console for detailed error messages
- Ensure file is valid .apkg format

**Learning session doesn't start**:
- Verify deck upload completed successfully
- Check that at least one question type is selected
- Confirm user is properly selected

**Progress bar stuck at 0%**:
- Check backend console for processing errors
- Verify Server-Sent Events are working (no ad blockers interfering)
- Try with smaller deck file

### Debug Information
- Backend logs: Check terminal running `npm start` in server directory
- Frontend logs: Open browser developer tools console
- Network requests: Monitor Network tab in developer tools

## Success Criteria

✅ **All test scenarios complete without critical errors**
✅ **Performance benchmarks met for typical usage**
✅ **Error handling provides clear user guidance**
✅ **Responsive design works across target devices**
✅ **Upload and learning flows are intuitive**

This quickstart guide validates that the enhanced front-end meets all functional requirements and provides a smooth user experience for deck upload and learning sessions.