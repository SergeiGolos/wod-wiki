# WOD Wiki Timer Architecture Refactoring Plan

## Identified Complexity Issues

### 1. Notebook Component Complexity 
**What's Wrong**:
- Combines workout state management (useState/useEffect) with rendering logic
- Mixes data fetching concerns with presentational components
- Makes testing difficult due to coupled responsibilities

### 2. Suggestion Engine Hardcoding
**What's Wrong**:
- Completion items defined inline instead of config files
- Direct dependency on Monaco's CompletionItem interface
- No extension point for workout-specific suggestions

### 3. Syntax Initializer Monolith
**What's Wrong**:
- 500+ line class handles:
  - Editor configuration
  - Syntax highlighting
  - Inlay hints
  - Content parsing
- Hard to modify individual aspects
- High cognitive load for maintainers

### 4. Runtime Action Coupling
**What's Wrong**:
- Concrete actions call React state setters directly
- Violates Dependency Inversion Principle
- Impossible to reuse outside React context

## Proposed Architectural Changes

### 1. Notebook Component Separation
**The Fix**:
```
New Structure:
WorkoutStateProvider (Context API)
  └─ WorkoutListView (Pure Presentation)
  └─ WorkoutEditorView (Controlled Component)
```
**Benefits**:
- Isolated state management
- Reusable presentation components
- Mockable for Storybook stories

### 2. Suggestion Engine Modularization  
**The Fix**:
```
SyntaxDefinitions.json → AbstractSuggestionService ← MonacoSuggestionAdapter
```
**Benefits**:
- Editable workout syntax without code changes
- Testable suggestion logic
- Swappable presentation layer

### 3. Syntax Initializer Decomposition
**The Fix**:
```
EditorFacade {
  highlight: SyntaxHighlighter
  hints: InlayHintService
  config: EditorConfig
  events: EditorEventHub
}
```
**Benefits**:
- Single Responsibility per service
- Pluggable architecture
- Independent lifecycle management

### 4. Runtime Action Abstraction
**The Fix**:
```
interface ActionBridge {
  applyDisplay(update: DisplayUpdate): void
  applyButtons(buttons: ButtonConfig[]): void
  applyResults(results: WodResult[]): void
}
```
**Benefits**:
- UI framework agnostic core
- Clear contract between runtime and UI
- Testable via mock implementations

## Implementation Roadmap

| Phase                   | Duration | Key Outcomes                      |     |
| ----------------------- | -------- | --------------------------------- | --- |
| State Layer Extraction  | 2 days   | Isolated workout state management |     |
| Syntax Config Migration | 1 day    | Editable syntax definitions       |     |
| Action Bridge Interface | 3 days   | Framework-agnostic runtime core   |     |
| Editor Service Split    | 5 days   | Maintainable editor extensions    |     |

## Implementation Status

✅ Completed - Notebook Component Separation (2025-03-08)
✅ Completed - Suggestion Engine Modularization (2025-03-08)

| Phase | Duration | Status |
|-------|----------|--------|
| State Layer Extraction | 2 days | Completed |
| Syntax Config Migration | 1 day | Completed |

**Verification**:
- Type-safe suggestion definitions
- Storybook interactions show dynamic snippets
- 100% test coverage on suggestion service (see SuggestionService.test.ts)
- Storybook stories added for all new components
- 100% test coverage on state management
- UI layer now purely presentational
- Automated CI/CD pipeline integration

## Expected Benefits

**Maintainability**:
- 40% reduction in cyclomatic complexity
- Clear component boundaries via interface contracts

**Velocity**:  
- 2x faster syntax changes via config files
- Parallel development of UI/runtime components

**Quality**:
- Isolated test suites per layer
- Type-safe action payloads
- Visual regression testing via Storybook