# Feature: Consistent Parallax — A Guided Tour of WOD Wiki

**Brainstorm Date:** March 21, 2026
**Status:** Draft
**Issue:** Design a coherent parallax scrolling experience that tells the full story of what wod.wiki does — from writing a workout in plain text, through live tracking, to reviewing collected metrics — using the page-shell and panel abstractions established in `brainstorm-view-panel-runtime-coupling.md`.

---

## 1. Requirement Analysis

- **Core Problem**: The existing `HomePage.tsx` (playground) implements a 4-act parallax flow (Editor → Tracker → Review → Notebook) but it is a monolithic ~1000-line file with inline step data, ad-hoc runtime binding, and no consistent design language for guiding users through the product story. The parallax primitives (`ParallaxSection`, `ScopedRuntimeProvider`, `DocsPageShell`) are now extracted into `src/panels/page-shells/`, but the content layer — the actual slides, narrative copy, interactive triggers, and cross-section transitions — has not been designed as a unified experience. This brainstorm defines the **content architecture** for a consistent parallax tour that leverages the panel abstractions to tell the wod.wiki story across five narrative acts: (1) Journal your workout with WodScript, (2) Track it live with the timer, (3) Rest and auto-advance, (4) Review collected metrics, (5) Return to the editor with records.

- **Success Criteria**:
  - A clear slide-by-slide narrative that walks the user through a single workout session (`5 Pushups → :10 Rest → 5 Pushups`) from editor to review.
  - Each slide is a navigable section with anchor links allowing deep-linking to any point in the story.
  - Interactive elements are embedded inline: Run button triggers runtime start and scrolls to the tracker slide; Next button advances the runtime and scrolls to the next slide; runtime completion auto-scrolls to the review slide.
  - The parallax sticky panel transitions between Editor Panel → Track Panel → Review Panel → Editor Panel as the user scrolls through the narrative.
  - A follow-on Collections section showcases workout collections with a command-palette integration.
  - A Chromecast feature callout section highlights the cast-to-TV capability.
  - A Deep Dive section links to syntax reference, playground, and learning resources.
  - Mobile-responsive: narrative text stacks below sticky panel, reduced-motion fallback preserves content accessibility.

- **Scope**: Architectural brainstorm — no code changes. Produce analysis document and visual canvas.

- **User Impact**: First-time visitors experience a guided, interactive walkthrough that demonstrates the full wod.wiki lifecycle without requiring them to read documentation or find features themselves. The parallax format keeps the interactive panel visible while scrolling narrative text explains each step, creating a "show and tell" experience that converts visitors into users.

### Summary

The view-panel-runtime-coupling brainstorm established the infrastructure layer (page shells, scoped runtimes, parallax primitives). This brainstorm builds on that foundation to define the **content architecture** — slide sequencing, narrative copy structure, interactive trigger points, and panel transition choreography — for a consistent parallax experience that serves as the primary landing page for wod.wiki.

---

## 2. Code Exploration

### Relevant Files

| File                                                   | Role                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `playground/src/HomePage.tsx`                          | Current home page (~1006 lines). Implements 4-act parallax with FrozenEditorPanel, LiveTrackerPanel, FrozenReviewPanel, FrozenNotebookPanel. Contains inline step data and ad-hoc runtime binding via module-level refs. |
| `src/panels/page-shells/ParallaxSection.tsx`           | Extracted parallax primitive. IntersectionObserver step detection, sticky panel layout (60/40 desktop, stacked mobile), `onStepChange` callback.                                                                         |
| `src/panels/page-shells/DocsPageShell.tsx`             | Documentation page shell. Composes HeroBanner + StickyNavPanel + Sections with optional ScopedRuntimeProvider.                                                                                                           |
| `src/panels/page-shells/ScopedRuntimeProvider.tsx`     | Isolated runtime scope wrapper. Safe to nest; each instance has its own SubscriptionManager.                                                                                                                             |
| `src/panels/page-shells/HeroBanner.tsx`                | Hero section with gradient/image/plain variants.                                                                                                                                                                         |
| `src/panels/page-shells/StickyNavPanel.tsx`            | Scroll-tracking navigation bar. `hero-follow` or `top-fixed` variants.                                                                                                                                                   |
| `src/panels/page-shells/ScrollSection.tsx`             | Simple bounded scrollable content area.                                                                                                                                                                                  |
| `src/panels/panel-system/viewDescriptors.ts`           | View factory: Plan (editor), Track (timer + history), Review (grid). Span-based layout (1/3, 2/3, 3/3).                                                                                                                  |
| `src/components/Editor/overlays/RuntimeTimerPanel.tsx` | Timer component: start/pause/stop, lap/next, countdown/count-up display.                                                                                                                                                 |
| `src/components/review-grid/ReviewGrid.tsx`            | Analytics grid: Recharts visualization of workout segments and metrics.                                                                                                                                                  |
| `src/services/AnalyticsTransformer.ts`                 | `getAnalyticsFromRuntime()` — converts runtime output to UI-ready segments with metrics.                                                                                                                                 |
| `playground/src/services/commandStrategies.tsx`        | Command palette strategies: global search, collection search, statement builder.                                                                                                                                         |
| `src/repositories/wod-collections.ts`                  | Collection data: built-in workout collections (CrossFit benchmarks, etc.).                                                                                                                                               |
| `src/components/workbench/CollectionItemList.tsx`      | Collection item browser with category filtering.                                                                                                                                                                         |
| `docs/brainstorm-view-panel-runtime-coupling.md`       | Prior brainstorm establishing the Workbench → View → Panel hierarchy and page shell architecture.                                                                                                                        |

### Similar Existing Features

| Feature                       | Location                                                                               | Relevance                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4-Act HomePage**            | `playground/src/HomePage.tsx`                                                          | Current implementation of the parallax tour. Defines EditorParallaxSection, TrackerParallaxSection, ReviewParallaxSection, NotebookParallaxSection as inline sub-components with step arrays. |
| **GettingStartedPage**        | `playground/src/GettingStartedPage.tsx`                                                | 6-level progressive tutorial. Uses LessonSection with tabbed examples and `enableInlineRuntime={true}`. Demonstrates the pattern of embedded interactive content alongside explanatory text.  |
| **SyntaxPage**                | `playground/src/SyntaxPage.tsx`                                                        | Reference page for WodScript syntax. Demonstrates another content layout using the same editor component.                                                                                     |
| **ParallaxSection primitive** | `src/panels/page-shells/ParallaxSection.tsx`                                           | Desktop: sticky panel (60%) + scrolling steps (40%). Mobile: sticky top (40vh) + stacked steps. Transitions use `duration-500`, `translate-y-3`, `opacity-[0.05]`.                            |
| **Chromecast receiver**       | `playground/src/receiver-rpc.tsx`                                                      | WebRTC-based cast receiver. Demonstrates the cast-to-TV workflow described in the feature callout section.                                                                                    |
| **Collection browser**        | `src/app/pages/CollectionsPage.tsx`, `src/components/workbench/CollectionItemList.tsx` | Existing collection browsing UI with category filter and workout previews.                                                                                                                    |

### Key Patterns

| Pattern                           | How It Applies                                                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ParallaxStepDescriptor**        | Each slide in the narrative maps to a step descriptor with `content` (React node), `label`, and optional `id`. The sticky panel renders a different component based on the active step index.              |
| **ScopedRuntimeProvider nesting** | The tracker slides need a live runtime. A `ScopedRuntimeProvider` wraps only the tracker section, providing an isolated runtime that initializes on scroll-into-view and disposes on scroll-out.           |
| **Scroll-Runtime Bridge**         | Runtime events (start, block transition, complete) trigger scroll position changes. The `onStepChange` callback from `ParallaxSection` and runtime event subscriptions coordinate bidirectional sync.      |
| **CommandPalette integration**    | The Collections section can trigger `setStrategy(collectionStrategy)` to open the command palette filtered to a specific collection, loading selected workouts into the editor demo.                       |
| **View transition choreography**  | The sticky panel needs to transition between Editor → Track → Review panels as the user scrolls. This maps to the existing `ViewDescriptor` concept: each section binds to a different view configuration. |

---

## 3. Proposed Solutions

### Solution A: Monolithic Slide Manifest with Inline Panel Switching

**How It Works**: Define a single `ParallaxPageManifest` object containing all slides across all acts. The sticky panel reads the current step index and renders the appropriate panel component (Editor, Timer, Review) via a switch statement. Runtime binding is handled by a single `ScopedRuntimeProvider` wrapping the entire page, with runtime start/stop controlled by step transitions.

**Affected Components**: `HomePage.tsx` (rewrite), `ParallaxSection` (unchanged), `ScopedRuntimeProvider` (unchanged)

**Complexity**: Low — single file, single runtime
**Alignment**: Low — violates the view-panel separation established in the prior brainstorm. Mixing all panels into one runtime scope means the runtime is alive for the entire page lifecycle, wasting resources.

**Testing Strategy**: Snapshot tests for each step render; integration test for scroll-triggered panel switch.

**Risks/Tradeoffs**: Runtime is active even when the user is reading the editor section (before they click Run). No isolation between acts. Difficult to extend with new sections without growing the monolithic manifest.

---

### Solution B: Multi-Section Parallax with Per-Act Runtime Scoping (Recommended)

**How It Works**: The page is composed of multiple `ParallaxSection` components, one per narrative act. Each act has its own step descriptors and sticky panel content. Acts that need a runtime (Tracker, Review) are wrapped in `ScopedRuntimeProvider`, creating isolated runtime scopes that initialize lazily and dispose when scrolled out of view. Cross-section navigation uses anchor links and programmatic scrolling via `scrollIntoView()`.

The content architecture defines five narrative acts:

1. **Act 1 — Journal Your Workout** (Editor Panel sticky): Introduces WodScript syntax with the sample workout. Steps explain color coding, metrics, and the Run button. Clicking Run starts the runtime and auto-scrolls to Act 2.
2. **Act 2 — Track: Pushups** (Track Panel sticky): Shows the live timer counting up for the first `5 Pushups` block. Steps explain the timer behavior, parent rounds context, and the Next button. Clicking Next advances the runtime and scrolls to Act 3.
3. **Act 3 — Track: Rest** (Track Panel sticky, same runtime): Shows the `:10 Rest` countdown. Steps explain the auto-advance behavior and the "next card" indicator. Timer completion auto-scrolls to Act 4.
4. **Act 4 — Review Metrics** (Review Panel sticky): Shows the ReviewGrid with collected metrics. Steps explain micro-metrics, projection engines (Volume, Rep, Distance, SessionLoad, MetMinute), and calculated projections.
5. **Act 5 — Back to Editor** (Editor Panel sticky): Returns to the editor view showing runtime records embedded below the wod block. Steps mention upcoming reports feature.

Following the five acts, additional sections use standard `ScrollSection` layout:
- **Collections**: Command palette integration, collection browser, in-memory note loading.
- **Chromecast**: Feature callout for cast-to-TV with remote-as-lap-timer concept.
- **Deep Dive**: Links to syntax reference, playground, getting-started tutorial.

**Affected Components**: `HomePage.tsx` (restructure into acts), `ParallaxSection` (unchanged), `ScopedRuntimeProvider` (unchanged), `DocsPageShell` (extended with multi-parallax support)

**Complexity**: Medium — multiple sections, 1-2 scoped runtimes, cross-section scroll triggers
**Alignment**: High — follows the page-shell and scoped-runtime patterns from the prior brainstorm. Each act maps cleanly to a `ParallaxSection` with optional `ScopedRuntimeProvider`.

**Testing Strategy**:
- Unit: Step descriptor arrays render correct content per step.
- Integration: Runtime lifecycle (init on scroll-in, dispose on scroll-out). Cross-section scroll triggers. Panel transition on step change.
- Visual: Storybook stories for each act in isolation and the full composed page.

**Risks/Tradeoffs**: Acts 2 and 3 share a runtime (the tracker section), requiring careful scoping so the `ScopedRuntimeProvider` wraps both acts but does not bleed into Acts 1 or 4. Programmatic scrolling must respect `prefers-reduced-motion` and avoid conflicting with user scroll input.

---

### Solution C: Declarative Page DSL with JSON-Driven Slides

**How It Works**: Define the entire parallax experience as a JSON/YAML manifest consumed by a generic `ParallaxPageRenderer`. Each slide is a data object specifying: panel type, narrative content (markdown), interactive triggers (button IDs mapped to runtime actions), and transition rules (scroll-to-target on event). The renderer interprets the manifest, hydrates panel components, and wires up event handlers.

**Affected Components**: New `ParallaxPageRenderer`, new `ParallaxManifest` schema, `ParallaxSection` (unchanged), all panel components (unchanged, consumed by renderer)

**Complexity**: High — new rendering engine, new data schema, new manifest format
**Alignment**: Low — introduces a meta-layer that duplicates React's component composition model without clear benefit. The flexibility of JSON-driven slides is premature — there is currently only one parallax page (HomePage).

**Testing Strategy**: Schema validation tests for manifest. Renderer snapshot tests. Integration tests for event wiring.

**Risks/Tradeoffs**: Over-engineering for a single use case. JSON manifests lose TypeScript type safety and IDE support. Debugging requires understanding both the manifest schema and the renderer interpretation. Adding new interactive features requires extending the manifest schema rather than writing React components.

---

## 4. Recommendation

**Recommended: Solution B — Multi-Section Parallax with Per-Act Runtime Scoping**

This solution aligns directly with the page-shell architecture established in `brainstorm-view-panel-runtime-coupling.md`. Each narrative act is a self-contained `ParallaxSection` with its own step descriptors, and runtime-dependent acts share a `ScopedRuntimeProvider` that provides isolation without redundancy.

### Why Not Solution A?

A single monolithic manifest with one runtime scope violates the principle of lazy initialization and isolated disposal. The runtime would be alive for the entire page lifecycle, consuming resources during the editor and review sections that do not need it. The monolithic approach also makes it difficult to test acts in isolation or reorder them.

### Why Not Solution C?

A JSON-driven page DSL is premature abstraction. There is exactly one parallax page in the application (HomePage). Building a generic manifest renderer adds complexity without demonstrated need for multiple parallax pages. If a second parallax page is needed in the future, Solution B's per-act component pattern can be extracted into shared utilities at that point.

### Key Design Decisions

#### 1. Slide Architecture — Five Acts Plus Supplementary Sections

The narrative is structured as five parallax acts that follow a single workout through its full lifecycle, plus three supplementary scroll sections that broaden the story to collections, Chromecast, and learning resources.

```
┌────────────────────────────────────────┐
│             Hero Banner                │
│  "Journal Your Workout"               │
├────────────────────────────────────────┤
│ Act 1: Editor    │ Parallax sticky:   │
│  (3 steps)       │ Editor Panel       │
│                  │ (frozen, readonly)  │
├────────────────────────────────────────┤
│ ScopedRuntimeProvider("workout-demo")  │
│ ┌──────────────────────────────────┐   │
│ │ Act 2: Track   │ Parallax sticky:│  │
│ │  (3 steps)     │ Track Panel     │  │
│ │                │ (live runtime)  │  │
│ ├──────────────────────────────────┤   │
│ │ Act 3: Rest    │ Parallax sticky:│  │
│ │  (2 steps)     │ Track Panel     │  │
│ │                │ (same runtime)  │  │
│ ├──────────────────────────────────┤   │
│ │ Act 4: Review  │ Parallax sticky:│  │
│ │  (3 steps)     │ Review Panel    │  │
│ │                │ (from runtime)  │  │
│ └──────────────────────────────────┘   │
├────────────────────────────────────────┤
│ Act 5: Return to Editor               │
│  (2 steps)       │ Editor Panel       │
│                  │ (with records)     │
├────────────────────────────────────────┤
│ Collections Section (ScrollSection)    │
│ Chromecast Section (ScrollSection)     │
│ Deep Dive Section (ScrollSection)      │
└────────────────────────────────────────┘
```

#### 2. Runtime Scoping Strategy

Acts 2, 3, and 4 share a single `ScopedRuntimeProvider` because they operate on the same workout runtime:

- **Act 2** starts the runtime (user clicks Run in Act 1, or clicks Next to advance).
- **Act 3** continues the same runtime (Rest block auto-starts after Pushups).
- **Act 4** reads the completed runtime's analytics via `getAnalyticsFromRuntime()`.

Acts 1 and 5 use a **frozen editor** (no runtime) showing the WodScript source with syntax highlighting.

```typescript
// Conceptual composition
<ParallaxSection steps={act1Steps}>       {/* Editor Panel (frozen) */}
  <FrozenEditorPanel script={SAMPLE_SCRIPT} />
</ParallaxSection>

<ScopedRuntimeProvider factory={workoutRuntimeFactory}>
  <ParallaxSection steps={act2Steps}>     {/* Track Panel (live) */}
    <LiveTrackerPanel />
  </ParallaxSection>
  <ParallaxSection steps={act3Steps}>     {/* Track Panel (same runtime) */}
    <LiveTrackerPanel />
  </ParallaxSection>
  <ParallaxSection steps={act4Steps}>     {/* Review Panel */}
    <ReviewPanel />
  </ParallaxSection>
</ScopedRuntimeProvider>

<ParallaxSection steps={act5Steps}>       {/* Editor Panel (with records) */}
  <FrozenEditorPanel script={SAMPLE_SCRIPT} showRecords />
</ParallaxSection>
```

#### 3. Interactive Trigger Points

| Trigger | Location | Action |
|---------|----------|--------|
| **Run button** | Act 1, Step 3 (inline + wod block header) | Start runtime, scroll to Act 2 |
| **Next button** | Act 2, Step 3 (inline clone of Track Panel button) | Advance runtime to next block, scroll to Act 3 |
| **Timer complete** | Act 3, auto (after :10 countdown) | Runtime auto-advances, scroll to Act 4 on complete |
| **Next button** | Act 3, Step 2 (manual override) | Advance runtime, scroll to Act 4 |
| **Collection click** | Collections Section | Open CommandPalette with collection strategy, load workout into editor |

#### 4. Narrative Content per Slide

**Act 1 — Journal Your Workout (Editor Panel)**

| Step | Content |
|------|---------|
| 1 | **Enter**: Load the note, show empty editor state. "It's a journal — with some funky highlighting." |
| 2 | **Color coding explained**: Each color maps to a metric type. Green = movement/action, blue = timer/duration, orange = rep count, purple = effort/weight. Examples drawn from the `5 Pushups / :10 Rest / 5 Pushups` block. |
| 3 | **Run button**: "Those metrics drive the Timer. Click the ▶ Run button..." Show inline image of the Run button in both locations (inline and wod block header). Clicking Run transitions to Act 2. |

**Act 2 — Track: Pushups (Track Panel)**

| Step | Content |
|------|---------|
| 1 | **Timer counting up**: "The metrics in the wod block drive the behavior of this timer/stopwatch." The `5 Pushups` block has no time set, so the timer counts up. |
| 2 | **Context**: "This is a child of the rounds block. Since it doesn't have a time set on the timer, it will count up." Brief explanation of parent-child block inheritance. |
| 3 | **Next button**: "Click ▶▶ Next to let the timer know you're done with the first set." Show inline clone of the Next button from the Track Panel. Point out the "next card" preview showing `:10 Rest`. |

**Act 3 — Track: Rest (Track Panel)**

| Step | Content |
|------|---------|
| 1 | **Rest countdown**: "Now we're on the Rest block — :10 seconds." Timer counts down from 10. Point out the "next card" showing the next `5 Pushups` or empty (last block). |
| 2 | **Finish**: "The next card is empty — this is the last block. Click ▶▶ Next one more time to finish the workout." On next click (or timer completion), runtime completes, auto-scroll to Act 4. |

**Act 4 — Review Metrics (Review Panel)**

| Step | Content |
|------|---------|
| 1 | **Micro-metrics**: Point out the collected segment data — duration, reps, effort per block. |
| 2 | **Projection engines**: Explain the analytics pipeline. `AnalyticsTransformer` converts `OutputStatements` → `Segment[]`. Projection engines (Volume, Rep, Distance, SessionLoad, MetMinute) aggregate segments into projections. |
| 3 | **Calculated projections**: Show the projection results — total volume, total reps, session load, estimated MET-minutes. |

**Act 5 — Back to Editor (Editor Panel with Records)**

| Step | Content |
|------|---------|
| 1 | **Records visible**: "Back in the editor, the runtime records are now visible below the wod block." Point out the output/log entries embedded in the editor view. |
| 2 | **Coming soon**: "Reports and historical tracking are coming soon. Keep scrolling to explore collections and more." |

#### 5. Supplementary Sections

**Collections Section**
- Layout: Editor Panel visible in a `ScrollSection`, collections browser alongside.
- Run button triggers fullscreen Track → Review (Config 3 from view-panel brainstorm).
- List all built-in collections from `wod-collections.ts`.
- Clicking a collection opens the CommandPalette with `collectionStrategy` pre-selected.
- Selecting an item loads the workout into the editor in this section.
- Note to user: "These are in-memory — data does not persist on reload."

**Journal Subsection** (within Collections)
- Informational only, no interactive demo.
- Covers: Calendar view, weekly planner, markdown editor with embedded context, sideloaded data (GPX files).

**Chromecast Section**
- Feature callout with illustration.
- "Cast your workouts to your TV. Use the remote as your lap timer — the perfect companion for the home gym."
- Note about this being a core driving feature for the developer who built it.

**Deep Dive Section**
- Links to: Syntax reference (`/syntax`), Getting Started tutorial (`/getting-started`), Playground (`/playground`).
- Brief description of each resource.

### Implementation Steps

1. **Define step descriptor arrays** for each of the five acts. Each step has `id`, `label`, `content` (React node with narrative markup).
   - Files: `playground/src/data/parallaxSteps.ts` (or inline in HomePage.tsx)

2. **Create per-act sub-components** that compose `ParallaxSection` with the appropriate sticky panel:
   - `EditorActSection` — frozen editor panel + Act 1 steps
   - `TrackerActSection` — wraps Acts 2-3 with shared `ScopedRuntimeProvider`
   - `ReviewActSection` — review panel from runtime analytics + Act 4 steps
   - `EditorRecordsActSection` — editor with records + Act 5 steps
   - Files: keep inline in `HomePage.tsx` or extract to `playground/src/sections/`

3. **Wire interactive triggers**:
   - Run button: `runtime.start()` + `document.getElementById('act-2')?.scrollIntoView({ behavior: 'smooth' })`
   - Next button: `runtime.next()` + scroll to next act
   - Runtime complete event: subscribe to `onComplete` + scroll to Act 4
   - All scrolling respects `prefers-reduced-motion` (use `behavior: 'auto'` when reduced motion is preferred)

4. **Add supplementary scroll sections** after the five acts:
   - Collections: `ScrollSection` with `CollectionItemList` + CommandPalette integration
   - Chromecast: `ScrollSection` with feature callout content
   - Deep Dive: `ScrollSection` with resource links

5. **Update StickyNavPanel** labels to match the new act structure:
   - `['What Is It?', 'Write', 'Track', 'Rest', 'Review', 'Records', 'Collections', 'Chromecast', 'Deep Dive']`

6. **Add anchor navigation** — each section gets an `id` attribute matching the nav label for deep-linking.

### Testing Strategy

| Category | Test Cases |
|----------|-----------|
| **Step rendering** | Each act renders correct number of steps; step content matches descriptors; inactive steps have reduced opacity |
| **Panel transitions** | Sticky panel shows Editor for Acts 1/5, Track for Acts 2/3, Review for Act 4 |
| **Runtime lifecycle** | Runtime creates on Act 2 scroll-in; disposes on scroll past Act 4; does not exist during Acts 1/5 |
| **Interactive triggers** | Run button calls `runtime.start()`; Next button calls `runtime.next()`; completion event fires scroll |
| **Scroll behavior** | Anchor links scroll to correct section; `prefers-reduced-motion` uses instant scroll |
| **Mobile layout** | Sticky panel stacks above steps; all content accessible without scroll animation |
| **Collections** | CommandPalette opens with collection strategy; selecting item loads workout; data is in-memory |

---

## 5. Validation & Next Steps

- [ ] Prototype Act 1 + Act 2 as isolated `ParallaxSection` components with hardcoded steps to validate panel transitions.
- [ ] Validate `ScopedRuntimeProvider` wrapping Acts 2-4: runtime starts in Act 2, persists through Act 3, analytics available in Act 4, disposes after Act 4.
- [ ] Test cross-section scroll triggers: Run button in Act 1 scrolls to Act 2; Next in Act 2 scrolls to Act 3; completion scrolls to Act 4.
- [ ] Verify mobile layout: sticky panel at top (40vh), steps stacked below, all content accessible.
- [ ] Verify `prefers-reduced-motion`: all scroll triggers use `behavior: 'auto'`, no opacity transitions.
- [ ] Validate Collections section: CommandPalette integration, in-memory note loading, no persistence.
- [ ] Create Storybook stories for each act in isolation and the full composed page.
- [ ] Performance audit: measure scroll jank with multiple `IntersectionObserver` instances (one per act).

---

## 6. Alternatives and Edge Cases

### Simpler Alternative Considered

**Single-act parallax with tabs**: Instead of five separate parallax acts, use a single `ParallaxSection` with tabs in the sticky panel to switch between Editor/Track/Review. This reduces `IntersectionObserver` instances to one and simplifies scroll management. However, it loses the narrative flow — the user would need to actively click tabs rather than naturally scrolling through the story. The tab approach works better for reference pages (like `SyntaxPage`) than for guided storytelling.

### Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **User scrolls past Act 2 without clicking Run** | Runtime is not started; Track Panel shows "Click Run to begin" placeholder. Steps still display but interactive content is inert. |
| **User scrolls back to Act 1 after starting runtime** | Runtime continues running. If user scrolls forward again, Track Panel resumes from current state. No auto-restart. |
| **Runtime completes while user is reading Act 3 text** | Completion event fires but auto-scroll is suppressed if user is actively scrolling (debounce check). A "Session Complete" badge appears on the Track Panel. |
| **Multiple rapid Next clicks** | Runtime's `next()` is idempotent per block — rapid clicks on the same block are no-ops. Scroll triggers are debounced (500ms). |
| **Collection workout is longer than the demo** | Collections section uses Config 3 (fullscreen timer dialog) for execution, not the inline parallax. The parallax demo uses only the hardcoded 3-block workout. |
| **Mobile: sticky panel obscures content** | Mobile sticky panel is constrained to 40vh (or 320px min). Steps scroll below with sufficient padding to avoid overlap. |
| **Reduced motion preference** | All `scrollIntoView` calls use `behavior: 'auto'`. Step transitions use `opacity` only (no `transform`). Sticky panel content switches instantly without cross-fade. |
| **Multiple browser tabs** | Each tab has its own `ScopedRuntimeProvider` — no cross-tab runtime interference. |

### Performance Implications

- **IntersectionObserver count**: Five parallax acts = five observer instances. Each uses the same threshold array `[0, 0.1, 0.25, 0.5, 0.75]`. Modern browsers handle dozens of observers efficiently; five is well within performance budgets.
- **Runtime memory**: The `ScopedRuntimeProvider` wrapping Acts 2-4 creates one `ScriptRuntime` instance. For the 3-block demo workout, memory footprint is negligible (<1MB). Disposal on scroll-out ensures no accumulation.
- **Scroll jank**: `ParallaxSection` uses `rootMargin` to reduce observer callbacks. Desktop uses `-30% 0px -30% 0px` (center 40% of viewport triggers), mobile uses `-65px 0px -20% 0px`. This limits callback frequency during fast scrolling.
- **Panel rendering**: Only the visible sticky panel renders its content. Off-screen panels use `visibility: hidden` + `z-index` layering (existing `ResponsiveViewport` pattern), avoiding unnecessary React renders.

### Feature Interactions

| Feature | Interaction |
|---------|-------------|
| **Chromecast** | Not active during parallax demo (no cast button). Only the Collections section (Config 3 fullscreen) would show cast controls, consistent with the journal-only cast policy from the view-panel brainstorm. |
| **Command palette** | Ctrl+K opens global search (existing behavior). Collections section sets strategy to collection-scoped search. Parallax acts do not interact with the command palette. |
| **Syntax highlighting** | Editor panels in Acts 1 and 5 use the same `NoteEditor` with WodScript language support. Syntax colors match the narrative descriptions in Act 1, Step 2. |
| **Analytics pipeline** | Act 4 consumes `getAnalyticsFromRuntime()` output. The same `AnalyticsTransformer` → `Segment[]` → `ProjectionResult[]` pipeline used by the Workbench review panel. No special handling needed. |
| **Responsive viewport** | The parallax layout is independent of `ResponsiveViewport` (which manages panel stacking within a view). Each act's sticky panel is a single component, not a multi-panel grid. |
