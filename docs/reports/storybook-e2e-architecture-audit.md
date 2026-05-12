# Storybook & E2E Testing Architecture Audit

**Date**: 2026-04-15 | **Status**: Proposal | **Scope**: Story structure, e2e coverage, cross-cutting concerns

---

## Executive Summary

**36 story files** produce **~150 stories**; **~85 orphaned e2e tests** target non-existent story IDs. Strong component coverage but structural gaps block cross-cutting concern testing:

- **No `play()` interaction tests** — `@storybook/addon-vitest` unused
- **Inconsistent viewport mocking** — same components tested against different data per viewport
- **No `data-testid` contract** — e2e tests use fragile CSS selectors
- **Global context opacity** — 7 providers injected globally; stories don't declare dependencies
- **Viewport triplication** — Tracker/Review duplicated 3× instead of parameterized

---

## Current State Audit

### Story Inventory

| Category | Files | Count | Key Mocking |
|----------|-------|-------|--------|
| **Panels** | Review, Tracker, NoteEditor | 30 | Real `ScriptRuntime` (Web/Mobile); JSON fixtures (Chromecast) |
| **Pages** | Calendar, Collections, Planner, Syntax | 12 | Fixture content + real collections |
| **Design & Catalog** | Atoms, 14 molecules, 7 organisms | 78 | Central `fixtures.ts` + controlled state |
| **Internal Tools** | Clock, JIT Compiler, Parser | 12 | Mock config + real parsing |

### Shared Infrastructure

| File                       | Purpose                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `StorybookHost.tsx`        | 7 context providers: Theme, Audio, DebugMode, Router, Notebook, Command, Nuqs |
| `StorybookWorkbench.tsx`   | Full-screen editor + all runtime integrations                                 |
| `DesignSystem/fixtures.ts` | Central fixture data (entries, notebooks, collections, metrics, dates)        |
| `EditorShellHeader.tsx`    | Toolbar for editor views                                                      |

### E2E Test Inventory

| Category               | Files                                                             | Tests | Status                              |
| ---------------------- | ----------------------------------------------------------------- | ----- | ----------------------------------- |
| **Live App**           | journal-entry, journal-scroll, wod-index-play-button              | 15    | ✅ Functional (target localhost app) |
| **Storybook (Broken)** | jit-compiler-demo, runtime-execution/*, metric-inheritance/*      | ~85   | ❌ All target non-existent story IDs |
| **Uncertain**          | debug-storybook, history-panel-navigation, rep-scheme-inheritance | 5     | ⚠️ Story IDs may be stale           |

**Coverage Gap**: ~85 e2e tests reference non-existent story IDs. Only 15 live-app tests function. All 36 Storybook stories lack e2e coverage.

---

## Cross-Cutting Concerns

| Concern | Gap |
|---------|-----|
| **Theme switching** | No per-theme visual regression |
| **Viewport responsiveness** | Story triplication instead of parameterization |
| **Runtime lifecycle** | No shared state fixtures across panels |
| **Chromecast display** | Different fixtures for Web vs Chromecast |
| **Context providers** | Invisible global injection |
| **Navigation/routing** | No e2e coverage for view transitions |
| **Metric inheritance** | Zero working tests (all target broken story IDs) |
| **Accessibility** | Violations not enforced (mode: 'todo') |

---

## Problems Identified

| Problem | Impact |
|---------|---------|
| **P1: Orphaned Story IDs** | ~85 e2e tests target non-existent stories — all dead code |
| **P2: No `play()` tests** | `@storybook/addon-vitest` unused; zero interaction coverage |
| **P3: Viewport triplication** | Tracker/Review duplicated 3× each; changes require sync across files |
| **P4: Inconsistent mocking** | Same components tested against different data shapes per viewport |
| **P5: No `data-testid` contract** | E2e tests rely on fragile CSS selectors like `.font-mono.font-bold` |
| **P6: Global context opacity** | 7 providers injected globally; stories don't declare dependencies |
| **P7: No shared state fixtures** | Each panel builds its own runtime; can't verify Plan→Track→Review consistency |

---

## C4 Architecture Model

### Level 1: System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                       WOD Wiki Test System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │   Developer   │    │   CI Runner  │    │  Visual Review   │    │
│  │  (local dev)  │    │  (GitHub     │    │  (Chromatic /    │    │
│  │              │    │   Actions)   │    │   Percy)         │    │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘    │
│         │                   │                      │              │
│         ▼                   ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              Storybook Test Surface                      │     │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │     │
│  │  │ Unit Tests │  │ E2E Tests │  │ Visual Regression │   │     │
│  │  │ (play())  │  │(Playwright)│  │    (screenshots)  │   │     │
│  │  └───────────┘  └───────────┘  └───────────────────┘   │     │
│  └─────────────────────────────────────────────────────────┘     │
│         │                   │                      │              │
│         ▼                   ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                  Component Library                       │     │
│  │  Parser ─► Runtime ─► Fragments ─► UI Components        │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Storybook Test Surface                        │
│                                                                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Story Catalog   │  │  Test Harnesses   │  │  E2E Test Suite    │  │
│  │                  │  │                    │  │                    │  │
│  │ DesignSystem/    │  │ RuntimeFixtures/   │  │ Playwright tests   │  │
│  │ Panels/          │  │ ViewportMatrix/    │  │ targeting Storybook│  │
│  │ Pages/           │  │ ThemeMatrix/       │  │ iframe URLs        │  │
│  │ Syntax/          │  │ StateFactory/      │  │                    │  │
│  │ TestBench/       │  │                    │  │ Page Objects       │  │
│  │                  │  │                    │  │ Assertion Helpers  │  │
│  └────────┬─────────┘  └────────┬───────────┘  └────────┬───────────┘  │
│           │                      │                        │              │
│           ▼                      ▼                        ▼              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Shared Test Infrastructure                      │  │
│  │                                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │  │
│  │  │ StorybookHost │  │ Fixtures     │  │ data-testid         │    │  │
│  │  │ (providers)   │  │ (central)    │  │ Contract            │    │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Level 3: Component Diagram — Story Layers

This is the **proposed** story organization. Stories are organized into 5 layers by their testing purpose:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  Layer 5: ACCEPTANCE STORIES  (e2e target)                           │
│  ─────────────────────────────────────────                           │
│  Full user journeys composed from real components + real runtime.     │
│  These are what Playwright e2e tests target.                          │
│                                                                       │
│  stories/acceptance/                                                  │
│  ├── WorkoutExecution.stories.tsx    (Plan→Track→Review flow)        │
│  ├── RuntimeCrossFit.stories.tsx     (Fran, Annie, Barbara...)       │
│  ├── CollectionBrowsing.stories.tsx  (Browse→Select→Run)             │
│  └── JournalEditing.stories.tsx      (Create→Edit→Save→Review)       │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Layer 4: INTEGRATION STORIES  (play() interaction tests)            │
│  ─────────────────────────────────────────────────                    │
│  Multi-component compositions with interaction tests. Play functions  │
│  verify behavior. These test cross-cutting provider interactions.     │
│                                                                       │
│  stories/integration/                                                 │
│  ├── WorkbenchViewTransitions.stories.tsx  (Plan↔Track↔Review tabs)  │
│  ├── CommandPaletteNavigation.stories.tsx  (open→search→select)      │
│  ├── ThemeTransitions.stories.tsx          (light↔dark on all panels)│
│  └── RuntimeLifecycle.stories.tsx          (idle→active→complete)     │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Layer 3: PANEL / PAGE STORIES  (visual + viewport matrix)           │
│  ──────────────────────────────────────────────────────               │
│  Full panels and pages. Parameterized by viewport, theme, and state.  │
│  No play() functions — pure visual regression targets.                │
│                                                                       │
│  stories/panels/                                                      │
│  ├── Tracker/                   ← Interface-based subdirectory        │
│  │   ├── _contract.ts           ← Shared scenarios for all viewports  │
│  │   ├── Web.stories.tsx        ← Spreads contract + web-only         │
│  │   ├── Mobile.stories.tsx     ← Spreads contract + mobile-only      │
│  │   └── Chromecast.stories.tsx ← Spreads contract + cast-only        │
│  ├── Review/                    ← Same pattern                        │
│  │   ├── _contract.ts                                                  │
│  │   ├── Web.stories.tsx                                               │
│  │   ├── Mobile.stories.tsx                                            │
│  │   └── Chromecast.stories.tsx                                        │
│  ├── NoteEditor/                                                       │
│  │   ├── _contract.ts                                                  │
│  │   ├── Web.stories.tsx                                               │
│  │   └── Mobile.stories.tsx                                            │
│  ├── Calendar.stories.tsx                                              │
│  ├── Collections.stories.tsx                                           │
│  └── Planner.stories.tsx                                               │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Layer 2: ORGANISM / MOLECULE STORIES  (component catalog)           │
│  ──────────────────────────────────────────────────────               │
│  Single components with controlled props. Visual catalog for design   │
│  review. Optionally with play() for interaction validation.           │
│                                                                       │
│  stories/catalog/                                                     │
│  ├── organisms/     (TimerStackView, PanelGrid, CommandPalette, ...) │
│  └── molecules/     (MetricPill, CalendarWidget, CollectionCard, ..) │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Layer 1: ATOM STORIES + DESIGN TOKENS  (visual reference)           │
│  ──────────────────────────────────────────────────                   │
│  Primitives and design tokens. No behavior, pure visual.              │
│                                                                       │
│  stories/atoms/                                                       │
│  ├── Atoms.stories.tsx          (Button, Badge, Card, Dialog, ...)   │
│  └── DesignTokens.stories.tsx   (colors, spacing, typography)        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Level 3: Component Diagram — E2E Test Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  E2E Test Suite (Playwright)                                          │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Smoke Tests                                                    │  │
│  │  Verify Storybook loads and stories render without console      │  │
│  │  errors. Target: ALL acceptance stories.                        │  │
│  │  e2e/smoke/storybook-health.e2e.ts                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Runtime Execution Tests                                        │  │
│  │  Validate workout execution state machine via acceptance        │  │
│  │  stories. Target: stories/acceptance/RuntimeCrossFit            │  │
│  │  e2e/runtime-execution/*.e2e.ts                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  User Journey Tests                                             │  │
│  │  End-to-end user flows through composed acceptance stories.     │  │
│  │  Target: stories/acceptance/WorkoutExecution                    │  │
│  │  e2e/journeys/*.e2e.ts                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Live App Tests                                                 │  │
│  │  Tests against the running playground app (not Storybook).      │  │
│  │  Target: localhost:5173 / localhost:5174                         │  │
│  │  e2e/live-app/*.e2e.ts                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Shared Infrastructure                                          │  │
│  │                                                                  │  │
│  │  e2e/pages/           Page Object Models                        │  │
│  │  e2e/utils/           Assertion & runtime helpers               │  │
│  │  e2e/fixtures/        Workout data & validation steps           │  │
│  │  e2e/contracts/       data-testid → component mapping           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Level 4: Code Diagram — Story Composition

This diagram shows how a single acceptance story is composed from shared infrastructure:

```
stories/acceptance/RuntimeCrossFit.stories.tsx
│
├── imports RuntimeStateFactory          ← NEW: creates deterministic runtime states
│   ├── .forWorkout('fran')              ← parses + compiles workout
│   ├── .atStep(3)                       ← advances to step 3
│   └── .snapshot()                      ← returns frozen RuntimeState
│
├── imports ViewportDecorator            ← NEW: parameterized viewport matrix
│   ├── parameters.viewport = 'desktop'
│   ├── parameters.viewport = 'mobile'
│   └── parameters.viewport = 'chromecast'
│
├── imports ThemeDecorator               ← NEW: parameterized theme
│   ├── parameters.theme = 'light'
│   └── parameters.theme = 'dark'
│
├── imports StorybookHost                ← EXISTING: context providers
│
├── renders <Workbench>                  ← EXISTING: real component
│   ├── data-testid="workbench-root"     ← NEW: testid contract
│   ├── <Tracker data-testid="tracker-panel" />
│   ├── <Review data-testid="review-panel" />
│   └── <NoteEditor data-testid="editor-panel" />
│
└── play: async ({ canvasElement }) =>   ← NEW: interaction test
    ├── click "Start Workout"
    ├── await state == 'active'
    ├── click "Next Block" × 3
    ├── verify round == 2
    └── screenshot('fran-round-2')
```

---

## Proposed Structure

### Directory Layout

**Layer 1: `atoms/`** — Design primitives (Atoms.stories.tsx, DesignTokens.stories.tsx)

**Layer 2: `catalog/`** — Component catalog (molecules/, organisms/). When multiple organisms implement the same interface, use interface-based subdirectory grouping (see below).

**Layer 3: `panels/`** — Full panels, **interface-based subdirectories** for viewport variants. Viewport implementations share a `_contract.ts` that defines required scenarios; each implementation spreads the contract and adds platform-specific stories.

```
panels/
├── Tracker/
│   ├── _contract.ts           ← shared test scenarios for all Tracker implementations
│   ├── Web.stories.tsx        ← spreads contract + desktop-specific
│   ├── Mobile.stories.tsx     ← spreads contract + mobile-specific
│   └── Chromecast.stories.tsx ← spreads contract + cast-specific
├── Review/         (same pattern)
├── NoteEditor/     (same pattern, no Chromecast)
├── Calendar.stories.tsx
├── Collections.stories.tsx
└── Planner.stories.tsx
```

**Layer 4: `integration/`** — Cross-cutting compositions (WorkbenchViewTransitions, ThemeTransitions, RuntimeLifecycle, CommandPaletteNavigation)

**Layer 5: `acceptance/`** — E2E targets (RuntimeCrossFit, TestingWorkouts, WorkoutExecution, CollectionBrowsing)

**`_shared/`** — Shared infrastructure (StorybookHost, StorybookWorkbench, EditorShellHeader, fixtures, new: RuntimeStateFactory, ViewportDecorator, ThemeDecorator, TestIdContract)

### Interface-Based Grouping Rule

> Any time two or more story files test the same component at different viewports, themes, or configurations — or when two components implement the same interface — create a subdirectory with a `_contract.ts` file.

`_contract.ts` exports factory functions returning `StoryObj` records. Implementing files spread those records and optionally add platform-specific stories. This is **DRY for tests**: scenarios are defined once, applied everywhere.

See `docs/testing/storybook-playwright-integration.skill.md → Interface-Based Story Grouping` for patterns and code examples.

### Key New Files

**`panels/<Interface>/_contract.ts`** — Shared test scenarios for viewport/implementation families  
**`RuntimeStateFactory.ts`** — Deterministic runtime snapshots consumable by any story; eliminates per-story runtime construction  
**`TestIdContract.ts`** — Single source of truth for `data-testid` attributes shared between components and e2e tests  
**`play()` functions** — Interaction tests added to acceptance/integration stories; verify initial render before e2e handoff

---

## Migration Plan

**Phase 1** — Create acceptance stories (RuntimeCrossFit, TestingWorkouts); add `data-testid` to RuntimeTestBench; verify e2e tests pass.  
**Phase 2** — Create `panels/Tracker/`, `panels/Review/`, `panels/NoteEditor/` subdirectories; extract shared scenarios into `_contract.ts`; rewrite viewport variants as implementing files that spread the contract; delete originals.  
**Phase 3** — Create RuntimeStateFactory; add `play()` functions to acceptance & integration stories; enable addon-vitest in CI.  
**Phase 4** — Create integration stories; create TestIdContract; write new e2e tests; enforce a11y violations.  
**Phase 5** — Move fixtures.ts; create shared runtime fixtures; eliminate inline runtime construction.

| Phase | Priority | Impact |
|-------|----------|--------|
| 1 | 🔴 Immediate | Unblocks ~85 dead e2e tests |
| 2 | 🟡 Next sprint | Reduces maintenance by ~40% |
| 3 | 🟡 Next sprint | Enables Storybook-native testing |
| 4 | 🟢 Planned | Full cross-cutting coverage |
| 5 | 🟢 Planned | Data consistency |

---

## Appendix: Current Story → Proposed Story Mapping

| Current Location | Proposed Location | Change |
|-----------------|-------------------|--------|
| `stories/Syntax.stories.tsx` | `stories/panels/Syntax.stories.tsx` | Move |
| `stories/Components/NoteEditor.stories.tsx` | `stories/panels/NoteEditor/Web.stories.tsx` | Subdir + contract |
| `stories/Components/NoteEditorMobile.stories.tsx` | `stories/panels/NoteEditor/Mobile.stories.tsx` | Subdir + contract |
| `stories/Components/Review/ReviewWeb.stories.tsx` | `stories/panels/Review/Web.stories.tsx` | Subdir + contract |
| `stories/Components/Review/ReviewMobile.stories.tsx` | `stories/panels/Review/Mobile.stories.tsx` | Subdir + contract |
| `stories/Components/Review/ReviewChromecast.stories.tsx` | `stories/panels/Review/Chromecast.stories.tsx` | Subdir + contract |
| `stories/Components/Tracker/TrackerWeb.stories.tsx` | `stories/panels/Tracker/Web.stories.tsx` | Subdir + contract |
| `stories/Components/Tracker/TrackerMobile.stories.tsx` | `stories/panels/Tracker/Mobile.stories.tsx` | Subdir + contract |
| `stories/Components/Tracker/TrackerChromecast.stories.tsx` | `stories/panels/Tracker/Chromecast.stories.tsx` | Subdir + contract |
| `stories/Components/page-shells/CalendarPageShell.stories.tsx` | `stories/panels/Calendar.stories.tsx` | Move + rename |
| `stories/Components/page-shells/CollectionsPage.stories.tsx` | `stories/panels/Collections.stories.tsx` | Move + rename |
| `stories/Components/page-shells/JournalPageShell.stories.tsx` | `stories/panels/NoteEditor.stories.tsx` | Merge |
| `stories/Components/page-shells/ParallaxSection.stories.tsx` | `stories/panels/ParallaxSection.stories.tsx` | Move |
| `stories/Components/page-shells/PlannerPage.stories.tsx` | `stories/panels/Planner.stories.tsx` | Move + rename |
| `stories/DesignSystem/Atoms.stories.tsx` | `stories/atoms/Atoms.stories.tsx` | Move |
| `stories/DesignSystem/fixtures.ts` | `stories/_shared/fixtures.ts` | Move |
| `stories/DesignSystem/molecules/*` | `stories/catalog/molecules/*` | Move (keep internal structure) |
| `stories/DesignSystem/organisms/*` | `stories/catalog/organisms/*` | Move (keep internal structure) |
| `stories/StorybookHost.tsx` | `stories/_shared/StorybookHost.tsx` | Move |
| `stories/StorybookWorkbench.tsx` | `stories/_shared/StorybookWorkbench.tsx` | Move |
| `stories/EditorShellHeader.tsx` | `stories/_shared/EditorShellHeader.tsx` | Move |
| `stories/compiler/JitCompilerDemo.tsx` | `stories/_shared/JitCompilerDemo.tsx` | Move (internal tooling) |
| `stories/parsing/Parser.tsx` | `stories/_shared/Parser.tsx` | Move (internal tooling) |
| *(does not exist)* | `stories/acceptance/RuntimeCrossFit.stories.tsx` | **CREATE** |
| *(does not exist)* | `stories/acceptance/TestingWorkouts.stories.tsx` | **CREATE** |
| *(does not exist)* | `stories/acceptance/WorkoutExecution.stories.tsx` | **CREATE** |
| *(does not exist)* | `stories/integration/WorkbenchViewTransitions.stories.tsx` | **CREATE** |
| *(does not exist)* | `stories/integration/ThemeTransitions.stories.tsx` | **CREATE** |
| *(does not exist)* | `stories/_shared/RuntimeStateFactory.ts` | **CREATE** |
| *(does not exist)* | `stories/_shared/ViewportDecorator.tsx` | **CREATE** |
| *(does not exist)* | `stories/_shared/ThemeDecorator.tsx` | **CREATE** |
| *(does not exist)* | `stories/_shared/TestIdContract.ts` | **CREATE** |
