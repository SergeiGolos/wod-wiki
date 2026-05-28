# Results Screen — Design & UX Specification

**Issue:** [WOD-619](/WOD/issues/WOD-619)  
**Parent:** [WOD-617](/WOD/issues/WOD-617)  
**Status:** Draft  
**Owner:** Designer  
**Last Updated:** 2026-05-24  

---

## Overview

The Results screen is the post-workout experience in wod-wiki. After completing a workout, the user is shown a structured review of what they did — effort segments, aggregated analytics, and optional data-collection prompts. This document defines every panel, behavior, state transition, and cross-screen requirement for the Results experience across three target form factors: **Mobile**, **Desktop**, and **Chromecast (TV)**.

---

## 1. Panel Inventory

### 1.1 Entry Points to the Results Screen

| Entry Point | Route / Mode | Notes |
|---|---|---|
| Post-workout (overlay) | `FullscreenReview` component (modal overlay) | Used in `JournalPage` and `WorkoutEditorPage`; renders over the editor after the timer completes |
| Standalone review route | `/review/:runtimeId` (`ReviewPage`) | Navigable URL; loads from IndexedDB by runtime ID; used when redirected from tracker |
| Results list entry | Any saved result → click → `/review/:runtimeId` | Accessed from the sidebar results panel or journal entry |
| Chromecast receiver | `ReceiverReviewPanel` (TV receiver) | Shown on the cast-connected TV display automatically after workout ends |

---

### 1.2 Panel Hierarchy (Desktop / Mobile)

```
FullscreenReview (FocusedDialog wrapper)
├── Header Bar
│   ├── Title (note name or "Workout Review")
│   ├── Cast Button (CastButtonRpc)
│   ├── Audio Toggle (AudioToggle)
│   └── Close Button (✕)
│
├── [P4] Collection Banner   ← conditional: shown only when pending data-collection items exist
│   └── CollectionWizard
│
└── Scrollable Body
    ├── [P2] Session Summary (Analytics Scorecard)   ← conditional: shown only when projections exist
    │   └── Metric cards grid (reps, distance, load, duration)
    │
    ├── [P1] Workout Log (ReviewGrid)   ← always visible
    │   ├── GridToolbar (preset selector, search, filter toggle, row count)
    │   ├── GridHeader (column labels with sort controls)
    │   ├── GridRow list (one row per segment)
    │   ├── GridGraphPanel (tag-filtered bar charts, conditional)
    │   └── UserOverrideDialog (popover on cell click)
    │
    └── [P3] Debug Trace Viewer   ← conditional: debug mode only
```

### 1.3 Panel Hierarchy (Chromecast / TV)

```
ReceiverReviewPanel
├── Header (✔ Workout Complete)
├── Total Duration Card (hero metric)
├── Projections Grid (2×N metric cards)   ← when analytics available
│   OR
├── Simple Rows List                       ← fallback, no analytics
├── Segment Count Indicator
└── Dismiss Button (D-Pad focusable)
```

---

### 1.4 Panel Descriptions

#### [P1] Workout Log (`ReviewGrid`) — Always Visible

**Purpose:** The primary data table. Shows every recorded segment (effort, timer, or group) as a row, with pivoted metric columns, including custom and calculated metrics when present.

**Content:**
- One row per `Segment` from `AnalyticsTransformer`
- Columns derived from the active grid preset: exercise name, reps, weight, distance, time, pace, etc.
- Sortable columns with multi-sort support
- Per-column text filter row (toggled via toolbar)
- Global search across all row content
- Row selection (single, ctrl-click multi-select, shift-click range)
- Optional graph panel for tagged columns (bar chart visualization)
- User override: tap/click a metric cell to enter an override value via `UserOverrideDialog`

**Visibility:** Always rendered (shows empty state when no segments exist).

**Empty State:**
```
[Icon: clipboard] No workout data yet.
Start a workout to see results here.
```

---

#### [P2] Session Summary (`AnalyticsScorecard`) — Conditional

**Purpose:** Highlights aggregated projection metrics for the session (total volume, total reps, total distance, total duration, etc.)

**Content:**
- Grid of metric cards (2 cols mobile, 3–4 cols desktop)
- Each card: metric name (label), large value, unit badge, color-coded top stripe per metric type
- Metric types and colors:
  - Rep / Volume → `metric-rep` (green)
  - Distance → `metric-distance` (blue)
  - Load / Time → `metric-time` (amber)
  - Effort / Met-minutes → `metric-effort` (purple)
- Origin tag at bottom of each card ("analyzed" / "computed" etc.)
- Icons per metric type (💪 reps, 📏 distance, ⏱️ time, 🏃 effort)

**Visibility:** Shown only when `projections.length > 0`. Hidden for workouts that produce no aggregate analytics (simple single-exercise sets).

---

#### [P3] Debug Trace Viewer — Debug Mode Only

**Purpose:** Shows raw grid row data for debugging analytics pipeline.

**Content:** Tabular dump of `rows` from `useGridData`. Sticky at the bottom of the dialog.

**Visibility:** Shown only when `isDebugMode === true` (toggled from the debug context).

---

#### [P4] Collection Banner (`CollectionWizard`) — Conditional

**Purpose:** Post-run data collection wizard. Allows users to confirm or override raw metric values for specific blocks (e.g., confirm actual weight used, correct rep count).

**Content:**
- Step-through wizard for each pending collection item
- Forward/back navigation (chevron buttons)
- Metric label, icon, and input field per item
- Save / Skip actions per item
- Progress indicator

**Visibility:** Shown only when `collectionItems.length > 0`. Pinned above the scrollable body area with a bottom border. Takes precedence visually to draw immediate attention.

---

#### Dismiss Button (Chromecast only)

**Purpose:** Returns the Chromecast receiver display to its waiting/idle state.

**Interaction:** D-Pad Select or pointer click. Visible focus ring at TV distance (10 ft).

---

## 2. Behavior Catalog

### 2.1 Results Generation

| Trigger | Behavior |
|---|---|
| Workout timer completed (user presses Stop / timer expires) | `FullscreenReview` opens as a modal overlay with `segments` from `getAnalyticsFromRuntime()` |
| Navigating to `/review/:runtimeId` | `ReviewPage` fetches stored result from IndexedDB (`getResultById`), extracts segments via `getAnalyticsFromLogs`, then renders `FullscreenReview` |
| Opening a result from the Journal page results list | Navigate to `/review/:runtimeId` or open `FullscreenReview` overlay with preloaded segments |
| Chromecast workout end | RPC message pushes `reviewData` + `analyticsSummary` to the receiver; `ReceiverReviewPanel` renders automatically |

**Data source:** All results are stored in IndexedDB (`wodwiki-db`) keyed by `runtimeId`. Results are associated to their originating note via `noteId` (format: `journal/<id>` or `playground/<uuid>`).

---

### 2.2 State Transitions

```
[Workout Running] → [Timer Stops / User Stops]
         │
         ▼
[Loading Results]    ← "Loading…" (spinner, zinc-400 text, centered)
         │
         ├─── result found ──────────────────────────▶ [Results Displayed]
         │                                                    │
         │                                          ┌─────────┴─────────┐
         │                                          │                   │
         │                                   [with segments]    [empty segments]
         │                                          │                   │
         │                                  [Full Review Grid]  [Empty State View]
         │
         └─── result not found / error ──────▶ [Error State]
                                                "Result not found." (red-400 text)
```

---

### 2.3 Data Visualization (ReviewGrid)

**Chart types:**
- **Bar chart** (`GridGraphPanel`): per-column visualization for tagged columns; horizontal bars with relative sizing; rendered below the grid rows when any column is graph-tagged.
- Metric columns include canonical types plus custom/calculated metrics, with user overrides applied through the same row cell model.

**Triggering charts:** User clicks the graph icon on a column header to "tag" it for visualization. Multiple columns can be tagged simultaneously.

**Chart behavior:**
- Bars represent each row's value for the tagged metric
- Empty/null values shown as zero-height bar with muted styling
- Charts scroll with the grid on small screens
- No charts rendered until at least one column is tagged

**Metric pill indicators** (`MetricPill`): inline chips within grid cells displaying metric values with color coding per metric type.

---

### 2.4 Drill-Down

| Action | Result |
|---|---|
| Click on a grid row | Row is selected (highlighted); segment details remain in-row (no separate detail panel yet) |
| Ctrl+click | Adds row to multi-selection without clearing prior selection |
| Shift+click | Range-selects all rows between the last-selected and clicked row |
| Click metric cell | Opens `UserOverrideDialog` popover anchored to the cell for value override |

**Future:** Drill-down from a selected segment to a filtered review view is a planned but not yet implemented interaction (noted in `results-in-overlay.md`).

---

### 2.5 Filtering & Sorting

| Interaction | Behavior |
|---|---|
| Click column header | Sort by that column (ascending); click again for descending; third click clears sort |
| Multi-sort | Hold Shift while clicking additional column headers to add secondary sort criteria |
| Search input (toolbar) | Fuzzy match across all visible row content; updates `visibleRows` count |
| Filter toggle button | Shows/hides per-column text filter inputs below the header row |
| Per-column filter input | Filters rows by that column's value; multiple column filters combine (AND logic) |
| Grid preset selector | Switches column set between "Default" (essential cols) and "Debug" (all raw metrics) |

---

### 2.6 User Overrides

Users can correct automatically tracked metrics (e.g., actual weight used differs from the WOD spec).

**Flow:**
1. User clicks a metric cell in `ReviewGrid`
2. `UserOverrideDialog` popover opens anchored to that cell
3. User enters override value and confirms
4. Override stored in `useUserOverrides` hook (local session state, not yet persisted)
5. Grid and scorecard recalculate with the override applied
6. Override visually indicated on the cell (e.g., edited styling)

---

### 2.7 Sharing / Exporting

**Current state:** The `CastButtonRpc` button in the header bar initiates Chromecast casting of the review to a connected TV. Full share/export flow (copy-to-clipboard, image export, social sharing) is **not yet implemented**.

**Planned interactions:**
- Copy session summary as formatted text
- Export grid as CSV
- Share to social (future)

---

### 2.8 Historical Comparison

**Current state:** Historical comparison is not yet surfaced in the Results screen directly. The `WodCompanion` overlay (inline editor context) shows line-specific history via `LineExecutionSummaryCard`.

**Planned:** Segment-level historical overlay in `ReviewGrid` (see `results-in-overlay.md`).

---

### 2.9 Collection (Post-Run Data Entry)

**Purpose:** After some workouts, the system detects segments where recorded data may be incomplete or where the user should confirm actual values (e.g., rep count based on an AMRAP round where only partial reps were completed).

**Collection wizard flow:**
```
[Review Opens] → [Collection Banner visible?]
                      │ YES
                      ▼
              [CollectionWizard banner pinned at top]
                      │
              [User steps through items with Next/Back]
                      │
              [Save (confirms value) | Skip (defers item)]
                      │
              [When all items addressed → banner dismissed]
```

---

### 2.10 Audio Controls

An `AudioToggle` button in the header bar allows toggling workout audio cues. This is persistent across the review session.

---

## 3. Cross-Screen Requirements Matrix

| Element | Mobile (390px portrait, touch) | Desktop (1024px+, mouse/keyboard) | Chromecast (TV, 10 ft, D-Pad) |
|---|---|---|---|
| **Header bar** | Compact; title truncates; Cast + Audio + Close in a row | Full width; title + actions spaced | Not applicable (full-screen receiver) |
| **Session Summary (Scorecard)** | 2-column card grid, stacked vertically; 120px min card height | 3–4 column grid; hover states | 2-column projection grid; 60pt+ typography; high contrast; no hover |
| **Total Duration** | Hero metric in scorecard card | Hero metric card with icon | Dedicated duration card with large font-mono; above projection grid |
| **Effort breakdown** | Scorecard cards; stacked below header | Scorecard cards in expanded grid | Projection cards (metric value + unit only) |
| **Workout Log (Grid)** | Single scroll column; minimal columns shown (Default preset); all filter controls hidden by default | Full table with all columns; visible toolbar; filter row accessible; sort + multi-sort | Not shown (grid is too dense for 10 ft) |
| **Charts/graphs** | Below-grid bar chart; scrolls with content | Inline with grid; may be pinned or side-by-side (future) | Not shown |
| **User override dialog** | Bottom sheet or full-screen modal (to be confirmed) | Popover anchored to cell | Not applicable |
| **Historical comparison** | Not yet implemented | Not yet implemented | Not applicable |
| **Share/export controls** | Not yet implemented | Not yet implemented | Not applicable (Chromecast IS the share mode) |
| **Progress indicators** | Loading spinner centered in viewport | Loading spinner centered in dialog | Loading: show last known state; no spinner needed |
| **Collection Banner** | Full-width banner pinned below header; step-through wizard; large touch targets (48px+) | Banner above scrollable body; standard input size | Not applicable |
| **Dismiss / Close** | ✕ button in header bar | ✕ button in header bar (keyboard: Escape) | Dedicated Dismiss button; D-Pad Select; 10 ft readable; activation flash on press |
| **Empty state** | Centered message with icon; "Start a workout to see results" | Same centered message; optional CTA button | "No workout data" text, center-aligned |
| **Error state** | Red message + optional retry | Red message + optional retry | Brief red text; auto-dismiss after timeout (future) |

---

## 4. Form Factor Requirements

### 4.1 Mobile

- **Layout:** Vertical stack, single column, fully scrollable.
- **Touch targets:** Minimum 48×48px for all interactive elements (close, sort, override, collection wizard buttons).
- **Scorecard:** 2-column card grid; cards min-height 120px; large tabular-numeral values.
- **Grid:** Default preset only; most columns hidden to prevent horizontal overflow; no horizontal scrolling (text wraps or truncates within cells).
- **Toolbar:** Simplified — search input, filter toggle, row count. Preset selector collapsed or hidden.
- **Collection wizard:** Step-through with large inputs; Back/Forward/Save/Skip at native touch height.
- **Drill-down:** Row tap for selection; long-press could open contextual action sheet (future).
- **Portrait-first:** All layouts designed for 390×844 (iPhone 14 viewport). Landscape support: rotate gracefully, no critical information loss.
- **Keyboard (soft):** Collection wizard inputs should not be obscured by the software keyboard; use `visualViewport` or `env(keyboard-inset-height)` to push content up.

### 4.2 Desktop

- **Layout:** Full-screen modal dialog; max-width 7xl (1280px); centered with padding.
- **Scorecard:** 3–4 column grid by default; hover states on metric cards (subtle background lift).
- **Grid:** Full column visibility; sortable headers clearly indicated; filter row as an expandable band below the header row.
- **Toolbar:** All controls visible: preset selector, search, filter toggle, column visibility, row count.
- **Keyboard navigation:**
  - `Escape` → close review
  - `Tab` / `Shift+Tab` → move between toolbar controls
  - `↑` / `↓` → navigate grid rows
  - `Enter` → select row / confirm override
  - Click-sortable column headers
- **Multi-select:** Ctrl+Click, Shift+Click range selection for future batch operations (export selection, comparison).
- **Side-by-side comparisons:** Reserved for future — current layout is single-session. Structure should support a future "compare sessions" mode with two grids side by side.
- **Resizable panels:** Not required in v1; future consideration.
- **Cast button:** Visible in header, opens cast device picker overlay.

### 4.3 Chromecast (TV — 10 ft UI)

- **Layout:** Full-screen receiver. No header bar. Centered content with ample padding (48px+ from edges).
- **Typography:** Minimum 24pt for secondary text; minimum 40pt for hero metric values; high contrast (dark bg / light fg or reverse).
- **Projections grid:** 2-column card grid; each card shows one metric; no more than 6 cards in view (scroll is not user-controlled on TV).
- **Duration card:** Always rendered first, above the projections grid; dedicated hero treatment.
- **Dismiss button:**
  - Minimum 56px height touch/D-Pad target
  - D-Pad focus ring: 4px ring, primary color, scale-105 on focus (visible at 10 ft)
  - Activation flash: element-level confirmation pulse on Select press
  - D-Pad hint text ("⊙ Select") beneath the button
- **Spatial navigation:** One focusable element only: the Dismiss button. No tab/arrow navigation between metric cards needed.
- **Segment count:** Muted bottom caption; provides audit trail.
- **No interaction required:** The review screen is passive by default; users review with eyes only, dismiss when done.
- **Auto-dismiss:** Not implemented but planned — timeout-based auto-dismiss after 60s of inactivity.
- **Group review mode:** Review is shown to the group in the room; typography and contrast must work from 3–4 meters.

---

## 5. Data Visualization Patterns

### 5.1 Chart Types

| Chart | Location | When Shown | Notes |
|---|---|---|---|
| Bar chart (horizontal) | `GridGraphPanel`, below the grid rows | When at least one column is graph-tagged by the user | Bars sized relative to max value in the column; empty = zero bar |
| Metric card (scorecard tile) | `AnalyticsScorecard`, top of review | When `projections.length > 0` | Color-coded by metric type; value + unit + origin |
| Metric projection card (TV) | `ReceiverReviewPanel`, center of screen | When `analyticsSummary.projections` available | Simplified card; 2-column layout; no icons in fallback rows |
| Sparkline (line history) | `WodCompanion` inline overlay (editor) | Per-line results in inline editor context | Planned but not yet implemented in Results screen |

### 5.2 Color Coding

| Metric Type | Color Token | Use |
|---|---|---|
| Rep / Volume | `metric-rep` (green) | Reps, rounds, sets |
| Distance | `metric-distance` (blue) | Meters, yards, miles |
| Load / Time | `metric-time` (amber) | Duration, pace |
| Effort / Energy | `metric-effort` (purple) | Met-minutes, intensity |
| Default | `primary` | Any unmapped metric type |

Color tokens are defined in the wod-wiki design system (`tailwind.config`). All metric cards use the color token for the top border stripe and the value text.

### 5.3 Accessibility

- **Color is not the sole differentiator:** Metric type icons (💪, 📏, ⏱️, 🏃) accompany every color-coded card.
- **Contrast:** All text on metric cards meets WCAG AA (4.5:1 minimum) against the card background.
- **Screen readers:** Icon spans include `role="img"` and `aria-label` for the metric name.
- **Chromecast:** Dark background with white foreground; contrast ratios designed for degraded display conditions (bright room, viewing angle).

### 5.4 Animation & Transitions

- **Grid rows:** No animation on render (performance: grids can have 100+ rows).
- **Metric cards (scorecard):** Card entrance: `opacity 0 → 1`, `translateY +8px → 0`, staggered per card (future; not implemented in v1).
- **Drill-down:** Row selection highlights instantly; no transition needed.
- **Chromecast dismiss button:** D-Pad focus ring transition: `150ms ease`; activation flash: `200ms pulse` at primary color.

### 5.5 Responsive Chart Behavior

| Viewport | Bar Chart Behavior |
|---|---|
| Mobile (<768px) | Charts below the grid; full width; bars horizontal |
| Desktop (≥768px) | Charts below grid rows; proportional to grid width |
| Chromecast | Charts not shown |

---

## 6. Interaction Patterns

### 6.1 Summary ↔ Detail Navigation

```
[Session Summary Scorecard]
    │ (future: tap/click a metric card)
    ▼
[ReviewGrid filtered to segments contributing to that metric]
    │ (future: tap/click a grid row)
    ▼
[Segment detail view — not yet implemented]
    │
    ◀ Back
[ReviewGrid]
```

**Current state:** Direct navigation from a scorecard card to filtered grid rows is planned but not implemented. The grid and scorecard are both visible simultaneously and currently independent.

### 6.2 Gesture Support (Mobile)

| Gesture | Action |
|---|---|
| Tap row | Select segment |
| Tap header cell | Sort by column |
| Tap graph icon in header | Tag column for bar chart |
| Tap metric cell | Open user override dialog |
| Swipe down (modal) | Close review (future; not yet implemented) |
| Long-press row | Contextual action sheet (future) |

### 6.3 Keyboard Shortcuts (Desktop)

| Key | Action |
|---|---|
| `Escape` | Close review dialog |
| `Tab` / `Shift+Tab` | Focus toolbar controls |
| `↑` / `↓` | Navigate rows |
| `Enter` | Select focused row / confirm |
| `Ctrl+A` | Select all visible rows (future) |
| `Ctrl+C` | Copy selected rows as text (future) |

### 6.4 Export / Share Flow

**Current implementation:** Only Chromecast push via `CastButtonRpc`.

**Planned flow for clipboard/export:**
```
[Share button in header]
    │
    ▼
[Share sheet: Copy Summary | Export CSV | Share Image | Cast]
    │
    ├── Copy Summary → format segments + scorecard → clipboard toast
    ├── Export CSV → trigger download of grid rows as .csv
    ├── Share Image → screenshot scorecard → native share API (mobile)
    └── Cast → CastButtonRpc (current)
```

---

## 7. Edge Cases & Error States

| Scenario | Expected Behavior | Panel(s) Affected |
|---|---|---|
| No data (empty segments array) | Show ReviewGrid empty state: icon + "No workout data" message | P1 (grid only; scorecard hidden) |
| Partial data (some segments incomplete) | Show all available segments; incomplete segments may show dashes or N/A in cells | P1, P2 |
| Failed IndexedDB load | Show error state: "Result not found." (red text, centered) | Full screen error |
| IndexedDB read error | Show error state: "Failed to load result." (red text, centered) | Full screen error |
| Zero projections (no analytics) | Hide Analytics Scorecard entirely; show grid only | P2 hidden, P1 shown |
| No collection items | Hide Collection Banner entirely | P4 hidden |
| Runtime ID missing from URL | Show "Result not found." error | Full screen error |
| Very large result (100+ segments) | Grid renders all rows; no pagination in v1; may be slow — performance monitoring needed | P1 |
| Very long exercise names | Truncate with ellipsis in grid cells; full name on hover tooltip | P1 |
| Override value out of range | No validation in v1; any value accepted; user responsible | P1, override dialog |
| Cast connection unavailable | CastButtonRpc shows disabled state; no crash | Header |
| Chromecast: no projections | Fall back to simple `reviewData.rows` list rendering | Chromecast receiver |
| Chromecast: zero rows and no projections | Show "Workout Complete" header + segment count + Dismiss button; no data table | Chromecast receiver |
| Chromecast: very many projections (6+) | Current grid is 2-column; more than 6 cards will push Dismiss button off-screen — **needs max 6 card cap** | Chromecast receiver |
| Audio toggle state | AudioToggle reflects global audio state; persists across review session | Header |
| Debug mode | DebugTraceViewer renders at bottom; adds scrollable area | P3 |

---

## 8. Known Design Gaps (Items for Future Resolution)

1. **Drill-down from scorecard card to filtered grid** — no direct navigation path today
2. **Segment detail view** — tap a row to see a focused breakdown (planned per `results-in-overlay.md`)
3. **Historical comparison** — "compare to last time" within the Results screen
4. **Share/export** — only Chromecast cast exists; clipboard/CSV/image export not designed
5. **Mobile swipe-to-dismiss** — no gesture close on the overlay
6. **Chromecast 6-card cap** — risk of projections grid pushing Dismiss off-screen; needs guard
7. **User overrides persistence** — overrides are session-local; not saved to IndexedDB
8. **Collection wizard completion state** — no confirmation when all items are addressed
9. **Auto-dismiss on Chromecast** — manual dismiss only; 60s auto-dismiss not implemented
10. **Empty state illustration** — current empty state is text-only; should have an illustrated graphic per design system

---

## Appendix A: Component–Route Map

| Component | Route / Context | Purpose |
|---|---|---|
| `FullscreenReview` | Overlay on `/journal/:id`, `/playground/:id`, etc. | Full post-run review modal |
| `ReviewPage` | `/review/:runtimeId` | Standalone review route; loads from DB |
| `ReviewGrid` | Inside `FullscreenReview` | Workout log data table |
| `AnalyticsScorecard` | Inside `FullscreenReview` | Aggregated metrics summary |
| `CollectionWizard` | Inside `FullscreenReview` | Post-run data collection |
| `DebugTraceViewer` | Inside `FullscreenReview` (debug mode) | Raw analytics debug data |
| `ReceiverReviewPanel` | Chromecast receiver app | TV post-workout results |
| `GridToolbar` | Inside `ReviewGrid` | Search, filter, preset controls |
| `GridGraphPanel` | Inside `ReviewGrid` | Column bar charts |
| `UserOverrideDialog` | Inside `ReviewGrid` | Cell-level value override |
| `FocusedDialog` | Wrapper for `FullscreenReview` | Modal with title, close, actions |
| `CastButtonRpc` | Header of `FullscreenReview` | Cast to Chromecast |

---

## Appendix B: Data Flow

```
IndexedDB (wodwiki-db)
    │
    │  getResultById(runtimeId)   OR   getResultsForNote(noteId)
    ▼
WorkoutResult { noteId, runtimeId, data: { logs[], startTime } }
    │
    │  getAnalyticsFromLogs(logs, startTime)
    │    OR
    │  getAnalyticsFromRuntime(runtime)
    ▼
{ segments: Segment[], groups: AnalyticsGroup[] }
    │
    ├──▶ FullscreenReview
    │       ├── useGridData(segments) → rows[]
    │       ├── extractProjections(segments) → ProjectionResult[]
    │       └── useCollectionMetrics(segments) → collectionItems[]
    │
    └──▶ ReceiverReviewPanel (via RPC / ChromecastProxyRuntime)
             ├── analyticsSummary.projections → metric cards
             └── reviewData.rows → fallback row list
```
