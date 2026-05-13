# Architecture Deepening Opportunities — WOD Wiki

**Date:** 2026-05-07  
**Tools:** Manual code review, dependency graph analysis, deletion test patterns  
**Scope:** `src/` — 719 TypeScript/TSX files, focused exploration of 6 architectural areas  

---

## Executive Summary

Using the **deletion test** (imagine deleting a module — if complexity vanishes, it's shallow; if it reappears across N callers, it's earning its keep) and **leverage analysis** (how much behavior sits behind the interface?), I identified **six deepening opportunities** that would increase **locality** (where bugs concentrate), **testability** (smaller test surfaces), and **AI navigability** (clearer seams).

These candidates are prioritized by impact and alignment with existing ADRs. None contradict decisions in `docs/note-editor-adr.md` or `docs/decoupling-planner-workbench.md`; most support them.

---

## 1. Deepen the **Note Persistence Module**

### Files Involved

- `src/types/content-provider.ts`
- `src/services/content/IndexedDBContentProvider.ts`
- `src/services/content/LocalStorageContentProvider.ts`
- `src/services/content/StaticContentProvider.ts`
- `src/services/content/MockContentProvider.ts`
- `src/services/db/IndexedDBService.ts`
- `src/components/Editor/NoteEditor.tsx`
- `src/components/Editor/hooks/useWodBlockResults.ts`
- `src/components/layout/WorkbenchContext.tsx`
- `src/components/layout/useWorkbenchEffects.ts`

### Problem: Shallow Seam, Leaky Abstraction

`IContentProvider` is a **real seam** — four distinct adapters exist (IndexedDB, localStorage, static, mock) — but the surrounding Note logic is **shallow**. Callers must know too much:

- **`HistoryEntry`** as a denormalized projection of Note + NoteSegment + WorkoutResult
- **`NoteSegment` versioning:** how to match new segments against existing ones, when to bump version numbers
- **`WorkoutResult` linking:** `sectionId` vs `segmentId`, latest result lookup, multi-result append
- **Attachment lifecycle:** when to fetch, when to delete, index management
- **Fallback lookup:** short ID matching, title-based search, when to use each strategy
- **Direct `indexedDBService` imports:** NoteEditor, useWorkbenchEffects, and useWodBlockResults all bypass the provider to access storage directly

### Deletion Test

Deleting `IContentProvider` would **not** eliminate complexity — it would scatter it. Complexity would reappear in every caller that currently imports `indexedDBService` directly. However, deleting `IndexedDBContentProvider` without consolidating that leakage would be painful.

### Solution: Consolidate Persistence Behind One Interface

Create a **Note Lifecycle Module** that owns all Note, NoteSegment, WorkoutResult, Attachment, and AnalyticsDataPoint behavior. All persistence happens through this module; UI code never touches storage directly.

**New interface shape** (conceptual):

```typescript
interface INoteLifecycle {
  // Load
  getNote(id: string): Promise<HistoryEntry>;
  listNotes(query?: NoteQuery): Promise<HistoryEntry[]>;
  
  // Update
  updateNoteContent(id: string, content: string): Promise<HistoryEntry>;
  appendWorkoutResult(id: string, result: WorkoutResults): Promise<HistoryEntry>;
  
  // Side effects
  saveAttachment(noteId: string, file: File): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;
  
  // Cleanup
  deleteNote(id: string): Promise<void>;
}
```

**Key shifts:**

- `IContentProvider` remains for swappable storage backends, but its complexity is **hidden inside** the Note Lifecycle module.
- `IndexedDBService`, `indexedDBService` singletons, and normalized entity management become **internal implementation details**.
- Callers (NoteEditor, WorkbenchContext, useWorkbenchEffects) ask for Note-level operations, not segment versioning or result linking.

### Benefits

- **Locality:** Note versioning, result append, attachment storage, and analytics persistence are **one place to change**.
- **Leverage:** UI modules stop asking "how do I save a note with multiple result revisions?" and start asking "save this workout result for this note" — the complexity is hidden.
- **Tests improve:**
  - Provider adapter tests focus purely on storage bridge behavior (CRUD, transactions).
  - Note lifecycle tests cover versioning, result append, attachment lifecycle, and the full denormalized projection once.
  - UI tests shrink because they no longer mock IndexedDB or worry about segment matching.

---

## 2. Deepen the **Workout Document Module**

### Files Involved

- `src/components/Editor/utils/sectionParser.ts`
- `src/components/Editor/utils/blockDetection.ts`
- `src/components/Editor/utils/parseWodBlock.ts`
- `src/components/Editor/extensions/section-state.ts`
- `src/components/Editor/NoteEditor.tsx`
- `src/components/layout/WorkbenchContext.tsx`
- `src/components/layout/useWorkbenchEffects.ts`
- `src/components/Editor/overlays/WodCompanion.tsx`
- `src/components/Editor/overlays/InlineCommandBar.tsx`
- `src/components/Editor/overlays/EditorCastBridge.tsx`
- `src/components/Editor/types/index.ts`
- `src/components/Editor/types/section.ts`

### Problem: Shallow Semantics, Reconstructed State

The Note Editor ADR (`docs/note-editor-adr.md`) decided on **a single CodeMirror 6 instance** — the right call. But the **document semantics around it** are shallow. Many modules rebuild their own view:

- **`sectionToWodBlock()`** — rebuilds a WodBlock from an EditorSection for callback compatibility
- **`getSection()`** — hunts through the sectionField to find a section by ID
- **`buildWodBlock()`** — builds a runtime-ready WodBlock from section data in three different places (WodCompanion, InlineCommandBar, EditorCastBridge)
- **Line mapping:** callers toggle between 0-indexed and 1-indexed, remembering `section.startLine - 1` for WodBlock compat
- **Section ID stability:** callers must know IDs are generated by content hash; broken deep links require fallback matching
- **Dialect detection:** embedded in `blockDialect()`, called in sectionParser, also guessed in WodCompanion

Callers must remember:

- Difference between `rawContent` (includes backticks/frontmatter delimiters) and `displayContent`
- When `statements` exist vs. must be parsed lazily
- Which sections hide metrics like `group` and `lap`
- How deep links shift when content is edited

### Deletion Test

Deleting `parseDocumentSections()` would **not** vanish complexity. It would reappear as every caller reconstructs its own section parsing, ID matching, and WodBlock building. Complexity is currently there but **scattered** across editor, Workbench, runtime launch, and cast modules.

### Solution: Canonical Document Projection

Create a **Workout Document Module** that parses markdown once and projects all facts callers need:

- Sections with stable IDs
- WOD sections with parsed statements and dialect
- Line-to-section mapping
- Document items (for use in structs like `useWorkbenchEffects`)
- Runtime-ready WodBlock projection

**New interface shape** (conceptual):

```typescript
interface IWorkoutDocument {
  // Parsed state
  sections: Section[];           // immutable after parse
  wodSections: WodSection[];     // immutable subset
  lineMap: Map<number, SectionId>; // line → section lookup
  documentItems: DocumentItem[]; // for iteration

  // Queries
  sectionAt(line: number): Section | null;
  wodSectionForBlock(blockId: string): WodSection | null;
  runtimeBlockReady(blockId: string): WodBlock | null;
  
  // Stability
  matchSectionIds(oldDoc: IWorkoutDocument): void; // healing after edits
}
```

**Key shifts:**

- `sectionParser`, `blockDetection`, `parseWodBlock` become **internal implementation**.
- Callers query "section at cursor line" or "runtime-ready block for cast" instead of rebuilding logic.
- Deep link healing (ID shifting due to content change) is **one place**, not scattered across Workbench route matching.

### Benefits

- **Locality:** Section identity, line mapping, dialect detection, and WOD block parsing live together. A bug in ID stability or deep link healing is **fixed once**.
- **Leverage:** Editor, Workbench, runtime launch, and cast selection all consume the same canonical projection.
- **Tests improve:**
  - Document structure tests become pure: given content, assert sections, line map, and runtime-ready blocks.
  - Deep link healing tests are isolated — no need to construct full Workbench to test a broken ID recovery.
  - UI tests shrink; they ask for "section at line N" instead of reconstructing parsing logic.

### ADR Alignment

Supports `docs/note-editor-adr.md` — this deepening **implements** the single-instance editor decision by owning document semantics consistently.

---

## 3. Deepen the **Runtime Session Module**

### Files Involved

- `src/runtime/ScriptRuntime.ts`
- `src/runtime/ExecutionContext.ts`
- `src/runtime/RuntimeStack.ts`
- `src/runtime/RuntimeBlock.ts`
- `src/runtime/BehaviorContext.ts`
- `src/runtime/contracts/IScriptRuntime.ts`
- `src/runtime/contracts/IRuntimeBlock.ts`
- `src/runtime/contracts/IBehaviorContext.ts`
- `src/runtime/actions/**`
- `src/runtime/events/**`
- `src/components/workbench/useWorkbenchRuntime.ts`
- `src/components/layout/useWorkbenchEffects.ts`

### Problem: Wide Contract, Circular Dependencies

`IScriptRuntime` exposes:

- Stack, clock, event bus, JIT compiler
- Action turn execution (`do()`, `doAll()`, `handle()`)
- Output statement tracking and listeners
- Tracker listeners
- Stack observers
- Analytics engine attachment
- Disposal

The **deletion test** shows this module is earning its keep (if deleted, complexity reappears across runtime consumers and tests). But the **interface is too wide**, and the **implementation holds critical hidden behavior**:

- Frozen turns during action processing
- Stack-settled notification for Chromecast snapshots
- System output emission on push/pop
- Analytics finalization

Callers must navigate all these concerns to test a simple "start → next → complete" flow.

### Deletion Test

Deleting `ScriptRuntime` would scatter complexity across all callers — runtime consumers would need to orchestrate stack, event bus, action turns, output collection, and analytics themselves. The module is **deep** in intent but **shallow in interface**.

### Solution: Runtime Session Abstraction

Create a **Runtime Session Module** with a smaller, task-focused interface:

**New interface shape** (conceptual):

```typescript
interface IRuntimeSession {
  // Lifecycle
  start(): void;
  pause(): void;
  resume(): void;
  next(): void;
  stop(): void;
  
  // Observation
  onOutputStatement(callback: (output: IOutputStatement) => void): Unsubscribe;
  onStackChange(callback: (snapshot: StackSnapshot) => void): Unsubscribe;
  onExecutionStatus(callback: (status: ExecutionStatus) => void): Unsubscribe;
  
  // State
  status: ExecutionStatus;
  elapsed: number;
  stackDepth: number;
  
  // Cleanup
  dispose(): void;
}
```

**Key shifts:**

- Stack, event bus, action-turn machinery, and analytics become **internal implementation**.
- Behaviors continue to interact with blocks and context at the current level of granularity.
- Callers (Workbench, tests, cast) interact with session start/stop/next semantics, not action mechanics.

### Benefits

- **Locality:** Action-turn behavior, completion sweep timing, stack observer semantics, and analytics finalization become runtime-session internals. A bug in "did the session freeze turns correctly?" is **one place**.
- **Leverage:** Workbench and tests exercise runtime behavior without wiring individual stack/event/action pieces.
- **Tests improve:**
  - Integration tests can verify "start → next → complete → output → analytics finalized" with one fixture.
  - Behavior tests remain unchanged; they still interact with block/context directly.
  - Workbench tests shrink; they no longer construct partial mocks of `IRuntimeBlock`, event bus, and stack.

### ADR Alignment

No conflict. Complements the existing runtime architecture.

### Deep Dive

See [`runtime-session-implementation-deep-dive-2026-05-07.md`](./runtime-session-implementation-deep-dive-2026-05-07.md) for the proposed implementation shape, exposure model, testing impact, migration plan, and open decisions.

---

## 4. Deepen the **JIT Compilation Module**

### Files Involved

- `src/runtime/compiler/JitCompiler.ts`
- `src/runtime/compiler/BlockBuilder.ts`
- `src/runtime/contracts/IRuntimeBlockStrategy.ts`
- `src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts`
- `src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts`
- `src/runtime/compiler/strategies/components/GenericTimerStrategy.ts`
- `src/runtime/compiler/strategies/components/GenericLoopStrategy.ts`
- `src/runtime/compiler/strategies/components/GenericGroupStrategy.ts`
- `src/runtime/compiler/strategies/enhancements/ChildrenStrategy.ts`
- `src/runtime/compiler/strategies/enhancements/SoundStrategy.ts`
- `src/runtime/compiler/strategies/enhancements/ReportOutputStrategy.ts`
- `src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts`
- `src/runtime/services/runtimeServices.ts`
- `src/services/DialectRegistry.ts`
- `src/dialects/*.ts`

### Problem: Shallow Strategy Seam, Implicit Composition Rules

The compiler uses a **strategy pattern**, but the **strategy seam is shallow**. Each strategy must know:

- **Priority ordering** — which strategy runs first, which last
- **Metrics semantics** — which metrics imply which behavior (rounds + timer + children = EMOM?)
- **Builder state mutation** — what has already been set by earlier strategies
- **Conflict avoidance** — `hasTimerBehavior()`, `hasRoundConfig()`, `removeBehavior()`
- **Aspect composition** — timer + repeater + exit behavior in what order?

`BlockBuilder` accumulates state through a fluent API, but strategies still share implicit ordering knowledge. If a new strategy is added, every existing strategy must account for it.

### Deletion Test

Deleting individual strategies would not vanish complexity — it would distribute. Composition rules are tacit across strategy files, not concentrated.

### Solution: Concentrate Composition Rules

Create a **Compilation Orchestrator** that owns composition **rules** and **ordering**, not implementation. Strategies describe what they need; the orchestrator decides if/when they run.

**New interface shape** (conceptual):

```typescript
interface ICompilationOrchestrator {
  // Rules engine
  registerPattern(name: string, matcher: (s: ICodeStatement[]) => boolean, 
                  builder: (b: BlockBuilder, s: ICodeStatement[]) => void): void;
  
  // Composition
  compile(nodes: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | null;
}

// Usage
orchestrator.registerPattern('amrap', 
  (stmts) => hasRounds(stmts) && hasTimer(stmts),
  (builder, stmts) => { builder.asTimer(...).asRepeater(...); });

orchestrator.registerPattern('emom',
  (stmts) => isImplicitEmom(stmts),
  (builder, stmts) => { builder.asTimer(...).asRepeater(...); });
```

**Key shifts:**

- Each pattern describes intent (AMRAP, EMOM, FOR TIME) once, not implicit in cross-strategy knowledge.
- Conflict resolution (timer + rounds = what?) happens in orchestrator, not in individual strategy checks.
- Aspect ordering (timer setup → repeater setup → exit behavior) is **one decision**, not scattered.

### Benefits

- **Locality:** Compile-order and conflict rules live in one module. A bug in "does EMOM build before rest injection?" is **one place to fix**.
- **Leverage:** Adding a workout pattern becomes "describe the pattern and ask what to build", not "understand every existing strategy's side effects".
- **Tests improve:**
  - Compilation tests assert a **stable recipe**: for AMRAP, assert `[AmrapLogic → Timer → Repeater → Exit]`.
  - Strategy tests focus on behavior contribution, not ordering.
  - Regressions (e.g., "rest doesn't work with AMRAP anymore") are caught by **recipe tests**, not scattered integration tests.

---

## 5. Deepen the **Workbench Orchestration Module**

### Files Involved

- `src/components/layout/Workbench.tsx`
- `src/components/layout/WorkbenchContext.tsx`
- `src/components/layout/useWorkbenchEffects.ts`
- `src/components/layout/workbenchSyncStore.ts`
- `src/components/workbench/useWorkbenchRuntime.ts`
- `src/components/layout/RuntimeLifecycleProvider.tsx`
- `src/panels/plan-panel.tsx`
- `src/panels/track-panel.tsx`
- `src/components/review-grid/ReviewGrid.tsx`
- `docs/decoupling-planner-workbench.md`

### Problem: God Module, Tangled State Management, Mixed Concerns

Workbench is carrying **multiple concerns at once**:

- **Note loading and saving** — `content`, `saveState`, `currentEntry`
- **Content parsing** — `sections`, `blocks`, `activeBlockId` (cursor)
- **Route state** — `selectedBlockId` (from URL), `viewMode` (from URL)
- **Runtime initialization** — `initializeRuntime`, `disposeRuntime`
- **Execution controls** — `start`, `pause`, `next`, `stop`
- **Analytics derivation** — `analyticsSegments`, `analyticsGroups`
- **Analytics persistence** — IndexedDB analytics points save
- **Attachment handling** — `addAttachment`, `deleteAttachment`
- **Cast synchronization** — `ProjectionSyncContext`
- **Panel layout** — `panelLayouts`, `expandPanel`, `collapsePanel`
- **UI chrome** — tutorial state, debug mode, header actions

State lives in:

- **React Context** — WorkbenchContext (content, blocks, results)
- **Zustand** — workbenchSyncStore (runtime, execution, analytics)
- **URL params** — route state
- **Local refs/effects** — analytics polling, wake lock, cast projection sync

The friction here is **real and documented** in `docs/decoupling-planner-workbench.md`.

### Deletion Test

Deleting Workbench would scatter behavior across many consumers. But the **current seam is so wide** that testing one user flow requires constructing too much state.

### Solution: Decouple Planner from Runtime Host

Per `docs/decoupling-planner-workbench.md`, split into two clearer modules:

**Planner Module** (Note editing and results browsing):
- Content loading/saving
- Section parsing
- Attachment handling
- History entry listing
- Note metadata (title, tags)

**Runtime Host Module** (Workout execution):
- Selected WOD block mounting
- Runtime lifecycle (init, dispose)
- Execution controls (start, pause, next, stop)
- Output collection
- Analytics derivation and persistence
- Chromecast projection sync

**Workbench becomes composition** of Planner + Runtime Host.

**Key shifts:**

- Planner owns `WorkbenchContext` state (content, sections, blocks, attachments).
- Runtime Host owns `RuntimeLifecycleContext` and Zustand store (runtime, execution, analytics).
- Workbench wires the two: "user clicked Run" → Planner says "save content" → Runtime Host mounts.

### Benefits

- **Locality:** Runtime lifecycle bugs don't mix with Note save bugs. Each module has **one job**.
- **Leverage:** Runtime Host can be mounted from a WOD section card in collections without the full Note editor. Planner can be used to edit static Notes without a runtime.
- **Tests improve:**
  - Planner tests cover autosave, attachment lifecycle, and content parsing in isolation.
  - Runtime Host tests cover start/pause/next/complete/review without constructing the full Workbench.
  - Workbench tests focus on navigation and transitions, not behavior.
- **UI tests shrink** — they can mount Planner or Runtime Host directly instead of the full Workbench for focused tests.

### ADR Alignment

**Directly supports** `docs/decoupling-planner-workbench.md`. This is the outlined design.

---

## 6. Deepen the **Metric Presentation Module**

### Files Involved

- `src/views/runtime/MetricVisualizer.tsx`
- `src/views/runtime/metricColorMap.ts`
- `src/components/metrics/MetricSourceRow.tsx`
- `src/components/history/RuntimeHistoryLog.tsx`
- `src/panels/timer-panel.tsx`
- `src/runtime/compiler/utils/LabelComposer.ts`
- `src/components/review-grid/MetricPill.tsx`
- `src/components/review-grid/gridPresets.ts`
- `src/components/review-grid/GridHeader.tsx`

### Problem: Scattered Display Policy, Reconstructed Rules

Metric rendering rules are **scattered across multiple modules**:

- **Rest detection** — in `metricColorMap.isRestMetric()`
- **Structural metrics filtering** — hardcoded in `MetricVisualizer`, `MetricSourceRow`, `RuntimeHistoryLog`, `timer-panel`
  - `if (type === 'group' && (image === '+' || image === '-')) return false;`
  - `return type !== 'lap';`
- **Rounds label formatting** — in `MetricVisualizer.formatTokenValue()` ("3 Rounds" vs "3")
- **Icons and colors** — imported directly by review grid and statement list
- **Comment vs. action rendering** — embedded in `MetricVisualizer` with `origin === 'parser'` check
- **LabelComposer** — has its own metric exclusion rules

Callers must know:

- Which metrics are displayable vs. structural (group, lap)
- How to detect rest
- That comments are styled differently from action items
- That rounds need a label suffix (UX-03)

### Deletion Test

Deleting `metricColorMap` would scatter color/icon logic. Deleting `MetricVisualizer` would replicate formatting. But **the policy rules themselves are shallow** — scattered across six places, making UX changes hard to locate.

### Solution: Unified Display Policy Module

Create a **Metric Presentation Policy Module** that owns all display rules:

**New interface shape** (conceptual):

```typescript
interface IMetricDisplayPolicy {
  // Normalize
  normalizeMetric(metric: IMetric): DisplayMetric | null;
  
  // Classify
  isStructural(metric: IMetric): boolean;  // group, lap
  isHidden(metric: IMetric): boolean;      // depends on context
  isComment(metric: IMetric): boolean;
  isRest(metric: IMetric): boolean;
  
  // Format
  getLabel(metric: IMetric): string;       // "3 Rounds" vs "3"
  getIcon(metric: IMetric): string | null;
  getColorClasses(metric: IMetric): string;
  
  // Render hint
  renderAs(metric: IMetric): 'badge' | 'label' | 'comment' | 'action';
}
```

**Key shifts:**

- `MetricVisualizer` delegates to policy for classification and formatting.
- Review grid, history, and timer all consume **one policy**.
- The "hide lap" or "rounds badge text" decision is **one place**.

### Benefits

- **Locality:** UX changes like "hide lap" or "render effort='Rest' as pause icon" happen **once**.
- **Leverage:** Timer, history, review grid, and statement display all consume consistent display tokens.
- **Tests improve:**
  - Display policy tests are **pure** — given a metric, assert label, icon, color, render hint.
  - React tests only verify layout; they don't reimplement the policy rules.
  - A new metric type (e.g., `MetricType.Cadence`) is added to the policy once; all consumers automatically support it.

### Deep Dive

See [`metric-presentation-implementation-deep-dive-2026-05-07.md`](./metric-presentation-implementation-deep-dive-2026-05-07.md) for the proposed implementation shape, exposure model, caller impact, testing impact, migration plan, and open decisions.

---

## Summary Table

| Candidate | Key Friction | Primary Benefit | ADR Alignment |
|-----------|--------------|-----------------|---------------|
| **1. Note Persistence** | Leaky abstraction, direct IndexedDB imports | Locality: persistence rules in one place | Supports `note-editor-adr` |
| **2. Workout Document** | Reconstructed state across 6 modules | Locality: document semantics once | Supports `note-editor-adr` |
| **3. Runtime Session** | Wide contract, hidden turn mechanics | Leverage: callers ask for session semantics | No conflict |
| **4. JIT Compilation** | Implicit composition rules across strategies | Locality: compile rules in one place | No conflict |
| **5. Workbench Orchestration** | God module, mixed concerns | Leverage: Planner and Host reusable separately | Directly supports `decoupling-planner-workbench` |
| **6. Metric Presentation** | Display rules scattered across 6 places | Locality: policy once; UX changes easy | No conflict |

---

## Recommended Next Steps

1. **Pick a candidate** based on your priority:
   - **High impact, existing ADR support:** Candidates 1, 2, 5 (Note persistence, Workout document, Workbench)
   - **Well-scoped, no dependencies:** Candidates 4, 6 (JIT compilation, Metric presentation)
   - **Unlocks testing:** Candidate 3 (Runtime session)

2. **Grilling session** (if desired):
   - Apply the `grill-with-docs` skill to stress-test one candidate against domain language and existing decisions.
   - Use this doc as the starting point for terminology and architecture questions.

3. **Implementation path:**
   - Start with interface design (what does the module's seam look like?).
   - Move internal implementation and callers in parallel.
   - Write tests at the new seam; old tests fade away.

---

## References

- **Domain Model:** `docs/domain-model/overview.md`, `docs/domain-model/entities.md`
- **Existing ADRs:** `docs/note-editor-adr.md`, `docs/decoupling-planner-workbench.md`
- **Architecture Debt Report:** `docs/task/architecture-debt-report-2026-04-29.md`
- **Skill Documentation:** `/home/serge/.pi/agent/skills/improve-codebase-architecture/` — LANGUAGE.md, INTERFACE-DESIGN.md

