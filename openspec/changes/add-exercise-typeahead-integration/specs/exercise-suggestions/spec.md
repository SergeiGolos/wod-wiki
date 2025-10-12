# Spec: Exercise Suggestions

**Capability**: `exercise-suggestions`  
**Change**: `add-exercise-typeahead-integration`

## ADDED Requirements

### Requirement: Exercise Completion Provider

The Monaco Editor must provide intelligent exercise name completions when users type in the workout script editor.

#### Scenario: User types partial exercise name
**Given** the user has opened a workout script in the Monaco Editor  
**When** the user types "barbell sq" in the editor  
**Then** a completion list appears showing exercises matching "barbell sq"  
**And** suggestions include "Barbell Squat", "Barbell Squat - Wide Stance", etc.  
**And** each suggestion displays variation count (e.g., "Barbell Squat (6 variations)")  
**And** each suggestion displays required equipment  
**And** each suggestion displays primary muscle groups

#### Scenario: User selects exercise from suggestions
**Given** the user sees exercise suggestions for "barbell"  
**When** the user selects "Barbell Bench Press" from the list  
**Then** the text "Barbell Bench Press" is inserted at cursor position  
**And** the cursor moves to the end of the inserted text  
**And** the completion list closes

#### Scenario: No matching exercises found
**Given** the user has opened a workout script  
**When** the user types "xyzabc123" (gibberish)  
**Then** no completion suggestions appear  
**Or** a message "No exercises found" is displayed

### Requirement: Exercise Search Performance

Exercise search operations must complete within performance budgets to maintain editor responsiveness.

#### Scenario: Fast search response for common queries
**Given** the exercise index is fully loaded  
**When** the user types any partial exercise name  
**Then** search results appear within 100ms  
**And** the editor remains responsive during search  
**And** no UI lag is perceptible to the user

#### Scenario: Search response with debouncing
**Given** the user is actively typing  
**When** the user types multiple characters rapidly (< 200ms between keystrokes)  
**Then** search is debounced and only executes once after typing pauses  
**And** the delay before search execution is 150ms  
**And** previous pending searches are cancelled

#### Scenario: Search with limited results
**Given** a search query returns > 50 matching exercises  
**When** the suggestion list is displayed  
**Then** only the top 50 results are shown  
**And** results are ranked by relevance (exact match > partial match > fuzzy match)

### Requirement: Exercise Metadata Display

Exercise suggestions must display relevant metadata to help users identify and select the correct exercise.

#### Scenario: Suggestion shows equipment requirements
**Given** an exercise requires specific equipment (e.g., "Barbell")  
**When** the exercise appears in suggestions  
**Then** the equipment name is displayed (e.g., "🏋️ Barbell")  
**And** equipment is visible without requiring hover or expansion

#### Scenario: Suggestion shows muscle groups
**Given** an exercise targets specific muscles (e.g., "Chest, Triceps")  
**When** the exercise appears in suggestions  
**Then** primary muscle groups are displayed  
**And** muscle groups are formatted concisely (e.g., "💪 Chest, Triceps")

#### Scenario: Suggestion shows difficulty level
**Given** an exercise has a difficulty level (Beginner/Intermediate/Expert)  
**When** the exercise appears in suggestions  
**Then** the difficulty level is indicated with icon or text  
**And** difficulty is visually distinguishable (e.g., color coding)

#### Scenario: Suggestion indicates variations
**Given** an exercise has multiple variations (e.g., 6 variations of "Squat")  
**When** the exercise group appears in suggestions  
**Then** variation count is displayed (e.g., "Squat (6 variations)")  
**And** user can distinguish single exercises from groups

### Requirement: Exercise Suggestion Ranking

Search results must be ranked intelligently to prioritize most relevant exercises.

#### Scenario: Exact name match ranks highest
**Given** user searches for "push up"  
**When** results include "Push-Up" (exact) and "Diamond Push-Up" (partial)  
**Then** "Push-Up" appears first in the list  
**And** partial matches appear after exact matches

#### Scenario: Search term overlap affects ranking
**Given** user searches for "barbell chest"  
**When** results include exercises with equipment "Barbell" and muscle "Chest"  
**Then** exercises matching both terms rank higher than single-term matches  
**And** "Barbell Bench Press" (Chest) ranks above "Barbell Squat" (Legs)

#### Scenario: Partial name match ranking
**Given** user searches for "curl"  
**When** results include "Bicep Curl", "Hammer Curl", "Preacher Curl"  
**Then** results are ranked by name similarity (shorter names first)  
**And** all results contain "curl" in their name or aliases

### Requirement: Suggestion Provider Registration

The exercise completion provider must integrate with Monaco Editor without conflicts.

#### Scenario: Register exercise provider alongside syntax provider
**Given** Monaco Editor is initialized in the workout script editor  
**When** the editor mounts and providers are registered  
**Then** the exercise completion provider is registered for "workout" language  
**And** the existing syntax completion provider remains registered  
**And** both providers can coexist and provide suggestions

#### Scenario: Provider activation on trigger characters
**Given** the exercise completion provider is registered  
**When** the user types a character that could be part of an exercise name  
**Then** the provider's `provideCompletionItems` method is invoked  
**And** the provider returns exercise suggestions if context is appropriate

### Requirement: Exercise Index Loading

The exercise index must load efficiently without blocking editor initialization.

#### Scenario: Asynchronous index loading on editor mount
**Given** the Monaco Editor is mounting for the first time  
**When** the editor initialization begins  
**Then** exercise index loading starts asynchronously  
**And** the editor becomes interactive before index loading completes  
**And** basic fallback suggestions are available immediately

#### Scenario: Index cached in localStorage
**Given** the exercise index has been loaded once before  
**When** the editor mounts in a subsequent session  
**Then** the index is loaded from localStorage  
**And** index load time is < 50ms  
**And** cache validity is checked (version or timestamp)

#### Scenario: Index load failure fallback
**Given** the exercise index fails to load (network error, corrupted file)  
**When** the editor attempts to provide exercise suggestions  
**Then** a fallback list of common exercises is used  
**And** an error is logged to console  
**And** the editor remains functional with limited suggestions

### Requirement: Memory Management

The suggestion system must manage memory efficiently to prevent performance degradation.

#### Scenario: Exercise data uses LRU cache
**Given** the exercise data loader is active  
**When** exercise data is loaded from files  
**Then** loaded data is stored in an LRU cache (max 100 entries)  
**And** least recently used entries are evicted when cache is full  
**And** cache hits avoid redundant file loads

#### Scenario: Memory footprint remains bounded
**Given** the editor has been used to search for many exercises  
**When** the total memory usage is measured  
**Then** the increase from exercise suggestions is < 50MB  
**And** the LRU cache enforces size limits  
**And** no memory leaks are detected over extended usage

### Requirement: Exercise Suggestion Interface

The suggestion UI must provide clear, actionable information in a compact format.

#### Scenario: Suggestion label shows exercise name
**Given** an exercise suggestion is displayed  
**When** the user views the suggestion in the list  
**Then** the primary label is the exercise name  
**And** the name is clearly readable and properly formatted

#### Scenario: Suggestion detail shows metadata
**Given** an exercise suggestion is displayed  
**When** the user views the suggestion  
**Then** a detail line shows equipment and muscles  
**And** the detail is concise and fits on one line  
**And** the detail uses icons to save space

#### Scenario: Suggestion documentation available
**Given** an exercise suggestion has detailed information  
**When** the user hovers or focuses the suggestion  
**Then** documentation panel appears with full details  
**And** documentation includes exercise description  
**And** documentation is formatted with markdown

### Requirement: Keyboard Navigation

Users must be able to navigate exercise suggestions using keyboard shortcuts.

#### Scenario: Navigate suggestions with arrow keys
**Given** exercise suggestions are displayed  
**When** the user presses the down arrow key  
**Then** the selection moves to the next suggestion  
**And** when the user presses the up arrow key  
**And** the selection moves to the previous suggestion

#### Scenario: Select suggestion with Enter key
**Given** an exercise suggestion is highlighted  
**When** the user presses Enter  
**Then** the exercise is inserted into the editor  
**And** the suggestion list closes

#### Scenario: Dismiss suggestions with Escape key
**Given** exercise suggestions are displayed  
**When** the user presses Escape  
**Then** the suggestion list closes  
**And** the cursor remains at its current position
