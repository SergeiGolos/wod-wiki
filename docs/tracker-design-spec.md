# Tracker Screen — Design Specification

**Issue:** WOD-616  
**Author:** Designer Agent  
**Date:** 2026-05-24  
**Status:** Draft  
**Cross-ref:** WOD-615 (Data Model Documentation)

---

## 1. Overview

The **Tracker** is the live workout execution screen in WOD.Wiki. It bridges the authored Whiteboard script (Plan view) and the post-workout analytics (Review view). Its primary job is to guide athletes through a workout in real time with a clear timer, contextual exercise cues, and minimal cognitive overhead.

The Tracker must serve three very different viewing contexts with a single underlying component tree:

| Context | Surface | Distance | Key concern |
|---------|---------|----------|-------------|
| Mobile | Phone, portrait or landscape | Arms-length | Touch targets, thumb-reachable controls, legibility on small screens |
| Desktop | Laptop / monitor, browser | Desk distance | Information density, keyboard shortcuts |
| Chromecast / TV | Browser receiver or React Native TV app | ~10 feet | Huge type, D-pad navigation, no touch |

---

## 2. Information Architecture

```
Workbench (h-screen, w-screen)
├── Header Bar (h-14, sticky)
│   ├── Logo (WOD.WIKI commit-graph art, links to /)
│   ├── Version badge
│   ├── Date badge (desktop only, shows current entry date)
│   ├── Save state indicator (Changed / Saving… / Saved / Error)
│   ├── Search button (Ctrl+/)
│   ├── Debug toggle
│   ├── Cast (Chromecast) button
│   ├── Help button (triggers tutorial)
│   ├── View mode tabs: [Plan] [Track] [Review]
│   ├── Attachments dropdown
│   ├── Notebook menu
│   └── Note Details panel toggle
│
└── Main Content Area (flex-1, overflow-hidden)
    └── Track View  ← this spec
        ├── State A: Pre-run Wizard (CollectionWizard)
        ├── State B: No Runtime (workout selection screen)
        └── State C: Active Runtime (TrackViewShell)
            ├── Left Panel: Visual State Panel
            │   ├── RuntimeStackView (active block stack)
            │   └── "Up Next" card (LookaheadView)
            └── Right Panel: Timer Display
                ├── MetricTrackerCard (session total bubbles)
                └── TimerStackView
                    ├── Skip Flash message
                    ├── Timer Circle (SVG ring + time + Play/Pause)
                    └── Controls Row (Stop · Next)
```

---

## 3. Track View States

### 3.1 State A — Pre-Run Collection Wizard

**Trigger:** `execution.status === 'idle'` AND `collectionItems.length > 0` AND wizard not dismissed.

The **CollectionWizard** is a full-screen modal that prompts the athlete to set target values (reps, distance, weight, duration) before starting. This allows the runtime to track personal records and actual vs. target comparisons.

**Layout (pre-run mode):**
- Fixed overlay: `inset-0` on mobile, `inset-10` on md+
- Progress bar (top strip)
- Header: "Set Your Targets" + `{n} of {m} metrics` counter + close (×) button
- Content area: exercise label pill + metric type icon + large centered text input
- Footer: Back (prev) · Skip · Save → (disabled until input entered)
- Bottom: prominent "Start Workout →" CTA button

**Behavior:**
- Navigates through metrics one at a time (Next/Back buttons)
- Skip is always available — skipped items get `undefined` override
- Once all items are visited, "Finish" replaces "Save →"
- Close dismisses the wizard (athlete can start without setting targets)
- After wizard dismissal, sets `wizardDismissed = true` until status leaves idle

**Post-run variant (banner):**
- Compact amber warning banner: "{n} uncollected metrics — fill in your actuals"
- "Fill In Now" button expands to the full wizard in `post-run` mode

---

### 3.2 State B — No Runtime (Workout Selection)

**Trigger:** `runtime === null`

Shown when the athlete has not yet selected a workout block to run.

**Layout:**

**Mobile (isCompact):**
- Full-width `WorkoutPreviewPanel` — filtered list of runnable WOD blocks from the current note
- Each block has a "Run" button that fires `onStartWorkout`

**Desktop (not compact):**
- Left column (w-1/2): `WorkoutPreviewPanel`
- Right column (flex-1): Placeholder state panel

**Placeholder states:**
- **Default**: "Select a Session" heading + "Choose a workout block from your note to begin tracking" + italic hint "Click 'Run' on any Whiteboard script to start the timer and visualizer."
- **Not Found** (`sectionId === 'notfound'`): Error state with `!` icon, "WOD Not Found" heading, explanation + dashed suggestion box

---

### 3.3 State C — Active Runtime

**Trigger:** `runtime !== null`

The main tracker experience. Uses `TrackViewShell` to split left (context) and right (timer controls).

---

## 4. TrackViewShell — Layout Behavior

Layout is container-aware via `PanelSizeContext` (ResizeObserver, not viewport width).

| Condition | Layout | Left panel | Right panel |
|-----------|--------|------------|-------------|
| `isCompact` (container < 500px) | `flex-col` | `flex-1 min-h-0`, border-bottom | `shrink-0` |
| Default (container ≥ 500px) | `flex-row` | `flex-1 min-w-0`, border-right | `w-1/2` |

**Color surfaces:**
- Left panel: `bg-secondary/10`
- Right panel: `bg-background`

---

## 5. Left Panel — Visual State Panel

**Component:** `VisualStatePanel` → `RuntimeStackView` + `LookaheadView`

**Purpose:** Gives the athlete context about where they are in the workout structure. Shows the block stack (hierarchy from root → current exercise) and previews what's coming next.

### 5.1 RuntimeStackView

Renders the runtime execution stack as a vertical list of cards, ordered Root → Leaf (top → bottom).

**Non-Leaf block card** (context/parent blocks):
- Muted background (`bg-muted/30 border-transparent`)
- Small label text (`text-xs text-muted-foreground/70`)
- Label shows: `roundDisplay.label` (e.g. "Round 2 of 3") if available, else `block.label`
- SessionRoot always shows `block.label` (not round display)
- Timer badge (if block has time spans): monospace elapsed time, pulses if running

**Leaf block card** (current active exercise):
- Highlighted: `bg-card shadow-sm border-primary/40 ring-1 ring-primary/10`
- Slide-in animation on mount (`animate-in fade-in slide-in-from-left-1 duration-300`)
- Renders display metrics inline in the header (bold, `text-base`)
- Falls back to `block.label` if no metrics
- Timer badge: `bg-primary/10 text-primary animate-pulse` when running

**Interleaved History Summaries** (between stack levels):
- Appears below each parent block, summarizing completed children
- Shows: ✓ `{n} Completed` + clock icon + total duration
- Style: `text-xs text-muted-foreground`, left-border accent

**Debug mode extras:**
- Block type badge on each card
- Block key (monospace, truncated)
- Inspect button (opens `BlockDebugDialog`)
- Promote and private metric tiers visible with `VisibilityBadge` labels

**Empty state:**
- Dashed border box with `ListTree` icon + "No Active Blocks" text

### 5.2 LookaheadView ("Up Next" Card)

Renders a preview of the next exercise block before it becomes active.

**Container:** Dashed card (`Card` with `bg-muted/30 border-dashed`)  
**Header:** "Up Next" label (uppercase, tracking-wider, muted)  
**Content:** `MetricSourceRow` in compact size showing the upcoming exercise metrics

**Empty state:** Dashed box with ✓ icon + "End of section" italic text

---

## 6. Right Panel — Timer Display

**Component tree:** `TimerDisplay` → `StackIntegratedTimer` → `MetricTrackerCard` + `TimerStackView`

### 6.1 MetricTrackerCard

Floating analytics bubbles that appear above the timer circle after the first block completes.

- Renders when `session-totals` metrics exist in memory
- Each bubble: backdrop-blur glass card with metric key + value + unit
- Icons: `Sparkles` inside each bubble; `Sigma` badge at end (indicates session totals)
- Animation: `animate-in fade-in slide-in-from-bottom-2 duration-500`
- Layout: `flex-wrap justify-center gap-2 px-4 mb-2`

**Typical metrics:** reps, calories, distance, time

### 6.2 TimerStackView

The primary timer control surface. Contains the progress ring, time display, and action buttons.

#### 6.2.1 Skip Flash Message

When the athlete tries to skip a timer marked as non-skippable, an amber flash banner appears above the timer circle.

- Text: "Timer can't be skipped!"
- Style: amber pill, white text, shadow, `pointer-events-none`
- Animation: `animate-skip-flash` (fade + upward drift over 3 seconds)
- Unique `key` incremented on each attempt so animation restarts on rapid re-taps

#### 6.2.2 Timer Circle

The primary time display. An SVG progress ring surrounds a clickable inner circle.

**SVG Ring:**
- Outer (background): `stroke-border`, 8px
- Progress stroke: `#18E299` (WOD.Wiki green), `strokeLinecap="round"`, 8px
- Ring math: `r=100`, circumference `≈628px`
- Count-down: `strokeDashoffset = 628 × (1 - remaining/duration)` — ring depletes as time runs out
- Count-up / infinite: progress stays at 100%; ring pulses (`animate-pulse-border`)
- Ring rotated -90° so progress starts at 12 o'clock

**Inner circle (button):**
- Click: **toggles Play / Pause**
- Size: compact `w-[min(10rem,65vw)] h-[min(10rem,65vw)]`; default `w-40 h-40 lg:w-[17rem] lg:h-[17rem]`
- Style: `bg-background rounded-full border border-border shadow`
- Hover: scale 1.02, deeper shadow
- Content: large mono time display + Play or Pause icon

**Time display format:** `MM:SS` (monospace, `tabular-nums`)  
- Count-down: shows `max(0, duration - elapsed)`  
- Count-up: shows `elapsed`

**Font sizes:**
- Compact: `text-4xl`
- Default: `text-5xl lg:text-6xl`

#### 6.2.3 Label Context (above timer)

The `StackIntegratedTimer` derives main and sub labels from the runtime stack.

**Label resolution priority:**
1. **Pinned primary timer** (e.g. AMRAP, For Time) — uses rounds label as main + current exercise as sub
2. **Rounds block present** — rounds label as main, leaf exercise as sub
3. **Leaf only** — leaf label (or primary timer label) as main, no sub

**Sub-label rendering:**
- When leaf has multiple display rows (grouped exercise groups): renders each row as a separate line
- Otherwise: single `subLabel` line

**Display:** sub-labels sit above the timer circle in the `TimerStackView` (via `subLabels` prop)

#### 6.2.4 Controls Row

Positioned below the timer circle.

| Button | Icon | Size (default) | Style | Action |
|--------|------|----------------|-------|--------|
| **Stop** | `StopCircle` | `w-12 h-12` + label | Muted, destructive on hover | Ends session |
| **Next** | `SkipForward` | `w-16 h-16 sm:w-20 sm:h-20` | Filled pill (`bg-foreground text-background`) | Advances to next block |

**Stop button:** column layout (icon + "Stop" label), hover turns destructive  
**Next button:** centered icon only, primary pill, hover: `opacity-90 -translate-y-0.5`

---

## 7. Gesture & Hardware Input

| Input | Condition | Action |
|-------|-----------|--------|
| Swipe left | `enableGestures=true`, not typing | Next block |
| Swipe right | `enableGestures=true`, not typing | Stop session |
| `AudioVolumeUp` key | view mode = 'track', not typing | Next block |
| `Enter` / `keyCode 13` | view mode = 'track', not typing | Next block |

`enableGestures` is only `true` when `viewMode === 'track'` (not in plan or review).

Min swipe distance: 50px.

---

## 8. Cross-Screen Matrix

### 8.1 Mobile (< 768px viewport)

| Element | Mobile Behavior |
|---------|----------------|
| Header | Icon-only buttons (search, debug, cast, help, view tabs, attachments, notebook) |
| View mode tabs | Icon only (no label) |
| Save state indicator | Hidden |
| Search | Icon button only |
| WOD.WIKI logo | Compact (150px, "WOD.WIKI") |
| TrackViewShell | `flex-col`: visual state stacked above timer |
| Timer circle | `w-[min(12rem,75vw)] h-[min(12rem,75vw)]` — scales with screen width |
| Time text | `text-4xl` |
| Controls row | Tighter gaps (`gap-3`) |
| No-runtime state | WorkoutPreviewPanel fills entire width (no placeholder panel) |
| CollectionWizard | `fixed inset-0 z-50` (true full-screen) |

### 8.2 Desktop (≥ 1024px viewport)

| Element | Desktop Behavior |
|---------|-----------------|
| Header | Full labels on view tabs, save state badge, full search bar, date badge |
| TrackViewShell | `flex-row`: visual state left (flex-1), timer right (w-1/2) |
| Timer circle | `w-48 h-48 lg:w-80 lg:h-80` |
| Time text | `text-5xl lg:text-6xl` |
| Controls row | Wider gaps (`gap-3 sm:gap-6`) |
| No-runtime state | Left column: workout preview; right column: placeholder panel |
| CollectionWizard | `fixed inset-10` (inset margins, centered card) |
| Keyboard shortcuts | Ctrl+/ search; Enter/Volume-Up for next |

### 8.3 Chromecast Browser Receiver

The receiver is a separate HTML entry point (`receiver-rpc.tsx`). It uses the same `TrackViewShell` and timer components as the browser.

**Screen modes & what shows:**

| Mode | UI |
|------|----|
| `idle` (waiting) | Black screen, pulsing "Wod.Wiki // {status}" in mono/uppercase |
| `preview` | `ReceiverPreviewPanel` — workout block selection list, D-pad navigable |
| `active` | `TrackViewShell`: left=`ReceiverStackPanel` (VisualStatePanel), right=`ReceiverTimerPanel` |
| `review` | `ReceiverReviewPanel` — post-workout summary screen |

**Active mode specifics (TV):**
- Full-screen (`h-screen w-screen bg-background`)
- Same `TrackViewShell` split layout
- Spatial navigation via `useSpatialNavigation` hook:
  - Initially focused element: `btn-next`
  - Focusable elements: `timer-main`, `btn-stop`, `btn-next`
  - D-pad focus ring: `data-[nav-focused=true]:ring-4 ring-primary/60 scale-105`
  - Element-level activation flash (`.tv-activating`) on select

**Review mode (TV):**
- "Workout Complete" heading (`text-4xl font-bold`)
- Green ✓ checkmark icon (`h-12 w-12`)
- Total Duration card: `text-3xl font-bold font-mono`
- 2-column analytics grid: projection cards with metric value + unit + name
- Dismiss button: large pill (`px-8 py-4 rounded-xl text-lg`)
- ⊙ Select hint below dismiss button
- Focused: bg-primary, text-primary-foreground, ring-4 ring-primary/60, scale-105

**Keyboard (TV remote):**
- `Escape` / `Backspace`: dispatch `stop` event → return to preview

**Preview mode (TV):**
- Focuses `preview-block-0` on mount
- Select on a preview block → sends `select-block` event with block index/ID

### 8.4 React Native TV App (`/tv`)

A separate React Native application with WebSocket-based communication.

| Element | TV App |
|---------|--------|
| Background | `#000000` |
| Timer text | `fontSize: 140`, white, bold, tabular-nums |
| Timer label | `fontSize: 48`, `#4ade80` (green) |
| Workout title | `fontSize: 32`, `#aaaaaa` |
| Round info | `fontSize: 32`, white |
| Communication | WebSocket `stateUpdate` / `castStop` events |

> **Design note:** The React Native TV app is an early prototype. Its visual language differs from the web receiver. A future design pass should align it with the web receiver's typography scale and green (#18E299) accent color.

---

## 9. Component-Level Interaction Behaviors

### 9.1 Timer State Machine (display)

```
idle
  └─[start]──→ running
                 ├─[pause]──→ paused
                 │              └─[resume]──→ running
                 ├─[next]───→ (next block, stays running)
                 └─[stop]───→ idle / review
```

- `isRunning` = `isAnyTimerRunning || executionStatus === 'running'`
  - This ensures the Pause button shows even between blocks when no timer span is open

### 9.2 Block Stack Transitions

- Block push → new leaf card animates in from the left
- Block pop → leaf card removed; parent becomes new leaf
- Round advance → `roundDisplay.label` updates reactively (e.g. "Round 2 of 3")
- History summaries update as blocks complete

### 9.3 Session Analytics (MetricTrackerCard)

- Invisible until first `session-totals` metric entry appears
- Each completed block pops → analytics recalculated → bubbles update
- Uses `animate-in fade-in slide-in-from-bottom-2 duration-500` on first appearance

---

## 10. Typography & Color Tokens

| Role | Token / Value |
|------|---------------|
| Primary accent | `hsl(--primary)` |
| Timer ring active | `#18E299` (WOD.Wiki green) |
| Timer ring track | `hsl(--border)` |
| Leaf card border | `hsl(--primary)/40` |
| Non-leaf card | `bg-muted/30 border-transparent` |
| Time display | `font-mono tabular-nums font-semibold tracking-tighter` |
| Label (main) | `font-semibold text-foreground` |
| Label (sub) | `text-muted-foreground` |
| Next button | `bg-foreground text-background` |
| Stop button (hover) | `text-destructive bg-destructive/10` |

---

## 11. Accessibility Notes

- All buttons have `title` attributes used by E2E tests and screen readers
- Timer circle button: `focus-visible:outline-2 focus-visible:outline-ring`
- Controls use `:focus-visible` ring styles
- Gestures are optional (`enableGestures` guard) and have keyboard equivalents
- TV navigation: high-contrast focus ring at `ring-primary/60` with scale-105 for 10-foot visibility
- Skip flash: `pointer-events-none`, purely informational

---

## 12. Known UX Issues & Design Debt

| ID | Issue | Impact | Status |
|----|-------|--------|--------|
| UX-01 | Close button dismissed runner with 100ms delay, felt broken | Medium | Fixed |
| UX-02 | Play button showed even when runtime was active between segments | High | Fixed (executionStatus guard) |
| WOD-274 | Full-screen activation flash imperceptible at TV distance | Medium | Fixed (element-level flash) |
| — | React Native TV app visual language diverges from web receiver | Low | Open — future design pass needed |
| — | No loading/skeleton state for WorkoutPreviewPanel | Low | Open |
| — | `progress` bubble in CollectionWizard always shows 0% (placeholder math) | Low | Open — `progress` var unused |
| — | subLabel rendered in `TimerStackView` but not visually placed in current JSX | Medium | Needs audit |

---

## 13. Files & Ownership

| File | Role |
|------|------|
| `src/panels/track-panel.tsx` | Top-level Track view; SessionHistory, TimerScreen |
| `src/panels/timer-panel.tsx` | TimerDisplay, StackIntegratedTimer |
| `src/panels/visual-state-panel.tsx` | VisualStatePanel |
| `src/panels/track-panel-chromecast.tsx` | ReceiverStackPanel |
| `src/panels/timer-panel-chromecast.tsx` | ReceiverTimerPanel |
| `src/panels/review-panel-chromecast.tsx` | ReceiverReviewPanel |
| `src/panels/preview-panel-chromecast.tsx` | ReceiverPreviewPanel |
| `src/components/workout/TrackViewShell.tsx` | Layout shell (shared browser + cast) |
| `src/components/workout/TimerStackView.tsx` | Timer circle + controls (full UI) |
| `src/components/track/VisualStateComponents.tsx` | RuntimeStackView, LookaheadView, HistorySummaryView |
| `src/components/track/MetricTrackerCard.tsx` | Session analytics bubbles |
| `src/components/review/CollectionWizard.tsx` | Pre-run target wizard |
| `src/panels/panel-system/TrackViewShell.tsx` | Layout shell |
| `src/panels/panel-system/PanelSizeContext.tsx` | Container-aware breakpoints |
| `src/panels/panel-system/useScreenMode.ts` | Viewport-level breakpoints |
| `src/panels/panel-system/viewDescriptors.ts` | View panel configuration |
| `src/components/layout/Workbench.tsx` | Root shell + header |
| `src/receiver-rpc.tsx` | Chromecast receiver entry point |
| `tv/src/screens/WorkoutScreen.tsx` | React Native TV workout screen |
| `e2e/pages/TrackerPage.ts` | Playwright page object |
| `e2e/acceptance/fullscreen-timer-close.e2e.ts` | Close button E2E test |

---

## 14. Open Questions (for WOD-615 cross-reference)

The following questions depend on data model documentation from [WOD-615]:

1. **What metrics types can appear in `session-totals`?** — Determines how many bubbles the `MetricTrackerCard` can show and whether layout needs to handle overflow.
2. **What is the maximum stack depth?** — Informs how many non-leaf cards may stack in the VisualStatePanel.
3. **How are "pinned" timers determined in block memory?** — Relevant for label resolution logic documented in §6.2.3.
4. **What events fire between block transitions (silent period)?** — Determines whether UX-02 can recur with new block types.
5. **Are there block types beyond `Rounds`, `AMRAP`, `EMOM`, `ForTime`, `SessionRoot`?** — Each new block type may need its own label resolution case.

---

*Generated by Designer Agent. Cross-references: [WOD-615] (data model), [WOD-616] (this issue parent).*
