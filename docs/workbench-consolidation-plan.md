# Workbench Consolidation Plan

## 1. Executive Summary

This document compares `UnifiedWorkbench.tsx` and `WodWorkbench.tsx`.
**Recommendation**: `UnifiedWorkbench.tsx` is the modern, robust architecture. `WodWorkbench.tsx` appears to be a legacy or simplified implementation that lacks full runtime integration (see Section 3). The goal is to deprecated `WodWorkbench.tsx` after ensuring `UnifiedWorkbench` covers all intended use cases.

## 2. Component Comparison

| Feature | `UnifiedWorkbench.tsx` | `WodWorkbench.tsx` |
| :--- | :--- | :--- |
| **State Management** | **Context-Based** (`WorkbenchContext`, `RuntimeProvider`). scalable. | **Local State**. Harder to share state with deep children. |
| **Runtime Integration** | **Full integration** via `useWorkbenchRuntime` and `RuntimeFactory`. | **Incomplete/Broken**. Passes `runtime={undefined}` to `RuntimeLayout`. |
| **Layout Engine** | **`SlidingViewport`**. Handles smooth messaging and distinct panels (Plan/Track/Analyze). | **Manual CSS Transitions**. Uses `w-0 opacity-0` on divs. |
| **Mobile Support** | **First-class**. detects `isMobile`, adjusts layout (stacked vs sliding), WakeLock. | **Basic**. Some responsive CSS, auto-folds editor. |
| **Panel Architecture** | **Modular**. Uses specialized wrapper panels (`PlanPanel`, `TrackPanel`, etc.) | **Monolithic**. Renders `MarkdownEditorBase` and `RuntimeLayout` directly. |
| **Extras** | Audio Context, Analytics Transformer, Commit Graph (responsive). | Commit Graph (fixed). |

## 3. Critical Findings

*   **Runtime Gap**: `WodWorkbench.tsx` currently has `runtime={undefined}` hardcoded in its render method. It **cannot** run a workout in its current state.
*   **Context Missing**: `WodWorkbench.tsx` does not wrap itself in `WorkbenchProvider`, meaning child components that rely on that context (like buttons in the Overlay) might fail or need prop drilling.

## 4. Feature Selection Checklist

Please review the following features found in the components. Check the box if the feature **must** be preserved in the final `UnifiedWorkbench`.

### A. Layout & Visuals
- [x] **Sliding Viewport Animation**: Current `Unified` implementation.
- [ ] **Manual Div Toggling**: Current `WodWorkbench` implementation (Simpler DOM, less animation).
- [x] **Commit Graph in Header**: Visual flair.
- [x] **Responsive Header**: Adapts title/buttons for mobile.

### B. Functionality
- [x] **Command Palette Integration**: `Cmd+K` support.
- [x] **Theme Toggling**: Dark/Light/System modes.
- [x] **Audio Support**: Global mute/unmute context.
- [x] **Wake Lock**: Prevents screen sleep during workouts (mobile).
- [ ] **Mobile Auto-Fold**: `WodWorkbench` auto-folds code regions on load for mobile. (Not currently in Unified?)

### C. Editor Features
- [ ] **Workout Overlay (Legacy)**: `WodWorkbench` uses `WorkoutOverlay` component over the editor. `Unified` relies on Monaco View Zones / Decorations via `WodBlockManager`.
    *   *Note*: `WodBlockManager` is the modern approach. `WorkoutOverlay` was the previous React-portal based approach.

## 5. Action Plan

1.  **Validate "Mobile Auto-Fold"**: If desired, migrate the `editor.foldAll` logic from `WodWorkbench` to `UnifiedWorkbench`'s editor mount handler.
2.  **Verify Overlay Strategy**: Confirm that `WodBlockManager` (in Unified) effectively replaces `WorkoutOverlay` (in WodWorkbench).
3.  **Deprecate**: Delete `src/components/layout/WodWorkbench.tsx`.
4.  **Rename**: Optionally rename `UnifiedWorkbench.tsx` to `WodWorkbench.tsx` (the canonical name) once the old one is gone.

## 6. Code Migration Snippets

**Feature to Migrate: Mobile Auto-Fold (from WodWorkbench)**
```typescript
// In UnifiedWorkbench.tsx handleEditorMount or similar
useEffect(() => {
  if (editorInstance && window.innerWidth < 768) {
    setTimeout(() => {
      editorInstance.getAction('editor.foldAll')?.run();
    }, 100);
  }
}, [editorInstance]);
```

**Feature to Migrate: Explicit Escape Key Handling (from WodWorkbench)**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedBlockId(null); // Clear selection in Index panel
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```
