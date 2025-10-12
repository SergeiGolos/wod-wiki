# Tasks: Exercise Typeahead Integration

**Change ID**: `add-exercise-typeahead-integration`

## Phase 1: Core Infrastructure (Week 1-2)

### 1.1 Exercise Index Manager ✅
- [x] Create `src/editor/ExerciseIndexManager.ts` with singleton pattern
- [x] Implement asynchronous index loading from `exercise-path-index.json`
- [x] Add localStorage caching with validation
- [x] Implement LRU cache for exercise data (max 100 entries)
- [x] Write unit tests for index manager (load, cache, singleton behavior)
- [x] Validate performance: index load < 500ms, cache operations < 1ms
- **Completed**: 20 tests passing, LRUCache with 14 tests
- **Files**: `src/editor/ExerciseIndexManager.ts`, `src/editor/LRUCache.ts`

### 1.2 Exercise Data Loader ✅
- [x] Create `src/editor/ExerciseDataLoader.ts` (integrated into ExerciseIndexManager)
- [x] Implement file-based exercise JSON loading using paths from index
- [x] Add error handling with retry logic (exponential backoff)
- [x] Integrate with LRU cache in ExerciseIndexManager
- [x] Write unit tests for data loader (success, failure, retry scenarios)
- [x] Validate performance: exercise load < 200ms per file
- **Completed**: Integrated into ExerciseIndexManager with path validation and error handling
- **Note**: Combined with 1.1 for better cohesion (singleton pattern sharing)

### 1.3 Exercise Search Engine ✅
- [x] Create `src/editor/ExerciseSearchEngine.ts`
- [x] Implement search across exercise index using pre-computed search terms
- [x] Add result ranking by name similarity and search term overlap
- [x] Implement debounced search with 150ms delay
- [x] Write unit tests for search (exact match, partial match, fuzzy matching)
- [x] Validate performance: search < 100ms for any query
- **Completed**: 19 tests passing, includes filtering by equipment/muscles/difficulty
- **Files**: `src/editor/ExerciseSearchEngine.ts`
- **Features**: Debouncing (150ms), search caching (100 entries), empty query with filters support

### 1.4 Basic Suggestion Provider ✅
- [x] Create `src/editor/ExerciseSuggestionProvider.ts`
- [x] Implement Monaco `CompletionItemProvider` interface
- [x] Connect to ExerciseIndexManager for exercise data
- [x] Format suggestions with exercise name, variation count, equipment
- [x] Register provider with Monaco Editor in `WodWikiSyntaxInitializer.tsx`
- [ ] Test provider registration and basic suggestion display (manual testing in Storybook pending)
- **Completed**: 192 lines, async initialization, metadata extraction
- **Files**: `src/editor/ExerciseSuggestionProvider.ts`, updated `WodWikiSyntaxInitializer.tsx`
- **Testing**: Manual validation required (Monaco can't be unit tested in Node environment)

## Phase 2: Enhanced Functionality (Week 3-4)

### 2.1 Context-Aware Suggestions
- [ ] Create `src/editor/ExerciseContextDetector.ts`
- [ ] Implement pattern matching for exercise-related contexts
- [ ] Add context patterns: "exercise:", "movement:", list items, reps context
- [ ] Filter suggestions based on detected context
- [ ] Write unit tests for context detection (true positives, false negatives)
- [ ] Validate context detection accuracy > 90%

### 2.2 Advanced Search Capabilities
- [ ] Add equipment-based filtering to search engine
- [ ] Add muscle group filtering to search engine
- [ ] Add difficulty level filtering to search engine
- [ ] Implement search by aliases (if present in exercise data)
- [ ] Write unit tests for filtered search operations
- [ ] Validate filter combinations work correctly

### 2.3 Suggestion Metadata and Display
- [ ] Enhance suggestion formatting with equipment icons
- [ ] Add muscle group indicators to suggestions
- [ ] Show variation count for grouped exercises
- [ ] Implement suggestion detail view (on selection)
- [ ] Add keyboard shortcuts for suggestion navigation
- [ ] Test suggestion display in various screen sizes

### 2.4 Exercise Variation Selection
- [ ] Create `src/editor/ExerciseVariationSelector.ts`
- [ ] Implement variation picker UI/logic for multi-variation exercises
- [ ] Add variation filtering by equipment and difficulty
- [ ] Integrate variation selector with suggestion provider
- [ ] Write unit tests for variation selection flow
- [ ] Test variation selection UX in Storybook

### 2.5 Hover Documentation
- [ ] Implement Monaco `HoverProvider` for exercises
- [ ] Show exercise details on hover (muscles, equipment, instructions)
- [ ] Format hover documentation with markdown
- [ ] Add loading states for exercise data
- [ ] Register hover provider with Monaco Editor
- [ ] Test hover functionality in editor

## Phase 3: Performance and Polish (Week 5-6)

### 3.1 Performance Optimization
- [ ] Implement Web Worker for background index processing (optional)
- [ ] Add result pagination for large search results (max 50 visible)
- [ ] Optimize search algorithm with early termination
- [ ] Implement search result caching for repeated queries
- [ ] Profile memory usage and optimize cache size if needed
- [ ] Run performance benchmarks and validate targets met

### 3.2 Error Handling and Resilience
- [ ] Add fallback suggestions for index load failures
- [ ] Implement graceful degradation when exercise data unavailable
- [ ] Add error logging for monitoring
- [ ] Create user-friendly error messages
- [ ] Test error scenarios (network failures, corrupted data, etc.)
- [ ] Validate error recovery flows work correctly

### 3.3 Progressive Loading
- [ ] Implement immediate fallback with common exercises
- [ ] Add progressive index loading with chunks
- [ ] Show loading indicator during index initialization
- [ ] Test loading states in slow network conditions
- [ ] Validate suggestion availability during loading
- [ ] Ensure editor remains responsive during load

### 3.4 Testing and Validation
- [ ] Write comprehensive unit tests for all new components
- [ ] Create integration tests for provider registration
- [ ] Add performance tests for search and load operations
- [ ] Test memory usage under various scenarios
- [ ] Run existing test suite to ensure no regressions
- [ ] Validate all performance targets met

### 3.5 Documentation and Stories
- [ ] Create Storybook story: "Exercise Suggestions - Basic"
- [ ] Create Storybook story: "Exercise Suggestions - Filtered Search"
- [ ] Create Storybook story: "Exercise Suggestions - Variation Selection"
- [ ] Create Storybook story: "Exercise Suggestions - Error States"
- [ ] Update `docs/monaco-editor-exercise-typeahead-integration.md` with implementation details
- [ ] Add inline code documentation for all public APIs
- [ ] Create README section for exercise suggestion features

### 3.6 Integration and Deployment
- [ ] Ensure `exercise-path-index.json` is included in build output
- [ ] Test integration with existing editor features
- [ ] Verify no conflicts with existing suggestion providers
- [ ] Test in production-like environment (built Storybook)
- [ ] Create deployment checklist
- [ ] Validate functionality end-to-end

## Validation Checklist

After completing all tasks, verify:

- [ ] `npm run storybook` - starts successfully and shows exercise suggestion stories
- [ ] Navigate to Exercise Suggestion story and verify typeahead works
- [ ] Type partial exercise name (e.g., "barbell") and see suggestions
- [ ] Select exercise and verify it inserts into editor
- [ ] Test variation selection for exercises with multiple variations
- [ ] Verify hover documentation shows exercise details
- [ ] `npm run test:unit` - all tests pass with no new failures
- [ ] `npm run build-storybook` - builds successfully in ~30 seconds
- [ ] Performance targets met: search < 100ms, load < 500ms, memory < 50MB
- [ ] No regressions in existing editor functionality

## Dependencies and Sequencing

**Critical Path**:
1. Exercise Index Manager (1.1) → Exercise Data Loader (1.2) → Exercise Search Engine (1.3) → Basic Suggestion Provider (1.4)
2. Basic Suggestion Provider (1.4) → Context-Aware Suggestions (2.1)
3. Search Engine (1.3) → Advanced Search (2.2)
4. Suggestion Provider (1.4) → Variation Selection (2.4) + Hover Documentation (2.5)

**Parallelizable Work**:
- Tasks 2.2, 2.3, 2.4, 2.5 can be worked on concurrently after 1.4 completes
- Phase 3 optimization tasks (3.1, 3.2, 3.3) can be done in parallel
- Documentation (3.5) can be updated continuously throughout implementation

## Time Estimates

- Phase 1: 8-10 days (core infrastructure and basic functionality)
- Phase 2: 8-10 days (enhanced features and UX improvements)
- Phase 3: 6-8 days (optimization, testing, and polish)
- **Total**: 22-28 days (4.5-5.5 weeks)

## Risk Mitigation

- **Risk**: Index loading impacts editor startup time
  - **Mitigation**: Implement progressive loading and localStorage caching (Task 3.3)

- **Risk**: Search performance degrades with large result sets
  - **Mitigation**: Result limiting and debouncing (Tasks 1.3, 3.1)

- **Risk**: Memory leaks from uncached exercise data
  - **Mitigation**: LRU cache with automatic eviction (Task 1.1)

- **Risk**: Context detection has high false positive rate
  - **Mitigation**: Conservative patterns with manual override (Task 2.1)
