# Manual Testing Validation - Exercise Typeahead

## Task 1.4: Basic Suggestion Provider

**Status**: ✅ Implementation Complete - Awaiting Manual Validation

### Test Environment
- **Storybook URL**: http://localhost:6006
- **Story to Test**: Parsing > Parser (uses WodWiki editor with Monaco)
- **Date Tested**: 2025-10-12

---

## Test Cases

### Test 1: Provider Registration
**Objective**: Verify exercise suggestion provider is registered with Monaco

**Steps**:
1. Open Storybook at http://localhost:6006
2. Navigate to **Parsing > Parser** story
3. Click into the Monaco editor
4. Type `Ctrl+Space` to manually trigger suggestions
5. Verify completion menu appears

**Expected Result**: ✅ Completion menu shows (may include workout syntax suggestions)

**Actual Result**: _[To be filled during testing]_

---

### Test 2: Exercise Name Suggestions
**Objective**: Verify exercise names appear as suggestions

**Steps**:
1. In the Parser story editor, clear all content
2. Type: `barb` (lowercase, partial word)
3. Wait 150ms for debounce
4. Observe suggestion list

**Expected Results**:
- ✅ Suggestions appear automatically after 150ms delay
- ✅ List includes exercises starting with "Barbell" (e.g., "Barbell Squat", "Barbell Bench Press")
- ✅ At least 5-10 barbell exercises shown
- ✅ Minimum 2 characters required (typing "b" shows nothing)

**Actual Result**: _[To be filled during testing]_

---

### Test 3: Exercise Metadata Display
**Objective**: Verify exercise details shown in suggestions

**Steps**:
1. Type: `push` in the editor
2. Find "Push-Up" in the suggestion list
3. Hover over or select the suggestion
4. Check the detail panel on the right

**Expected Results**:
- ✅ Equipment shown (e.g., "bodyweight")
- ✅ Muscle groups shown (e.g., "chest, triceps")
- ✅ Difficulty shown if available (e.g., "beginner")
- ✅ Format: `Equipment • Muscles • Difficulty`

**Actual Result**: _[To be filled during testing]_

---

### Test 4: Search Relevance Ranking
**Objective**: Verify exact matches ranked higher than partial matches

**Steps**:
1. Type: `squat`
2. Observe order of suggestions

**Expected Results**:
- ✅ "Squat" or "Air Squat" appears near the top
- ✅ "Barbell Squat" appears before "Bulgarian Split Squat"
- ✅ Exercises with "squat" at start ranked before "squat" in middle

**Actual Result**: _[To be filled during testing]_

---

### Test 5: Suggestion Insertion
**Objective**: Verify selecting a suggestion inserts the exercise name

**Steps**:
1. Clear editor content
2. Type: `dead`
3. Select "Deadlift" from suggestions (click or press Enter)
4. Verify inserted text

**Expected Results**:
- ✅ "Deadlift" is inserted at cursor position
- ✅ Original partial word "dead" is replaced completely
- ✅ Cursor moves to end of inserted text
- ✅ No extra spaces or characters added

**Actual Result**: _[To be filled during testing]_

---

### Test 6: Minimum Query Length
**Objective**: Verify 2-character minimum for suggestions

**Steps**:
1. Type single character: `p`
2. Verify no exercise suggestions appear
3. Type second character: `pu`
4. Verify suggestions appear

**Expected Results**:
- ✅ No exercise suggestions with 1 character
- ✅ Exercise suggestions appear with 2+ characters

**Actual Result**: _[To be filled during testing]_

---

### Test 7: Debounce Behavior
**Objective**: Verify 150ms debounce prevents excessive searches

**Steps**:
1. Rapidly type: `barbellsquat` (all at once, fast)
2. Observe when suggestions appear

**Expected Results**:
- ✅ Suggestions don't appear after each keystroke
- ✅ Suggestions appear ~150ms after typing stops
- ✅ Only one search executed (not 13 searches for 13 characters)

**Actual Result**: _[To be filled during testing]_

---

### Test 8: Multiple Suggestion Providers
**Objective**: Verify exercise suggestions coexist with workout syntax suggestions

**Steps**:
1. Type: `AM` (start of AMRAP)
2. Verify workout syntax suggestions appear
3. Type: `pu` (start of push-up)
4. Verify exercise suggestions appear

**Expected Results**:
- ✅ Both suggestion providers active
- ✅ No conflicts or errors
- ✅ Relevant suggestions for context

**Actual Result**: _[To be filled during testing]_

---

### Test 9: Editor Performance
**Objective**: Verify suggestions don't impact editor responsiveness

**Steps**:
1. Type rapidly in the editor while suggestions are loading
2. Observe typing lag or delays
3. Check browser console for errors

**Expected Results**:
- ✅ No noticeable typing lag (< 50ms delay)
- ✅ Suggestions appear asynchronously without blocking
- ✅ No console errors related to suggestions
- ✅ Editor remains responsive during suggestion load

**Actual Result**: _[To be filled during testing]_

---

### Test 10: Index Initialization
**Objective**: Verify exercise index loads successfully on first editor mount

**Steps**:
1. Open browser dev tools (F12)
2. Go to Network tab
3. Refresh Storybook page
4. Navigate to Parser story
5. Check network requests

**Expected Results**:
- ✅ Request to `/exercise-path-index.json` (1.5MB)
- ✅ Request completes in < 500ms
- ✅ No 404 errors for exercise index
- ✅ Console log: `[ExerciseIndexManager] Loaded index in Xms`

**Actual Result**: _[To be filled during testing]_

---

## Performance Validation

### Metrics to Capture
- [ ] **Index Load Time**: ___ ms (target: < 500ms)
- [ ] **Search Response Time**: ___ ms (target: < 100ms)
- [ ] **Suggestion Display Lag**: ___ ms (target: < 150ms debounce)
- [ ] **Memory Footprint**: ___ MB (target: < 20MB for index)

### Browser Console Commands
```javascript
// Check index loaded
ExerciseIndexManager.getInstance().then(m => console.log(m))

// Check cache stats
ExerciseIndexManager.getInstance().then(m => console.log(m.getCacheStats()))
```

---

## Known Limitations (Expected)

- ✅ No context-awareness yet (shows all exercises, not filtered by workout type)
- ✅ No equipment/muscle filtering in suggestions (Phase 2)
- ✅ No exercise variation selection UI (Phase 2)
- ✅ No hover documentation provider (Phase 2.5)
- ✅ No exercise image previews (Non-goal)

---

## Sign-Off

**Tester**: _[Name]_  
**Date**: _[YYYY-MM-DD]_  
**Result**: [ ] PASS / [ ] FAIL  

**Notes**:
_[Additional observations, issues found, or improvements suggested]_

---

## Automated Validation (Already Complete)

✅ ExerciseIndexManager: 25 tests passing  
✅ ExerciseSearchEngine: 19 tests passing  
✅ LRUCache: 14 tests passing  
✅ Total: 58 tests, all passing
