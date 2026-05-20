# Review Page Redesign — Designer Agent Prompts

## Context

WOD Wiki is a workout logging application. After a user runs a workout script, they land on
a **Review Page** (also called the Fullscreen Review / Review Grid) where they examine what
happened during the session and fill in any metrics they forgot to enter.

The current implementation uses a single overloaded `ReviewGrid` table that tries to render
three fundamentally different kinds of data at once:

1. **Workout Segments** — what you actually did (rows like "Push-ups: 3×10 @ 60kg")
2. **Analytics Summary** — computed totals ("Total Volume: 3000 kg, Total Reps: 90")
3. **Debug/System Trace** — internal runtime events (compiler logs, stack transitions)

It also relies on an awkward double-click-into-cell interaction to collect missing `?`
(hinted/collectible) metrics that the user didn't fill in before the workout.

The redesign separates these concerns into **three distinct panels** and introduces a
**dedicated collection flow** for required/optional user inputs.

---

## Design Language & Color System

All mockups must look native to the WOD Wiki design system.

### Typography
- **Font family**: Inter (sans), Geist Mono (mono)
- **Headline tracking**: `−0.05em` (tight)
- **Label tracking**: `+0.065em` (uppercase caps labels)
- **Body**: 14px/16px, regular weight
- **Data tables**: 13px, tabular nums

### Shape
- **Cards / panels**: `border-radius: 1rem` (large)
- **Tags / pills**: `border-radius: 9999px` (full pill — signature shape)
- **Inputs / dialogs**: `border-radius: calc(1rem - 2px)`

### Color Tokens (Light Mode — "Mineral" theme)

| Token | HSL | Hex | Use |
|---|---|---|---|
| `--background` | `40 20% 96%` | `#f5f2ee` | App shell, page background |
| `--foreground` | `30 16% 15%` | `#282018` | Body text |
| `--card` | `40 38% 98%` | `#fdfcfa` | Panel/card surface |
| `--muted` | `38 18% 90%` | `#ede9e2` | Quiet surfaces, alternating rows |
| `--muted-foreground` | `30 13% 45%` | `#6a5f52` | Secondary text, captions |
| `--border` | `36 14% 76%` | `#cdc5b8` | Table lines, dividers |
| `--primary` | `212 32% 50%` | `#5980a8` | Buttons, focus rings, highlights |
| `--primary-foreground` | `40 38% 98%` | `#fdfaf5` | Text on primary buttons |
| `--accent` | `46 42% 85%` | `#ede1c0` | Hover states, selected rows |
| `--success` | `140 28% 42%` | `#508860` | Completion, confirmed values |
| `--warning` | `46 52% 37%` | `#948030` | Pending / hinted metrics |
| `--destructive` | `0 34% 48%` | `#a05858` | Delete, error |
| `--brand` | `—` | `#5980a8` | Same as primary; slate blue identity color |

### Color Tokens (Dark Mode — "Arctic Frost" theme)

| Token | HSL | Hex | Use |
|---|---|---|---|
| `--background` | `222 16% 21%` | `#2e3440` | App shell (Nord Polar Night 1) |
| `--foreground` | `218 22% 76%` | `#d8dee9` | Body text (Nord Snow Storm 1) |
| `--card` | `222 17% 28%` | `#3b4252` | Panel surface (Nord Polar Night 3) |
| `--muted` | `222 18% 18%` | `#262c38` | Quiet surfaces (Nord Polar Night 0) |
| `--muted-foreground` | `219 14% 62%` | `#9099ab` | Secondary text |
| `--border` | `218 17% 30%` | `#3f4859` | Dividers |
| `--primary` | `210 35% 64%` | `#81a1c1` | Buttons, highlights (Nord Frost Blue) |
| `--warning` | `40 67% 74%` | `#ebcb8b` | Pending metrics (Nord Aurora Yellow) |
| `--success` | `95 30% 65%` | `#a3be8c` | Confirmed (Nord Aurora Green) |
| `--destructive` | `354 34% 58%` | `#bf616a` | Delete, error (Nord Aurora Red) |

### Metric Semantic Colors

Each metric type has a dedicated semantic color used in pills, badges, and cell highlights:

| Metric | Light | Dark | Emoji |
|---|---|---|---|
| **Duration / Time** ⏱️ | `#5980a8` slate blue | `#81a1c1` frost blue | ⏱️ |
| **Reps** 💪 | `#a87040` raw sienna | `#d08770` aurora orange | 💪 |
| **Effort** 🏃 | `#508860` moss green | `#a3be8c` aurora green | 🏃 |
| **Rounds** 🔄 | `#7c62a0` slate violet | `#b48ead` aurora purple | 🔄 |
| **Distance** 📏 | `#408888` deep teal | `#8fbcbb` frost teal | 📏 |
| **Resistance** | `#a05858` terracotta | `#bf616a` aurora red | 💪 |
| **Action** ▶️ | `#948030` ochre | `#ebcb8b` aurora yellow | ▶️ |

Metric pills use `bg-[color]/15 border-[color]/40 text-[color]` for a tinted, bordered
appearance — never solid fills.

---

## Panel 1 — Workout Segments Table

### Purpose
The primary post-workout table. Shows one row per executed workout block —
each set, interval, or group that ran. This is what the athlete reviews to
confirm their results.

### Data Shape (`GridRow`)

```typescript
interface GridRow {
  id: number;                    // Unique ID (from OutputStatement)
  index: number;                 // 1-based execution order
  sourceBlockKey: string;        // e.g., "pushups[0][1]"
  outputType:                    // Filtered set in this panel:
    'segment'                    //   ← primary: a timed block of work
    | 'milestone'                //   ← notable event mid-workout
    | 'group';                   //   ← named collection of segments
  stackLevel: number;            // Depth in the block tree (0=root, 1=child...)
  absoluteStartTime?: number;    // Wall-clock epoch ms when this started
  duration?: number;             // PLANNED duration from script (seconds)
  elapsed: number;               // ACTUAL pause-aware active time (seconds)
  total: number;                 // ACTUAL wall-clock bracket (seconds)
  spans: { started: number; ended?: number }[]; // Session-relative seconds
  completionReason?:             // How this block ended:
    'user-advance'               //   user clicked Next
    | 'timer-expired'            //   countdown hit zero
    | 'rounds-complete'          //   all rounds finished
    | 'forced-pop';              //   parent ended it
  cells: Map<MetricType, {       // Dynamic metric columns:
    metrics: MetricContainer;    //   all metric values for this type
    hasUserOverride: boolean;    //   true if user entered a value
  }>;
}
```

### Metric types that appear as columns

| Type | Label | Icon | Notes |
|---|---|---|---|
| `effort` | Exercise | 🏃 | Exercise name (e.g., "Push-ups") |
| `text` | Note | 📝 | Free-text labels |
| `label` | Label | — | Short block label |
| `rep` | Reps | 💪 | Rep count |
| `rounds` | Rounds | 🔄 | Total rounds prescribed |
| `current-round` | Round | 🔄 | Which round this was |
| `distance` | Dist | 📏 | e.g., "5 km" |
| `resistance` | Weight | — | e.g., "60 kg" |
| `duration` | Planned | ⏱️ | Script-defined target time |
| `elapsed` | Elapsed | ⏱️ | Actual active time |
| `volume` | Volume | — | Derived: reps × weight |
| `intensity` | Intensity | — | RPE or % |
| `load` | Load | — | Work load index |
| `action` | Action | ▶️ | Verb (e.g., "Run", "Row") |
| `increment` | Inc | ↕️ | Set-by-set increment |

### Visual Hierarchy Rules

- Rows with `outputType: 'group'` are section headers — use subtle background
  (`--muted`) and bold/slightly larger text
- Rows with `stackLevel > 0` are indented (e.g., `pl-[stackLevel * 1.25rem]`)
- The `elapsed` column shows as `M:SS` format with a secondary `/ total` if they differ
- `duration` vs `elapsed`: if the block ran short or long, show both with a ± indicator
- Cells with `hasUserOverride: true` show a small user-badge (👤) in the corner
- Cells with `hinted` origin metrics (value is `?`) show a ◉ prompt indicator in warning color

### Required Interactions

1. **Row selection**: single click selects (highlight with `--accent`)
2. **Multi-select**: ctrl+click for additive, shift+click for range
3. **Cell entry**: click (not double-click) a `?`-hinted cell to open the
   inline Collection Widget (see Panel 4 below)
4. **Sort**: click column header cycles asc→desc→none
5. **Column filter**: expandable filter row under headers

---

## Panel 2 — Analytics Summary Panel

### Purpose
Computed aggregate totals produced by the analytics engine after the session
completes. These are not raw workout rows — they're derived projections like
"Total Volume", "Total Reps", "Met-Minutes". This panel should feel more like
a **dashboard card** or **scorecard** than a table.

### Data Shape (`OutputStatement` with `outputType: 'analytics'`)

The analytics engine produces `OutputStatement` objects where each one
carries exactly two metrics:

```typescript
// Each analytics result has:
{
  outputType: 'analytics',
  sourceBlockKey: 'analytics-summary',
  metrics: MetricContainer containing:
    [0]: { type: MetricType.Label, value: 'Total Volume', image: 'Total Volume', origin: 'analyzed' }
    [1]: { type: MetricType.Volume, value: 3000, image: '3000 kg', unit: 'kg', origin: 'analyzed' }
}
```

After passing through `AnalyticsTransformer`, these become `Segment` objects
with `type: 'analytics'` that are then displayed as `GridRow` objects.

### Available Projections (from analytics engines)

| Engine | Output Name | Example Value | Unit | MetricType |
|---|---|---|---|---|
| `VolumeProjectionEngine` | "Volume Load" | 3000 | kg | `volume` |
| `VolumeProjectionEngine` | "Total Volume" | 2800 | kg | `volume` |
| `RepProjectionEngine` | "Total Reps" | 90 | reps | `rep` |
| `DistanceProjectionEngine` | "Total Distance" | 5.2 | km | `distance` |
| `SessionLoadProjectionEngine` | "Session Load" | 142 | AU | `load` |
| `MetMinuteProjectionEngine` | "Met-Minutes" | 85 | METs·min | `metric` |

### Visual Design Direction

Rather than a table, render these as a **stat card grid**:
- 2-column grid (3-column on wide screens)
- Each card: metric-colored top border strip, large number, label, unit badge
- Cards use metric semantic colors (e.g., Volume card uses rep/resistance colors)
- Include a subtle "📊 Session Summary" header above the card grid
- On hover, cards can expand to show per-exercise breakdown if available

### Example Card Structure (per projection)

```
┌─────────────────────────────┐
│ 💪  Total Volume             │
│                              │
│   3,000 kg                   │
│                              │
│ [analyzed]  3 exercises      │
└─────────────────────────────┘
```

---

## Panel 3 — Debug / System Trace Table

### Purpose
An internal developer view showing the runtime execution log:
compiler output, block lifecycle events, stack transitions. This panel is
only visible when the workbench **debug toggle** is active.

### Data Shape

Same `GridRow` structure but filtered to `outputType` values:

| OutputType | Meaning |
|---|---|
| `load` | Initial script loaded into runtime |
| `compiler` | Compiler behavior wired up for a block |
| `event` | External stimulus (e.g., "next" button, "timer") |
| `system` | Internal lifecycle (push, pop, mount, unmount) |
| `completion` | Block completed with a `completionReason` |

Additional debug columns shown (hidden in normal view):
- **Block** (`sourceBlockKey`) — the internal block identifier
- **Depth** (`stackLevel`) — stack depth when emitted
- **Reason** (`completionReason`) — why the block ended
- **System** metric — internal system event name/payload

### Visual Design Direction

- Monospace font for block keys and system event names
- Color-coded by `outputType`:
  - `load` → muted/secondary treatment
  - `compiler` → accent (ochre) left border
  - `event` → primary (blue) left border
  - `system` → neutral
  - `completion` → success (green) or warning (yellow) depending on reason
- Dense row height (compact) — this is a log viewer not a workout summary
- Collapsible by default — shown as an accordion below the main tables
- Filtered row count shown in the section header

---

## Panel 4 — Collectible Metrics Entry Flow

### Background: What are `?` (Hinted) Metrics?

When the workout script uses `?` for a metric value, it signals that the
athlete will fill it in — either before or after running the block. Examples:

```
5 ? Push-ups       ← reps = ? (hinted origin, value undefined)
:? Run             ← duration = ? (collectible timer, hinted)
? kg Bench Press   ← resistance = ? (weight to be filled in)
```

These produce `IMetric` objects with:
```typescript
{ type: MetricType.Rep, origin: 'hinted', image: '?', value: undefined }
```

The **metric precedence tier** means a user-provided value (`origin: 'user'`)
overrides the hinted placeholder when the row is displayed.

### Problem with Current UX

The current flow requires users to:
1. Notice that a cell shows "?" in the results table
2. Double-click that specific cell
3. Type a value in a small popover
4. Repeat for each `?` in the workout

This is brittle, easy to miss, and forces the user into table-scanning mode
instead of a guided fill-in experience.

### Proposed: Collection Wizard Flow

Design a **collection wizard** that appears:
- **Before the workout** (pre-run) when the script has any `?` metrics: "Fill in your targets"
- **After the workout** (post-run / review page) when any `?` remained uncollected: "Fill in your actuals"

The wizard knows about all hinted metrics from the parsed `CodeStatement` objects.

#### Collection Item Shape

```typescript
interface CollectionItem {
  blockKey: string;          // Which workout block owns this metric
  exerciseLabel: string;     // Display name (from Effort metric on same block)
  metricType: MetricType;    // What kind of value is needed
  hint: string;              // The '?' image or planned value as context
  existingValue?: unknown;   // If user already entered something this session
  origin: 'hinted';          // Always hinted for collectible items
  // Context for ordering:
  statementIndex: number;    // Line in the script (for ordering)
  setIndex?: number;         // Which set within a block
}
```

#### Collection Item examples from a script like:
```
3x
  ? Push-ups
  :? Rest
  50 kg ? Bench Press
```

```
┌─ Collection Item 1 ─────────────────────┐
│ 🏃  Push-ups                             │
│  Round 1  Set 1                          │
│                                          │
│  Reps  [_____]  💪                       │
│                                          │
│  [Skip]          [Save →]                │
└──────────────────────────────────────────┘

┌─ Collection Item 2 ─────────────────────┐
│ ⏱️  Rest                                 │
│  Round 1                                 │
│                                          │
│  Duration  [____:__]  (M:SS)             │
│                                          │
│  [Skip]          [Save →]                │
└──────────────────────────────────────────┘

┌─ Collection Item 3 ─────────────────────┐
│ 🏃  Bench Press  50 kg                   │
│  Round 1  Set 1                          │
│                                          │
│  Reps  [_____]  💪                       │
│                                          │
│  [Skip]          [Save →]                │
└──────────────────────────────────────────┘
```

### Two Display Modes

**Mode A — Pre-Run Planning Sheet** ("Fill in your targets before you start")
- Shown before workout begins if any `?` metrics exist in the script
- Clean card layout with all items visible (scrollable)
- Values entered here become `origin: 'user'` and feed into the live timer display
- Big "Start Workout →" CTA at the bottom

**Mode B — Post-Run Review Prompt** ("You have N uncollected metrics")
- Shown prominently at the top of the Review Page if `?` items are unfilled
- Amber/warning styling to draw attention
- Same card layout but labeled "Fill in your actuals"
- Progress indicator: "3 of 7 filled in"
- After all filled (or dismissed): the summary table updates and the prompt collapses

---

## Full Review Page Layout

### Overall Structure

```
┌─────────────────────────────────────────────────────────┐
│  📋  Workout Review  —  "My WOD"          [Cast] [Close]│
├─────────────────────────────────────────────────────────┤
│  ⚠️  3 uncollected metrics — fill in your actuals       │  ← COLLECTION BANNER (if any ?)
│  [Fill In Now ▼]                                        │
├─────────────────────────────────────────────────────────┤
│  COLLECTION ITEMS (expanded when banner clicked)        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Push-ups R1 │  │  Rest R1    │  │ Bench Pr R1 │    │
│  │ Reps [  ]   │  │ Time [  ]   │  │ Reps [  ]   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                     3/3 filled [Done ✓] │
├─────────────────────────────────────────────────────────┤
│  ── SESSION SUMMARY ──────────────────────────────────  │  ← PANEL 2: Analytics cards
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ 💪 3,000 kg │  │ 🔄 90 reps  │  │ ⏱️ 32:00    │    │
│  │ Total Volume│  │ Total Reps  │  │ Duration    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
├─────────────────────────────────────────────────────────┤
│  ── WORKOUT LOG ──────────────────────────────────────  │  ← PANEL 1: Segment table
│  [Search ___] [Filters] [Columns]   3 selected / 12 rows│
│  ┌──┬──────────────┬───────┬───────┬──────┬──────────┐ │
│  │# │  Exercise    │ Reps  │Weight │ Time │ Elapsed  │ │
│  ├──┼──────────────┼───────┼───────┼──────┼──────────┤ │
│  │1 │ 🏃 Push-ups  │ 10 💪 │  —    │ 1:00 │  0:52   │ │
│  │2 │ 🏃 Push-ups  │ ?◉💪  │  —    │ 1:00 │  1:03   │ │
│  │3 │ 🏃 Bench     │ 10 💪 │ 60 kg │  —   │  0:45   │ │
│  └──┴──────────────┴───────┴───────┴──────┴──────────┘ │
│  1 of 12 rows  ·  2 selected                            │
├─────────────────────────────────────────────────────────┤
│  ▶ DEBUG TRACE  (collapsed, only visible in debug mode) │  ← PANEL 3: Debug accordion
└─────────────────────────────────────────────────────────┘
```

---

## Prompt 1 — Session Summary Cards (Analytics Panel)

> Design a **Session Summary** card grid for the WOD Wiki review page.
>
> **What it shows:** Post-workout aggregate statistics computed by the analytics
> engine: Total Volume, Total Reps, Total Distance, Session Load, Met-Minutes.
> Each card represents one `ProjectionResult` (name, value, unit, metricType).
>
> **Data shape per card:**
> ```
> name: string          // "Total Volume"
> value: number         // 3000
> unit: string          // "kg"
> metricType: string    // "volume" | "rep" | "distance" | "load" | "metric"
> ```
>
> **Layout:** Responsive card grid — 2 columns on mobile (375px), 3 on tablet (768px),
> 4 on desktop (1200px+). Cards have consistent height with the large number
> vertically centered.
>
> **Card anatomy:**
> - Top accent stripe (4px) in the metric's semantic color
> - Emoji icon + metric type label (small caps, `letter-spacing: 0.065em`)
> - Large number: 2.5rem, Inter, tabular-nums, tight tracking
> - Unit badge: pill shape, muted background
> - Source label: "analyzed" in tiny muted text at bottom
>
> **Metric semantic colors** (use as top stripe + number tint):
> - volume → `#a87040` (raw sienna / rep color)
> - rep → `#a87040` (raw sienna)
> - distance → `#408888` (deep teal)
> - load → `#5980a8` (slate blue / time color)
> - metric (met-min) → `#508860` (moss green / effort color)
>
> **Dark mode variant** required (Arctic Frost palette).
> Background: `#2e3440`, card surface: `#3b4252`, border: `#3f4859`.
>
> **Tone:** Clean, data-forward, accomplishment-oriented. The athlete just finished
> a hard session — make these numbers feel earned and prominent.
>
> Output: Full-width mockup showing light + dark mode side by side, with a
> sample of 4 cards (Volume, Reps, Distance, Session Load).

---

## Prompt 2 — Workout Log Table (Segments Panel)

> Design a **Workout Log table** for the WOD Wiki review page.
>
> **What it shows:** One row per executed workout block — sets, intervals, rounds.
> Replaces the current overloaded ReviewGrid with a clean, focused segment view.
>
> **Row data shape:**
> ```
> index: number          // 1-based row number
> effort: string         // Exercise name: "Push-ups", "Row", "Rest"
> reps?: number | '?'    // Actual reps (or '?' if uncollected)
> resistance?: string    // Weight: "60 kg" (or '?' if uncollected)
> duration?: string      // Planned: "1:00"
> elapsed: string        // Actual: "0:52" (or "0:52 / 1:03" if total differs)
> completionReason?:     // "timer-expired" | "user-advance" | "rounds-complete"
> stackLevel: number     // Indentation depth
> outputType:            // "segment" | "group" | "milestone"
> hasUserOverride:       // bool — user entered a value
> hasHinted:             // bool — row has uncollected '?' metrics
> ```
>
> **Visual requirements:**
>
> 1. **Group rows** (`outputType: 'group'`) — section dividers with a subtle muted
>    background, slightly larger text, no metric data columns (just a label spanning
>    the full row). Uses `--muted` background.
>
> 2. **Segment rows** (`outputType: 'segment'`) — standard table rows. Indent
>    `stackLevel` steps (each step = 1.25rem padding-left on the effort column).
>
> 3. **Hinted cells** — any cell containing `?` shows a filled circle indicator `◉`
>    in `--warning` amber color. The cell background should be very lightly tinted
>    amber (`--warning/8`). This is clickable to trigger inline entry.
>
> 4. **User-overridden cells** — show a small `👤` badge in top-right corner of cell.
>
> 5. **Selected rows** — `--accent` background (`#ede1c0` light, `#40450e` dark-ish).
>
> 6. **Effort pills** — exercise names shown as metric-effort colored pills
>    (`bg-metric-effort/15 border border-metric-effort/40 text-metric-effort`).
>    Rest rows use muted treatment.
>
> 7. **Time columns**: Show `M:SS` format. If `elapsed ≠ total`, show as
>    `0:52 / 1:03` with a soft slash separator. If `elapsed` < `duration`, tint
>    slightly red; if over, tint slightly amber.
>
> 8. **Toolbar**: Search field, filter toggle, column visibility picker, preset
>    switcher (Default / All columns). Row count badge at right.
>
> **Interactions to show in mockup:**
> - One row selected (accent highlight)
> - One row with `?` in reps column (warning indicator)
> - One group row (section header)
> - One rest row (muted styling)
> - Toolbar with search active
>
> Output: Full-width table mockup at 1280px desktop width, light mode.
> Include a second view at 375px mobile (simplified columns: Exercise, Reps, Time).

---

## Prompt 3 — Debug / System Trace Panel

> Design a **Debug Trace panel** for the WOD Wiki review page.
> This panel is only visible when the developer debug toggle is on.
> It should feel like a **log viewer / event stream**, not a workout table.
>
> **What it shows:** Internal runtime execution events:
>
> | outputType | Meaning | Visual treatment |
> |---|---|---|
> | `load` | Script loaded | Muted, italic |
> | `compiler` | Compiler wired behaviors | Ochre left border |
> | `event` | Button press / timer event | Blue left border |
> | `system` | Stack push/pop/mount | Neutral row |
> | `completion` | Block completed | Green (normal) or amber (forced) |
>
> **Row data:**
> ```
> #          Row index
> Timestamp  Wall-clock time (HH:MM:SS.mmm)
> Block      sourceBlockKey (monospace, truncated)
> Type       outputType badge
> Depth      stackLevel (0-9)
> System     system metric value (internal event name)
> Reason     completionReason (only on 'completion' rows)
> Elapsed    actual elapsed time
> ```
>
> **Visual requirements:**
> - Compact row height (28-32px) — this is a dense log view
> - Monospace font (`Geist Mono`) for Block, Timestamp, Reason columns
> - `outputType` shown as a small colored badge/chip (see color map above)
> - The panel lives in a collapsible accordion at the bottom of the review page
>    with a "🐛 Debug Trace — 47 events" toggle header
> - When collapsed, shows only the toggle header
> - When expanded, the trace takes up to ~40vh with its own internal scroll
> - Background should be slightly darker than the main page to signal "developer zone":
>   use `--muted` surface with `--card-foreground` text
>
> **Show in mockup:**
> - Panel in expanded state
> - 6-8 sample rows covering all outputTypes
> - The accordion toggle in collapsed state (second view)
>
> Output: Light mode mockup at 1280px. Dark mode is especially important here
> (debug tools are often used at night) — include a dark mode variant.

---

## Prompt 4 — Collectible Metrics Wizard (Pre/Post Run Collection)

> Design a **Collectible Metrics collection UI** for WOD Wiki.
> This handles the case where a workout script has `?` placeholders that
> need to be filled in by the user.
>
> **Context:** WOD Wiki's workout syntax allows `?` for metric values:
> ```
> 3x
>   ? Push-ups          ← reps unknown
>   :? Rest             ← duration unknown
>   50 kg ? Bench Press ← reps unknown
> ```
> These produce "hinted" metrics (`origin: 'hinted'`, `value: undefined`, `image: '?'`).
>
> **Two modes:**
>
> ### Mode A: Pre-Run Planning Sheet
> Shown as a full-panel overlay before the workout starts.
> Title: **"Set Your Targets"**
> Subtitle: "Fill in your planned values before starting"
> Primary CTA: **"Start Workout →"** (primary button, full width at bottom)
> Secondary: "Skip for now" (text link)
>
> ### Mode B: Post-Run Review Prompt (inline banner)
> Shown as a collapsible banner at the top of the Review Page when
> uncollected items remain after the workout.
> Title: **"Fill in your actuals"**
> Status pill: `3 of 7 filled in` (progress)
> The banner expands to show collection cards when clicked.
>
> **Collection Item Card (used in both modes):**
>
> ```
> ┌─────────────────────────────────────────┐
> │  🏃 Push-ups                    Round 1  │
> │  ─────────────────────────────────────── │
> │  💪 Reps                                 │
> │  ┌───────────────────────────────────┐  │
> │  │  [         10          ]          │  │
> │  └───────────────────────────────────┘  │
> │                         [Skip] [Save →] │
> └─────────────────────────────────────────┘
> ```
>
> Card anatomy:
> - **Header**: Exercise name (metric-effort colored pill) + context (Round N / Set N)
> - **Metric label**: type icon + type name (e.g., "💪 Reps") in muted-foreground
> - **Input field**: large, prominent — uses `--primary` focus ring
>   - Reps: number input
>   - Duration: time input (`MM:SS` format with colon auto-insert)
>   - Distance: number + unit selector
>   - Resistance: number + unit selector (kg/lb)
> - **Actions**: "Skip" (ghost) and "Save →" (primary, disabled until value entered)
>
> Card states:
> - **Empty / Pending**: white card, amber `◉` indicator in top-right
> - **Filled**: subtle success-green outline, `✓` replacing `◉`
> - **Skipped**: grayed out with strikethrough label
>
> **Layout for multiple items:**
> - Mobile (375px): single column, vertically stacked, paginated with "2 / 5" counter
>   and swipe or prev/next buttons
> - Tablet+ (768px+): 2-column card grid
> - Desktop (1280px+): 3-column card grid
>
> **Progress bar:** Thin `--primary` progress strip at top of the panel/banner
> showing % of items filled.
>
> Output: Two full mockups:
> 1. **Pre-run planning sheet** — full panel at 375px mobile showing 3 items
>    (one empty, one filled, one with a time input focused)
> 2. **Post-run review banner** — inline banner variant at 1280px desktop, expanded,
>    showing the same 3 items in 3-column grid layout
> Both in light mode. Include a dark mode variant for the pre-run sheet.

---

## Prompt 5 — Full Review Page Composition

> Design the **complete Review Page** for WOD Wiki combining all four panels
> into a cohesive full-page layout.
>
> This is the page a user sees after completing a workout.
> Prioritize: clarity, sense of accomplishment, easy data entry.
>
> **Page structure (top to bottom):**
>
> 1. **App chrome** — minimal header bar:
>    - Left: workout title (e.g., "Tuesday WOD") + completion time/date
>    - Right: Cast button (Chromecast icon), Audio toggle, Close (✕)
>    - Height: 48px, border-bottom
>
> 2. **Collection Banner** (conditional — only if uncollected `?` items remain):
>    - Amber/warning strip: `⚠️ 3 metrics need your input`
>    - Expands/collapses on click
>    - Collapsed: single-line banner with count + "Fill In" CTA button
>    - Expanded: shows collection cards (see Prompt 4 Mode B)
>
> 3. **Session Summary** — the analytics stat cards (see Prompt 2):
>    - Section label: `📊 SESSION SUMMARY` (uppercase, letter-spacing)
>    - 2-4 stat cards in a horizontal strip
>    - Subtle top/bottom dividers separating this section
>
> 4. **Workout Log** — the segment table (see Prompt 2):
>    - Section label: `📋 WORKOUT LOG`
>    - Full-width table with toolbar
>    - Takes majority of vertical space (flex-1)
>    - Internal scroll for long workouts
>
> 5. **Debug Trace accordion** (only in debug mode):
>    - `🐛 DEBUG TRACE — 47 events` toggle
>    - Collapsed by default
>
> **Constraints:**
> - Full-viewport height (no page scroll — internal panel scroll only)
> - Mobile-first: on 375px, the collection banner and stat cards stack vertically;
>   the workout log gets ~60vh
> - The Collection Banner and Session Summary together should not exceed 35vh so
>   the Workout Log remains the primary focus
>
> Output:
> - Desktop (1280×900) light mode: full page layout
> - Mobile (375×812) light mode: same page, mobile layout
> - Desktop dark mode: full page in Arctic Frost palette
>
> Annotate the mockup with component boundaries labeled (Panel 1, Panel 2, etc.)
> and interaction hotspots (where clicking opens collection cards, how row
> selection works, etc.)

---

## Summary Table — Data Types by Panel

| Panel | OutputTypes Shown | Data Source | User Interaction |
|---|---|---|---|
| **Workout Log** | `segment`, `milestone`, `group` | `AnalyticsTransformer.fromOutputStatements()` | Select rows, click `?` cells to fill |
| **Analytics Summary** | `analytics` | `AnalyticsEngine.finalize()` → `ProjectionResult[]` | Read-only stat cards |
| **Debug Trace** | `system`, `event`, `load`, `compiler`, `completion` | All raw `OutputStatement[]` | Read-only log, debug mode only |
| **Collection Banner** | n/a (from parsed `CodeStatement[]`) | `IMetric` with `origin: 'hinted'` | Form inputs per metric type |

## Summary Table — Metric Origins

| Origin | Meaning | Where Set | Displayed As |
|---|---|---|---|
| `parser` | Value in the script (`10 reps`) | Parser | Normal metric pill |
| `hinted` | Placeholder in script (`? reps`) | Parser | `◉` amber indicator, clickable |
| `compiler` | Synthesized by compiler | JIT compiler | Normal pill (lower precedence) |
| `runtime` | Captured during execution | RuntimeBlock | Normal pill |
| `user` | Entered by the user | UserOverrideDialog / Collection wizard | Normal pill + `👤` badge |
| `analyzed` | Derived from analytics engine | `AnalyticsEngine` | Analytics card |
| `collected` | User confirmed a hinted value | Post-collection | Replaces `hinted` |
