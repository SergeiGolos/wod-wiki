# Proposal: Add Exercise Typeahead Integration

**Change ID**: `add-exercise-typeahead-integration`  
**Status**: Draft  
**Created**: 2025-10-12  
**Author**: AI Assistant

## Overview

Integrate the exercise path-based indexing system with Monaco Editor's typeahead functionality to provide intelligent exercise suggestions during workout script editing. This enables users to discover and select from 873 exercises with real-time search and auto-completion capabilities while maintaining editor performance.

## Problem Statement

Currently, users editing workout scripts in the WOD Wiki Monaco Editor have no assistance when specifying exercises. They must:
- Manually type exercise names without validation
- Remember exact exercise names from memory
- Switch context to browse exercise directories separately
- Have no visibility into exercise variations or alternatives

The existing suggestion system only provides workout syntax patterns (AMRAP, EMOM, etc.) but lacks exercise-specific intelligence. With 873 exercises organized into 707 groups, users need an efficient way to discover, search, and select exercises without leaving the editor.

## Proposed Solution

Create a comprehensive exercise suggestion system that:

1. **Leverages Exercise Path Index**: Integrates the lightweight 1.5MB exercise-path-index.json for fast searching across all exercises
2. **Provides Context-Aware Suggestions**: Detects when users are typing exercise names and offers relevant completions
3. **Enables Lazy Loading**: Loads full exercise data on-demand using file paths from the index
4. **Maintains Performance**: Implements caching, debouncing, and Web Worker processing to keep response times < 100ms
5. **Supports Exercise Variations**: Shows variation counts and enables filtering by equipment, difficulty, and muscle groups

## Key Capabilities

This change introduces three new capabilities:

### 1. Exercise Suggestions (`exercise-suggestions`)
- Exercise completion provider integrated with Monaco Editor
- Search across 873 exercises using pre-computed search terms
- Display exercise metadata (equipment, muscles, difficulty, variations)
- Rank results by name similarity, context relevance, and usage patterns

### 2. Exercise Data Loading (`exercise-data-loading`)
- Lazy loading of exercise JSON files using index paths
- LRU cache for frequently accessed exercises (max 100 entries)
- Asynchronous loading with fallback mechanisms
- Memory-efficient data management

### 3. Context-Aware Completion (`context-aware-completion`)
- Detect exercise-related contexts in workout scripts
- Filter suggestions based on workout script syntax
- Support keyboard navigation and progressive disclosure
- Provide hover documentation with exercise previews

## Success Criteria

- [ ] Exercise suggestions appear when typing in editor
- [ ] Search response time < 100ms for all queries
- [ ] Index loads in < 500ms on first editor mount
- [ ] Memory footprint increase < 50MB with full cache
- [ ] No regressions in existing unit tests
- [ ] Storybook story demonstrates exercise typeahead functionality

## Non-Goals

- Full exercise browser UI (users can still view exercises separately)
- Exercise image previews in suggestions (defer to future enhancement)
- Exercise comparison features (out of scope)
- Custom exercise creation (not part of this change)
- Workout template suggestions (separate feature)

## Dependencies

- Existing Monaco Editor integration (`src/editor/`)
- Exercise path index (`exercise-path-index.json`)
- Exercise JSON files in `public/exercises/`
- Current suggestion engine architecture

## Risks and Mitigations

### Risk: Performance degradation with large result sets
**Mitigation**: Implement result limiting (max 50 results), debounced search (150ms), and virtualized suggestion lists

### Risk: Memory leaks from uncached exercise data
**Mitigation**: LRU cache with automatic eviction, WeakMap for unused references, periodic cleanup on idle

### Risk: Index loading blocks editor initialization
**Mitigation**: Progressive index loading, localStorage caching, fallback suggestions during load

### Risk: Context detection false positives
**Mitigation**: Conservative trigger patterns, user feedback mechanism, manual suggestion trigger (Ctrl+Space)

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- Integrate ExercisePathIndexer with editor
- Implement ExerciseIndexManager with caching
- Create basic exercise suggestion provider
- Test performance with full dataset

### Phase 2: Enhanced Functionality (Week 3-4)
- Implement context-aware suggestion filtering
- Add equipment and muscle-based search
- Create variation selection interface
- Add hover documentation for exercises

### Phase 3: Performance and Polish (Week 5-6)
- Optimize search algorithms and caching
- Implement Web Workers for background processing
- Add progressive loading for large result sets
- Create comprehensive Storybook stories

## Related Documentation

- [Monaco Editor Exercise Typeahead Integration](../../../docs/monaco-editor-exercise-typeahead-integration.md)
- [Exercise Path-Based Indexing Tool](../../../docs/exercise-path-indexing-tool.md)
- Existing editor architecture in `src/editor/`

## Open Questions

1. Should exercise suggestions trigger automatically or require explicit activation (e.g., typing "exercise:")?
2. What keyboard shortcuts should be used for variation selection?
3. Should we pre-warm the cache with most common exercises on editor mount?
4. How should we handle exercises with very similar names (e.g., "Push-Up" vs "Push Up")?
5. Should exercise suggestions integrate with existing syntax suggestions or be separate?

## Approval Checklist

- [ ] Technical feasibility validated
- [ ] Performance requirements achievable
- [ ] Breaking changes identified (none expected)
- [ ] Tests strategy defined
- [ ] Documentation plan outlined
- [ ] Stakeholder review completed
