# Exercise Typeahead Integration

## Overview
The Exercise Typeahead feature provides intelligent, real-time exercise name completion as you type in the Monaco Editor. It leverages a rich dataset of exercises to offer suggestions with metadata like equipment, muscles targeted, and difficulty.

## Key Features

*   **Intelligent Suggestions**: Real-time exercise name completion for 873+ exercises.
*   **Rich Metadata**: Displays icons for Equipment 🏋️, Muscles 💪, and Difficulty ⭐ inline with suggestions.
*   **Hover Documentation**: Rich hover cards showing exercise details including instructions.
*   **High Performance**:
    *   Debounced search (150ms)
    *   LRU caching (100 exercises)
    *   localStorage index caching (< 10ms search, < 1ms cached load)
*   **Error Resilience**: Retry logic with exponential backoff, 500ms timeout, and graceful fallbacks.

## Technical Implementation

### Components
- **ExerciseSuggestionProvider**: Interacts with Monaco to provide completion items.
- **ExerciseIndexManager**: Manages the index of exercises, handling caching and updates.
- **ExerciseHoverProvider**: distinct provider for the hover details.

### Data Flow
1.  User types in the editor.
2.  Monaco triggers the suggestion provider.
3.  Provider queries the `ExerciseIndexManager`.
4.  Manager checks cache or fetches from API.
5.  Results are formatted and returned to Monaco.

## Usage
Just start typing an exercise name in the editor (e.g., "Thrus...") and the suggestion list will appear.
