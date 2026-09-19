# Screen: Note-Built / Syntax Page

- **Route:** `/p/:slug` (and legacy `/guide/*`, `/syntax/*`)
- **Host Component:** `apps/playground/app/canvas/ScrollCanvasPage.tsx` / `MarkdownCanvasPage.tsx`
- **Domain Models:** `Page`, `Note`, `NoteSegment`

---

## 1. Component & Service Dependencies

### Core UI Components
- `RunwayAdapter` (`apps/playground/app/canvas/RunwayAdapter.tsx`). Continuous scroll runway for staged tutorial steps.
- `CanvasSection` (`apps/playground/app/components/molecules/CanvasSection.tsx`). Individual stage card with narrative text and challenge badges.
- `EditorWindow` (`apps/playground/app/components/organisms/editor/EditorWindow.tsx`). Interactive CodeMirror window embedded in the canvas.

### Hooks & Runtimes
- `useCanvasRuntime` (`apps/playground/app/hooks/useCanvasRuntime.ts`). Manages live execution state and challenge completions.
- `useScrollQuests` (`apps/playground/app/canvas/useScrollQuests.ts`). Tracks milestone scroll progress.
- `useSyntaxChallenge` (`apps/playground/app/hooks/useSyntaxChallenge.ts`). Evaluates user edits against syntax validation rules.

---

## 2. Desktop View Layout (≥1024px)

- **Split Presentation / Scroll Runway:**
  - Left runway provides narrative guide prose and syntax explanations.
  - Right pane pins the live interactive editor with live syntax diagnostics.
- **Stage Progress Indicator:** Sticky header displays chapter progress and quest badges.
- **Right Rail (216px right):** Stage index and jump anchors.

---

## 3. Mobile View Layout (<1024px)

- **Single Linear Scroll:** Split view collapses into an inline sequence of reading cards and code blocks.
- **Compact Interactive Editors:** Code editor windows embed inline with constrained heights and touch-friendly run buttons.
- **Floating Quest Pill:** Floating indicator displays active challenge completion status.

---

## 4. Composable Behaviors

- **Live Local Edits with Protected Source:**
  - Users can freely edit and run code examples inside canvas pages.
  - Edits remain local to the active session; teaching source files are protected from unintentional mutation.
- **Quest Ledger Synchronization:**
  - Completing interactive challenges updates local storage quest milestones and unlocks subsequent sections.
