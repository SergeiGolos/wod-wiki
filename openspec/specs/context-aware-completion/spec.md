# context-aware-completion Specification

## Purpose
TBD - created by archiving change add-exercise-typeahead-integration. Update Purpose after archive.
## Requirements
### Requirement: Exercise Context Detection

The editor MUST intelligently detect when users are in a context where exercise suggestions are appropriate.

#### Scenario: Detect explicit exercise context markers
**Given** the user is typing in the workout script editor  
**When** the line contains "exercise:" followed by the cursor  
**Then** the context is identified as exercise-related  
**And** exercise suggestions are enabled  
**And** syntax suggestions are suppressed

#### Scenario: Detect movement context markers
**Given** the user is typing in the workout script editor  
**When** the line contains "movement:" followed by the cursor  
**Then** the context is identified as exercise-related  
**And** exercise suggestions are enabled

#### Scenario: Detect list item context
**Given** the user is typing in the workout script editor  
**When** the line starts with a list marker ("- " or "• ")  
**Then** the context is potentially exercise-related  
**And** exercise suggestions are available alongside other suggestions  
**And** context confidence is marked as medium

#### Scenario: Detect reps context
**Given** the user is typing in the workout script editor  
**When** the line contains a pattern like "10 reps " followed by the cursor  
**Then** the context is identified as exercise-related  
**And** exercise suggestions are prioritized

#### Scenario: No context detection for timer syntax
**Given** the user is typing in the workout script editor  
**When** the line contains "(AMRAP)" or "(EMOM)"  
**Then** the context is identified as timer-related (not exercise)  
**And** exercise suggestions are suppressed  
**And** timer syntax suggestions are prioritized

### Requirement: Context-Based Filtering

Suggestions MUST be filtered and ranked based on the detected context.

#### Scenario: Equipment context filtering
**Given** the user has typed "barbell" in an exercise context  
**When** suggestions are requested  
**Then** exercises requiring "Barbell" equipment are prioritized  
**And** exercises without barbells appear lower in the list  
**And** the word "barbell" matches both equipment and name

#### Scenario: Bodyweight context filtering
**Given** the user has typed "bodyweight" in an exercise context  
**When** suggestions are requested  
**Then** exercises with equipment "Body Only" are prioritized  
**And** exercises requiring equipment appear lower or are filtered out

#### Scenario: Muscle group context filtering
**Given** the user has typed "chest" in an exercise context  
**When** suggestions are requested  
**Then** exercises targeting chest muscles are prioritized  
**And** exercises not targeting chest appear lower in the list

### Requirement: Progressive Disclosure

Exercise variations and details MUST be disclosed progressively to avoid overwhelming users.

#### Scenario: Show variation count without details
**Given** an exercise has 6 variations  
**When** the exercise group appears in suggestions  
**Then** the variation count is displayed (e.g., "Squat (6 variations)")  
**And** individual variations are not initially shown  
**And** variations can be accessed through additional interaction

#### Scenario: Expand variations on selection
**Given** an exercise with variations is selected from suggestions  
**When** the user confirms selection  
**Then** a secondary picker appears showing all variations  
**And** each variation shows differentiating details (equipment, stance, etc.)  
**And** the user can filter variations before final selection

#### Scenario: Quick insert for single exercises
**Given** an exercise has only one variation (no alternatives)  
**When** the user selects the exercise  
**Then** the exercise is inserted immediately  
**And** no variation picker appears  
**And** the workflow is streamlined for single exercises

### Requirement: Hover Documentation

Users MUST be able to preview exercise details without leaving the editor.

#### Scenario: Hover shows exercise details
**Given** the user hovers over an exercise name in suggestions  
**When** the hover provider is invoked  
**Then** a documentation panel appears  
**And** the panel shows exercise name, equipment, muscles, difficulty  
**And** the panel shows exercise instructions (first 2-3 steps)  
**And** the panel is formatted with markdown

#### Scenario: Hover shows variation information
**Given** the user hovers over an exercise with variations  
**When** the hover provider is invoked  
**Then** the documentation indicates the number of variations  
**And** the panel lists variation names if space permits  
**And** a hint suggests how to access the variation picker

#### Scenario: Hover with loading state
**Given** exercise data is not yet loaded  
**When** the user hovers over an exercise  
**Then** a loading indicator appears briefly  
**And** once data loads, the full documentation is shown  
**And** if loading fails, basic info from index is displayed

#### Scenario: Hover on inserted exercise text
**Given** an exercise name has been inserted into the editor  
**When** the user hovers over the inserted text  
**Then** hover documentation appears for that exercise  
**And** the documentation is the same as in suggestions  
**And** this provides in-place reference without searching

### Requirement: Manual Suggestion Trigger

Users MUST be able to manually trigger exercise suggestions with a keyboard shortcut.

#### Scenario: Trigger suggestions with Ctrl+Space
**Given** the user's cursor is at any position in the editor  
**When** the user presses Ctrl+Space (or Cmd+Space on Mac)  
**Then** exercise suggestions are displayed  
**And** suggestions appear even if context detection would normally suppress them  
**And** this provides an override for automatic context detection

#### Scenario: Trigger suggestions in ambiguous context
**Given** the user is in a context where automatic suggestions are disabled  
**When** the user presses Ctrl+Space  
**Then** suggestions appear including exercises  
**And** the user has control over when suggestions appear

### Requirement: Context Pattern Configuration

Context detection patterns MUST be configurable and extensible.

#### Scenario: Register custom context patterns
**Given** a developer wants to add a custom context trigger  
**When** a new pattern is registered (e.g., "workout:" prefix)  
**Then** the pattern is added to the context detector  
**And** exercise suggestions trigger for the new pattern  
**And** the pattern uses regex for flexibility

#### Scenario: Context patterns with confidence levels
**Given** multiple context patterns are registered  
**When** context detection evaluates a line  
**Then** each matching pattern has an associated confidence (high/medium/low)  
**And** high confidence patterns enable suggestions immediately  
**And** low confidence patterns require additional validation

### Requirement: Multi-Language Support Preparation

Context detection MUST be designed to support internationalized workout scripts in the future.

#### Scenario: Detect context markers regardless of case
**Given** context markers may appear in different cases  
**When** the line contains "Exercise:", "EXERCISE:", or "exercise:"  
**Then** all variations are recognized as exercise context  
**And** case-insensitive matching is used

#### Scenario: Extensible pattern system
**Given** future support for non-English scripts is planned  
**When** context patterns are implemented  
**Then** the system uses a plugin architecture  
**And** new language patterns can be added without modifying core code  
**And** patterns can be language-specific or universal

### Requirement: Context State Management

The editor MUST maintain context state efficiently across user interactions.

#### Scenario: Cache context detection results
**Given** the user is typing on a line with detected context  
**When** context is checked multiple times for the same line  
**Then** the result is cached and reused  
**And** pattern matching is not repeated unnecessarily  
**And** cache is invalidated when line content changes

#### Scenario: Context scope limited to current line
**Given** the user is typing in the editor  
**When** context detection runs  
**Then** only the current line is analyzed  
**And** previous or following lines do not affect context  
**And** this keeps context detection fast (< 5ms)

#### Scenario: Context updates on cursor movement
**Given** the user moves the cursor to a different line  
**When** the cursor position changes  
**Then** context is re-evaluated for the new line  
**And** suggestions update to match new context  
**And** context from previous line is discarded

### Requirement: Context-Aware Suggestion Priority

Suggestion ranking MUST adapt based on detected context to show most relevant exercises first.

#### Scenario: Prioritize exact context matches
**Given** the user types "barbell" and context is equipment-focused  
**When** suggestions are ranked  
**Then** exercises with "Barbell" equipment rank highest  
**And** exercises with "barbell" in name (but different equipment) rank lower  
**And** context relevance overrides pure name matching

#### Scenario: Blend context and query relevance
**Given** the user types "chest press" in an exercise context  
**When** suggestions are ranked  
**Then** ranking considers both query match ("chest press") and context  
**And** "Barbell Bench Press" (Chest + Press) ranks higher than "Chest Fly"  
**And** compound scoring combines multiple relevance factors

### Requirement: Suggestion Filtering Options

Users MUST be able to filter exercise suggestions by various criteria.

#### Scenario: Filter by equipment availability
**Given** the user wants exercises with specific equipment  
**When** the user types equipment name (e.g., "dumbbell")  
**Then** suggestions are filtered to show only dumbbell exercises  
**And** the filter is applied in addition to name search

#### Scenario: Filter by difficulty level
**Given** the user wants beginner-level exercises  
**When** the user types "beginner" in the query  
**Then** suggestions prioritize exercises with level="Beginner"  
**And** advanced exercises appear lower or are filtered out

#### Scenario: Filter by muscle group
**Given** the user wants exercises targeting specific muscles  
**When** the user types muscle name (e.g., "biceps")  
**Then** suggestions show exercises with biceps as primary or secondary muscle  
**And** exercises not targeting biceps are filtered out

### Requirement: Context Feedback and Indicators

The editor MUST provide visual feedback about detected context.

#### Scenario: Visual indicator for exercise context
**Given** exercise context is detected on current line  
**When** suggestions appear  
**Then** a visual indicator (icon or badge) shows exercise suggestions are active  
**And** the indicator distinguishes from syntax suggestions  
**And** users understand the type of suggestions being shown

#### Scenario: Context hint in suggestion header
**Given** suggestions are shown based on detected context  
**When** the suggestion list is displayed  
**Then** the list header shows context information (e.g., "Exercise suggestions")  
**And** this provides clarity about suggestion source and type

