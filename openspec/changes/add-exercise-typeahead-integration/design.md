# Design: Exercise Typeahead Integration Architecture

**Change ID**: `add-exercise-typeahead-integration`  
**Date**: 2025-10-12

## Architectural Overview

The exercise typeahead integration introduces a multi-layered architecture that bridges the Monaco Editor suggestion system with the exercise path-based index. The design prioritizes performance, memory efficiency, and extensibility while maintaining separation of concerns.

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Monaco Editor                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Completion Provider Interface                           │   │
│  │  - provideCompletionItems()                              │   │
│  │  - resolveCompletionItem()                               │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└────────────────────────┼─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│           ExerciseSuggestionProvider                             │
│  - Context detection and query extraction                       │
│  - Result formatting and ranking                                │
│  - Asynchronous suggestion loading                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│              ExerciseIndexManager                                │
│  - Index loading and caching (1.5MB)                            │
│  - Search operations across 873 exercises                       │
│  - Exercise data lazy loading via paths                         │
└────────┬────────────────────────────────────┬────────────────────┘
         │                                    │
┌────────▼────────────────┐      ┌───────────▼────────────────────┐
│   ExerciseSearchEngine  │      │    ExerciseDataLoader          │
│  - Query parsing        │      │  - File-based loading          │
│  - Result ranking       │      │  - LRU cache (100 exercises)   │
│  - Debounced search     │      │  - Async data fetching         │
└─────────────────────────┘      └────────────────────────────────┘
```

## Key Design Decisions

### 1. Separate Suggestion Provider for Exercises

**Decision**: Create dedicated `ExerciseSuggestionProvider` separate from existing `SuggestionEngine`

**Rationale**:
- Existing `SuggestionEngine` handles workout syntax patterns (AMRAP, EMOM)
- Exercise suggestions require different data sources and behavior
- Separation enables independent evolution and testing
- Allows both systems to coexist without interference

**Trade-offs**:
- Additional complexity with multiple completion providers
- Need coordination to prevent suggestion conflicts
- **Chosen**: Separation provides cleaner architecture and better maintainability

**Implementation**:
```typescript
// Register both providers with Monaco
monaco.languages.registerCompletionItemProvider('workout', syntaxProvider);
monaco.languages.registerCompletionItemProvider('workout', exerciseProvider);
```

### 2. Index Manager as Singleton

**Decision**: Use singleton pattern for `ExerciseIndexManager` with lazy initialization

**Rationale**:
- Index data (1.5MB) should be loaded once per session
- Multiple editor instances should share same index
- Prevents memory bloat from duplicate index instances
- Enables centralized cache management

**Trade-offs**:
- Singleton can complicate testing (requires proper mocking)
- Global state may cause issues in concurrent scenarios
- **Chosen**: Benefits outweigh concerns for this use case

**Implementation**:
```typescript
export class ExerciseIndexManager {
  private static instance: ExerciseIndexManager | null = null;
  private static initPromise: Promise<ExerciseIndexManager> | null = null;

  static async getInstance(): Promise<ExerciseIndexManager> {
    if (this.instance) return this.instance;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.initialize();
    this.instance = await this.initPromise;
    return this.instance;
  }
  
  private static async initialize(): Promise<ExerciseIndexManager> {
    // Load index asynchronously
  }
}
```

### 3. LRU Cache for Exercise Data

**Decision**: Implement Least Recently Used (LRU) cache with maximum 100 exercise entries

**Rationale**:
- Full exercise data is ~20KB per exercise
- Loading all 873 exercises = ~17.5MB (too much for memory)
- Most users interact with < 100 exercises per session
- LRU ensures frequently accessed exercises stay cached

**Trade-offs**:
- Cache misses require file I/O (slower than memory access)
- Cache management adds complexity
- **Chosen**: 100-entry limit provides good hit rate without excessive memory

**Implementation**:
```typescript
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

### 4. Debounced Search with 150ms Delay

**Decision**: Debounce search operations by 150ms to reduce computation

**Rationale**:
- Users type at ~5 characters per second (200ms per character)
- 150ms provides good balance between responsiveness and efficiency
- Prevents excessive searches while user is actively typing
- Reduces unnecessary render cycles in Monaco Editor

**Trade-offs**:
- Slight delay before suggestions appear (150ms)
- May feel sluggish for very fast typists
- **Chosen**: 150ms is standard for autocomplete UX and feels natural

**Implementation**:
```typescript
class DebouncedSearch {
  private timeout: NodeJS.Timeout | null = null;
  private readonly delay: number = 150;

  search(query: string, callback: (results: any[]) => void): void {
    if (this.timeout) clearTimeout(this.timeout);
    
    this.timeout = setTimeout(() => {
      const results = this.performSearch(query);
      callback(results);
    }, this.delay);
  }
}
```

### 5. Context Detection via Pattern Matching

**Decision**: Use regex pattern matching to detect exercise-related contexts

**Rationale**:
- Workout scripts have predictable structure
- Pattern matching is fast (< 1ms) and deterministic
- No need for complex AST parsing for context detection
- Can be refined iteratively based on user feedback

**Trade-offs**:
- Pattern matching can have false positives
- Less sophisticated than full semantic analysis
- **Chosen**: Simplicity and performance justify trade-off

**Context Patterns**:
```typescript
const EXERCISE_CONTEXTS = [
  /exercise:\s*$/i,           // "exercise: "
  /movement:\s*$/i,           // "movement: "
  /\d+\s+reps?\s+$/i,        // "10 reps "
  /^\s*[-•]\s*$/,            // List item indicator
];
```

### 6. Progressive Loading Strategy

**Decision**: Load index in chunks with immediate fallback suggestions

**Rationale**:
- 1.5MB index can block editor initialization if loaded synchronously
- Users want immediate editor interaction
- Progressive loading provides basic suggestions while loading full index
- localStorage caching eliminates load time for subsequent sessions

**Trade-offs**:
- More complex initialization logic
- Potential for inconsistent suggestion quality during load
- **Chosen**: Better UX justifies complexity

**Loading Strategy**:
```typescript
async initializeWithFallback() {
  // Phase 1: Immediate fallback (from memory)
  this.suggestions = COMMON_EXERCISES; // Top 20 exercises
  
  // Phase 2: Check localStorage cache
  const cached = localStorage.getItem('exercise-index');
  if (cached && this.isCacheValid(cached)) {
    this.loadFromCache(cached);
    return;
  }
  
  // Phase 3: Load full index asynchronously
  const index = await fetch('/exercise-path-index.json').then(r => r.json());
  this.loadFullIndex(index);
  localStorage.setItem('exercise-index', JSON.stringify(index));
}
```

## Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Index Load (First) | < 500ms | Chunked parsing, Web Worker |
| Index Load (Cached) | < 50ms | localStorage retrieval |
| Search Query | < 100ms | Debouncing, pre-computed terms |
| Suggestion Render | < 50ms | Result limiting (max 50) |
| Exercise Data Load | < 200ms | Async fetch + cache |
| Memory Footprint | < 50MB | LRU cache, index-only storage |

## Error Handling Strategy

### Index Loading Failures
- **Fallback**: Use hardcoded common exercises (top 50)
- **Retry**: Exponential backoff (1s, 2s, 4s)
- **Logging**: Console warning with error details
- **User Notification**: Silent failure with degraded functionality

### Exercise Data Loading Failures
- **Fallback**: Show basic metadata from index
- **Retry**: Single retry with 500ms delay
- **Cache**: Mark as "unavailable" to prevent repeated failures
- **User Notification**: Show "(Details unavailable)" in hover

### Search Performance Issues
- **Timeout**: Abort searches taking > 500ms
- **Fallback**: Show cached results or empty list
- **Logging**: Performance metrics for monitoring
- **Degradation**: Disable search temporarily if repeated timeouts

## Testing Strategy

### Unit Tests
- ExerciseIndexManager initialization and caching
- LRU cache eviction logic
- Search ranking algorithm accuracy
- Context detection pattern matching
- Debouncing behavior

### Integration Tests
- Monaco Editor provider registration
- Suggestion rendering in editor
- Exercise data loading pipeline
- Cache hit/miss scenarios
- Error recovery flows

### Performance Tests
- Index load time measurement
- Search response time under load
- Memory usage monitoring
- Cache efficiency metrics
- Concurrent search handling

### User Experience Tests
- Suggestion relevance and ranking
- Keyboard navigation
- Variation selection workflow
- Hover documentation display
- Error state handling

## Extensibility Points

### Custom Search Strategies
```typescript
interface SearchStrategy {
  rank(query: string, exercise: ExercisePathEntry): number;
  filter(exercises: ExercisePathEntry[]): ExercisePathEntry[];
}

class FuzzySearchStrategy implements SearchStrategy { ... }
class ExactMatchStrategy implements SearchStrategy { ... }
```

### Custom Context Detectors
```typescript
interface ContextDetector {
  detect(line: string, position: number): ExerciseContext | null;
}

class WorkoutScriptContextDetector implements ContextDetector { ... }
class MarkdownContextDetector implements ContextDetector { ... }
```

### Custom Suggestion Formatters
```typescript
interface SuggestionFormatter {
  format(exercise: ExercisePathEntry): languages.CompletionItem;
  formatHover(exercise: Exercise): languages.Hover;
}
```

## Security Considerations

1. **Path Traversal Prevention**: Validate all file paths from index before loading
2. **JSON Injection**: Sanitize exercise data before rendering in editor
3. **XSS Prevention**: Escape HTML in documentation strings
4. **Resource Exhaustion**: Limit concurrent file operations (max 5)
5. **Cache Poisoning**: Validate index structure before caching

## Migration Path

This is a new feature with no breaking changes. Integration steps:

1. Deploy exercise-path-index.json to public directory
2. Register ExerciseSuggestionProvider alongside existing provider
3. Add feature flag for gradual rollout (optional)
4. Monitor performance metrics
5. Iterate based on user feedback

## Future Enhancements

- **Exercise Image Previews**: Show exercise images in suggestions
- **Exercise History**: Track recently used exercises
- **Smart Ranking**: Machine learning for personalized suggestions
- **Offline Mode**: Service Worker for offline index access
- **Multi-Language**: Support for internationalized exercise names
