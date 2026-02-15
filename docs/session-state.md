# Session State — Track Screen Panel Architecture

This document explains how the **Track Screen session panel** binds to its three data sources and how each block type is rendered within it.

## Panel Overview

The panel you see during a live workout session looks like this:

```
┌──────────────────────────────────────────────────┐
│ ○ Workout              session-root      00:21   │  ← SessionRoot block
│                                                  │
│   ├ ✓ 1 Completed · 0:00                         │  ← Interleaved history (level 1)
│   │                                              │
│   └─ 3 Rounds         Rounds         🔄 3       │  ← Loop block (active parent)
│      │                                           │
│      ├ ✓ 1 Completed · 0:00                      │  ← Interleaved history (level 2)
│      │                                           │
│      └─ Thrusters 95 lb   effort      00:19     │  ← Effort block (active leaf)
│         🏃 Thrusters  💪 95 lb                   │     Fragment display rows
│                                                  │
├──────────────────────────────────────────────────┤
│ UP NEXT                                          │
│ → Next Block                                     │  ← Lookahead from script AST
└──────────────────────────────────────────────────┘
```

This panel is rendered by three components:

| Component | File | Role |
|-----------|------|------|
| `VisualStatePanel` | [src/components/track/VisualStatePanel.tsx](../src/components/track/VisualStatePanel.tsx) | Container — wires data sources to child views |
| `RuntimeStackView` | [src/components/track/VisualStateComponents.tsx](../src/components/track/VisualStateComponents.tsx) | Renders stack blocks + interleaved history |
| `LookaheadView` | [src/components/track/VisualStateComponents.tsx](../src/components/track/VisualStateComponents.tsx) | Shows the next upcoming block from the script tree |

---

## The Three Data Sources

The panel draws from **three distinct data sources**, each providing a different layer of information:

```
┌─────────────────────────────────────────────────────────────┐
│                   VisualStatePanel                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ 1. Runtime   │  │ 2. Block     │  │ 3. Output          │ │
│  │    Stack     │  │    Memory    │  │    Statements      │ │
│  │              │  │              │  │                    │ │
│  │ IRuntimeBlock│  │ MemoryTypes  │  │ IOutputStatement   │ │
│  │ []           │  │ per block    │  │ []                 │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘ │
│         │                 │                    │            │
│         └─────────────────┼────────────────────┘            │
│                           ▼                                 │
│                  RuntimeStackView                           │
│                  ├── StackBlockItem (per block)              │
│                  │   └── FragmentSourceRow (per display row) │
│                  └── renderHistorySummary (interleaved)      │
│                                                             │
│                  LookaheadView                              │
│                  └── reads script.getId() tree              │
└─────────────────────────────────────────────────────────────┘
```

### Data Source 1: Runtime Stack (`IRuntimeBlock[]`)

**What it provides:** The ordered list of currently active blocks on the execution stack.

**Source:** `runtime.stack.blocks` from `IScriptRuntime`

**Key file:** [src/runtime/contracts/IRuntimeBlock.ts](../src/runtime/contracts/IRuntimeBlock.ts)

Each block on the stack exposes:

| Property    | Type            | UI Usage                                                              |
| ----------- | --------------- | --------------------------------------------------------------------- |
| `key`       | `BlockKey`      | Unique ID displayed as truncated hash                                 |
| `blockType` | `string`        | Badge label (`session-root`, `Rounds`, `effort`, etc.)                |
| `label`     | `string`        | Primary display text (`"Workout"`, `"3 Rounds"`, `"Thrusters 95 lb"`) |
| `sourceIds` | `number[]`      | Links back to parsed script statements                                |
| `context`   | `IBlockContext` | Memory allocation scope                                               |

**Stack ordering:** The stack stores blocks leaf-to-root. The panel reverses this to display root-to-leaf (top-down hierarchy). The last block in the reversed array is the **active leaf** — the block currently being executed.

**How the panel subscribes:** The `RuntimeStackView` reads `runtime.stack.blocks` directly. Stack changes (push/pop) trigger React re-renders through the runtime context subscription.

---

### Data Source 2: Block Memory (typed per-block state)

**What it provides:** Observable, typed state entries owned by each block on the stack.

**Source:** `block.getMemoryByTag(tag)` and `block.getMemory(type)` per `IRuntimeBlock`

**Key file:** [src/runtime/memory/MemoryTypes.ts](../src/runtime/memory/MemoryTypes.ts)

Each block can own multiple memory entries keyed by `MemoryType`. The panel reads two specific memory types:

#### `'timer'` → `TimerState`

```typescript
interface TimerState {
  readonly spans: readonly TimeSpan[];  // Active time segments
  readonly durationMs?: number;          // Target duration (countdowns)
  readonly direction: 'up' | 'down';   // Count direction
  readonly label: string;               // Timer label
  readonly role?: 'primary' | 'secondary' | 'auto';
}
```

The `useTimerElapsed(blockKey)` hook subscribes to timer memory and provides:
- `elapsed`: total milliseconds across all spans (pause-aware)
- `isRunning`: whether the timer is currently active
- `timeSpans`: raw start/stop pairs

This is how the panel shows `00:21` next to SessionRoot and `00:19` next to the effort block.

**Key file:** [src/runtime/hooks/useTimerElapsed.ts](../src/runtime/hooks/useTimerElapsed.ts)

#### `'fragment:display'` → `FragmentDisplayState`

```typescript
interface FragmentDisplayState {
  readonly fragments: readonly ICodeFragment[];   // Raw fragments
  readonly resolved: readonly ICodeFragment[];    // Precedence-resolved
}
```

The `StackBlockItem` component subscribes to `fragment:display` memory locations via `block.getMemoryByTag('fragment:display')`. Each location produces a row of fragment pills:

- 🏃 `exercise` → Exercise name (e.g., "Thrusters")
- 💪 `weight` → Load (e.g., "95 lb")
- 🔄 `rounds` → Round count
- ⏱️ `timer` → Duration

**Subscription pattern:** `StackBlockItem` calls `loc.subscribe()` on each `fragment:display` memory location, re-rendering when fragments change (e.g., when rep scheme advances from 21 → 15 → 9).

#### Other memory types (used by block internals, not directly by the panel)

| Tag | Shape | Purpose |
|-----|-------|---------|
| `'round'` | `RoundState` `{ current, total }` | Loop iteration counter |
| `'completion'` | `CompletionState` `{ isComplete, reason }` | Block completion tracking |
| `'display'` | `DisplayState` `{ mode, label, subtitle }` | UI labels for timer display |
| `'controls'` | `ButtonsState` `{ buttons: ButtonConfig[] }` | Action buttons |
| `'fragment'` | `FragmentState` `{ groups }` | Raw compiled fragments |

---

### Data Source 3: Output Statements (`IOutputStatement[]`)

**What it provides:** Historical records of completed block executions, emitted when blocks unmount (pop off the stack).

**Source:** `useOutputStatements(runtime)` hook → `runtime.getOutputStatements()`

**Key files:**
- [src/core/models/OutputStatement.ts](../src/core/models/OutputStatement.ts) — interface definition
- [src/runtime/hooks/useOutputStatements.ts](../src/runtime/hooks/useOutputStatements.ts) — React hook

Each output statement contains:

| Property | Type | UI Usage |
|----------|------|----------|
| `outputType` | `'segment' \| 'completion' \| ...` | Categorize for display |
| `stackLevel` | `number` | Depth when emitted (0 = root, 1 = first child, etc.) |
| `elapsed` | `number` | Pause-aware active time in ms |
| `timeSpan` | `TimeSpan` | Wall-clock bracket |
| `sourceBlockKey` | `string` | Links back to the block that produced it |
| `completionReason` | `string` | Why the block completed |

**How the panel uses this:** The `renderHistorySummary(level)` function filters outputs by `stackLevel` and `outputType === 'completion'`. For example:

- Between SessionRoot (level 0) and Rounds (level 1), it filters for `stackLevel === 1` completions → shows `"1 Completed · 0:00"`
- Between Rounds (level 1) and Effort (level 2), it filters for `stackLevel === 2` completions → shows how many exercises finished in this round

This creates the **interleaved history** effect — completion summaries appear between parent and child blocks.

---

## Block Type → Display Mapping

Each compiled strategy produces a block with a specific `blockType`, a behavior chain, and memory allocations. Here is how each type maps to the panel:

### `SessionRoot` — `blockType: "session-root"`

**Strategy:** [SessionRootStrategy](../src/runtime/compiler/strategies/SessionRootStrategy.ts) → [SessionRootBlock](../src/runtime/blocks/SessionRootBlock.ts)

**Always the bottom of the stack (root).** Created explicitly when a workout starts, not matched from statements.

| Panel Element | Source |
|---------------|--------|
| Label: `"Workout"` | `config.label ?? 'Workout'` |
| Badge: `session-root` | `BlockKey('session-root')` prefix |
| Timer: `00:21` (counting up) | `TimerInitBehavior` with `direction: 'up'`, `role: 'primary'` |

**Key behaviors:**
- `SegmentOutputBehavior` — emits output on mount/unmount
- `TimerInitBehavior` / `TimerTickBehavior` / `TimerPauseBehavior` — primary elapsed timer
- `WaitingToStartInjectorBehavior` — pushes a gate block on mount
- `ChildRunnerBehavior` — sequences child blocks
- `SessionCompletionBehavior` — pops when all children done
- `HistoryRecordBehavior` — records session on unmount
- `DisplayInitBehavior` / `ButtonBehavior` — UI controls

**Memory written:** `timer`, `fragment:display`, `completion`, `display`, `controls`

---

### `Rounds` — `blockType: "Rounds"`

**Strategy:** [GenericLoopStrategy](../src/runtime/compiler/strategies/components/GenericLoopStrategy.ts)

**Matched when** a statement has a `Rounds` fragment (e.g., `3 Rounds` or `21-15-9`).

| Panel Element | Source |
|---------------|--------|
| Label: `"3 Rounds"` or `"21-15-9"` | Round count or rep scheme joined with `-` |
| Badge: `Rounds` | `setBlockType("Rounds")` |
| Icon: 🔄 | Fragment display with `Rounds` fragment type |
| Round indicator: `3` | `RoundState.total` from `round` memory |

**Key behaviors:**
- `RoundInitBehavior` — initializes `round` memory with `{current: 1, total: N}`
- `RoundAdvanceBehavior` — increments round on `next()`
- `RoundCompletionBehavior` — marks complete when `current > total`
- `RepSchemeBehavior` — if rep scheme (21-15-9), promotes current rep count to children
- `RoundDisplayBehavior` — updates `display` memory with round string
- `ChildRunnerBehavior` — pushes children per round
- `SegmentOutputBehavior` / `RoundOutputBehavior` — emits outputs

**Memory written:** `round`, `timer`, `display`, `fragment:display`, `completion`

---

### `effort` — `blockType: "effort"`

**Strategy:** [EffortFallbackStrategy](../src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts)

**Matched when** a statement has no timer, no rounds, and no children — a simple leaf exercise.

| Panel Element | Source |
|---------------|--------|
| Label: `"Thrusters 95 lb"` | Constructed from statement fragments |
| Badge: `effort` | `setBlockType('effort')` |
| Timer: `00:19` (counting up) | `TimerInitBehavior` with `direction: 'up'`, `role: 'secondary'` |
| Fragments: 🏃 Thrusters, 💪 95 lb | `fragment:display` memory → `FragmentSourceRow` |

**Always the active leaf** — the topmost block being executed. Highlighted with a primary border and ring.

**Key behaviors:**
- `TimerInitBehavior` — secondary countup timer (tracks effort duration, doesn't steal primary display)
- `PopOnNextBehavior` — completes when user advances
- `SegmentOutputBehavior` — emits output on unmount

**Memory written:** `timer`, `fragment:display`

---

### `Timer` — `blockType: "Timer"`

**Strategy:** [GenericTimerStrategy](../src/runtime/compiler/strategies/components/GenericTimerStrategy.ts)

**Matched when** a statement has a `Timer` fragment (e.g., `5:00 Run`).

| Panel Element | Source |
|---------------|--------|
| Label: `"Countdown"` or `"For Time"` | Based on timer direction |
| Badge: `Timer` | `setBlockType("Timer")` |
| Timer: countdown or countup | `TimerInitBehavior` with `role: 'primary'` |
| Fragments | From statement fragments |

**Key behaviors:**
- `TimerInitBehavior` — primary timer (countdown with completion, or countup)
- `TimerCompletionBehavior` — auto-completes countdown timers
- `PopOnNextBehavior` — completes on user advance (countup)
- `DisplayInitBehavior` — sets display mode
- `SoundCueBehavior` — countdown beeps
- `SegmentOutputBehavior` — emits output

**Memory written:** `timer`, `display`, `fragment:display`, `completion`

---

### `Rest` — (auto-generated, no `blockType` in match)

**Strategy:** [RestBlockStrategy](../src/runtime/compiler/strategies/components/RestBlockStrategy.ts) → [RestBlock](../src/runtime/blocks/RestBlock.ts)

**Not matched from statements** — auto-generated by `RestBlockBehavior` when parent interval time remains after exercises complete.

| Panel Element | Source |
|---------------|--------|
| Label: `"Rest"` | Default or configured label |
| Timer: countdown | `TimerInitBehavior` with `direction: 'down'`, `role: 'primary'` |

**Key behaviors:**
- `TimerInitBehavior` — countdown timer for rest duration
- `TimerCompletionBehavior` — auto-pops when rest over
- `DisplayInitBehavior` — shows rest countdown
- `SoundCueBehavior` — rest-over beep
- `SegmentOutputBehavior` — emits output

**Memory written:** `timer`, `display`, `fragment:display`, `completion`

---

### `AMRAP` — `blockType: "AMRAP"`

**Strategy:** [AmrapLogicStrategy](../src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts)

Logic overlay for "As Many Rounds As Possible" within a time cap.

| Panel Element | Source |
|---------------|--------|
| Label: `"AMRAP 20:00"` | From timer fragment value |
| Badge: `AMRAP` | `setBlockType("AMRAP")` |
| Timer: countdown | Primary countdown timer to time cap |
| Round display | `RoundDisplayBehavior` tracks completed rounds |

**Memory written:** `timer`, `round`, `display`, `fragment:display`, `completion`

---

### `EMOM` — `blockType: "EMOM"`

**Strategy:** [IntervalLogicStrategy](../src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts)

Logic overlay for "Every Minute On the Minute" interval training.

| Panel Element | Source |
|---------------|--------|
| Label: `"EMOM 3×1:00"` | From rounds × interval fragments |
| Badge: `EMOM` | `setBlockType("EMOM")` |
| Timer: interval countdown | Countdown per interval, auto-rest |
| Round display | Current interval / total |

**Memory written:** `timer`, `round`, `display`, `fragment:display`, `completion`

---

## Component Rendering Flow

### Step-by-step rendering pipeline:

```
1. VisualStatePanel mounts
   ├── Gets `runtime` from useScriptRuntime() context
   ├── Gets `outputs` from useOutputStatements(runtime)
   └── Passes both to RuntimeStackView and LookaheadView

2. RuntimeStackView receives (runtime, outputs)
   ├── Reads runtime.stack.blocks → reverses to [Root, Parent, ..., Leaf]
   └── For each block at index i:
       │
       ├── Renders StackBlockItem(block, index, isLeaf, isRoot)
       │   │
       │   ├── block.label → primary text
       │   ├── block.blockType → badge
       │   ├── block.key.toString() → truncated hash
       │   │
       │   ├── useTimerElapsed(block.key) → elapsed / isRunning
       │   │   └── Subscribes to 'timer' memory on the block
       │   │   └── Polls via requestAnimationFrame when running
       │   │
       │   └── block.getMemoryByTag('fragment:display') → display rows
       │       └── Each row → FragmentSourceRow component
       │           └── Renders color-coded fragment pills (🏃💪🔄⏱️)
       │
       └── Renders renderHistorySummary(childLevel = index + 1)
           └── Filters outputs where stackLevel === childLevel
               AND outputType === 'completion'
           └── Shows "N Completed · M:SS"

3. LookaheadView receives (runtime)
   ├── Gets activeBlock = runtime.stack.current
   ├── Gets sourceId from activeBlock.sourceIds[0]
   ├── Walks script.getId() tree to find parent → next sibling
   └── Renders "Up Next: [next block label]"
```

### Visual styling by position:

| Position | CSS Treatment | Meaning |
|----------|---------------|---------|
| Root (`isRoot`) | Small dot connector, muted bg | Session container |
| Parent (middle) | Arrow connector, muted bg, hover effect | Active parent context |
| Leaf (`isLeaf`) | Arrow connector, card bg, primary border + ring, fade-in animation | Currently executing block |

### Indentation:

Each stack level is indented by `index * 0.5rem`. A vertical connecting line runs from root to leaf using an absolute-positioned `div`.

---

## Data Flow Summary

```
Parser            JIT Compiler           Runtime Stack          UI Panel
──────            ────────────           ─────────────          ────────
WOD Script
  │
  ▼
CodeStatement ──→ Strategy.match() ──→ BlockBuilder
  (fragments,       │                     │
   children,        │                     ├── setBlockType()
   meta)            │                     ├── setLabel()
                    │                     ├── addBehavior(...)
                    │                     ├── setFragments(...)
                    │                     └── build() ──→ IRuntimeBlock
                    │                                        │
                    │                                        ▼
                    │                                   RuntimeStack.push()
                    │                                        │
                    │                                   ┌────┴─────────────────────┐
                    │                                   │ Block Memory             │
                    │                                   │ ├── timer: TimerState    │──→ useTimerElapsed()
                    │                                   │ ├── round: RoundState    │      ──→ elapsed display
                    │                                   │ ├── fragment:display     │──→ FragmentSourceRow
                    │                                   │ │   FragmentDisplayState │      ──→ fragment pills
                    │                                   │ ├── display: DisplayState│
                    │                                   │ └── completion           │
                    │                                   │     CompletionState      │
                    │                                   └──────────────────────────┘
                    │                                        │
                    │                                   RuntimeStack.pop()
                    │                                        │
                    │                                        ▼
                    │                                   IOutputStatement ──→ useOutputStatements()
                    │                                   (outputType,            ──→ interleaved
                    │                                    stackLevel,               history rows
                    │                                    elapsed,
                    │                                    sourceBlockKey)
```

---

## Key Files Reference

| Concern | File |
|---------|------|
| **Panel container** | `src/components/track/VisualStatePanel.tsx` |
| **Stack + history rendering** | `src/components/track/VisualStateComponents.tsx` |
| **Fragment row rendering** | `src/components/fragments/FragmentSourceRow.tsx` |
| **Block interface** | `src/runtime/contracts/IRuntimeBlock.ts` |
| **Memory type definitions** | `src/runtime/memory/MemoryTypes.ts` |
| **Timer elapsed hook** | `src/runtime/hooks/useTimerElapsed.ts` |
| **Output statements hook** | `src/runtime/hooks/useOutputStatements.ts` |
| **Output statement model** | `src/core/models/OutputStatement.ts` |
| **Stack data structure** | `src/runtime/RuntimeStack.ts` |
| **Strategy: SessionRoot** | `src/runtime/compiler/strategies/SessionRootStrategy.ts` |
| **Strategy: Rounds/Loop** | `src/runtime/compiler/strategies/components/GenericLoopStrategy.ts` |
| **Strategy: Timer** | `src/runtime/compiler/strategies/components/GenericTimerStrategy.ts` |
| **Strategy: Effort** | `src/runtime/compiler/strategies/fallback/EffortFallbackStrategy.ts` |
| **Strategy: Rest** | `src/runtime/compiler/strategies/components/RestBlockStrategy.ts` |
| **Strategy: AMRAP** | `src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts` |
| **Strategy: EMOM** | `src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts` |
