# Phase 6 — Report Output Aspect

## Goal

Merge `SegmentOutputBehavior` + `TimerOutputBehavior` + `RoundOutputBehavior` into a single `ReportOutputBehavior` that emits all output records on lifecycle boundaries.

Keep `HistoryRecordBehavior` and `SoundCueBehavior` as-is — they are separate, well-defined concerns.

## Duration: ~2 hours

## Rationale

`SegmentOutputBehavior` (mount: segment, unmount: completion) and `TimerOutputBehavior` (unmount: timer results) were two halves of "describe what this block did." `RoundOutputBehavior` (mount/next: milestone) adds round state to the output stream. Merging these into one behavior gives a single point of control for all output records and eliminates scattered fragment computation.

## Current State

| Behavior | Hook | Output Type | What It Does |
|----------|------|-------------|--------------|
| `SegmentOutputBehavior` | `onMount`, `onUnmount` | `segment`, `completion` | Mount: emits segment with display + state fragments. Unmount: computes elapsed/spans, writes `fragment:result`, emits completion. |
| `TimerOutputBehavior` | `onUnmount` | *(via emitOutput)* | Unmount: reads timer memory, computes elapsed from spans. Emits output with timer fragments. |
| `RoundOutputBehavior` | `onMount`, `onNext` | `milestone` | Mount/Next: emits round milestone with CurrentRoundFragment + optional timer fragments. Deduplicates via `ChildRunnerBehavior` check. |

## New Behavior: `ReportOutputBehavior`

### File: `src/runtime/behaviors/ReportOutputBehavior.ts`

### Config
```typescript
export interface ReportOutputConfig {
  /** Custom label for segments (falls back to block.label) */
  label?: string;
  /** Emit segment output on mount — default: true */
  emitSegmentOnMount?: boolean;
  /** Emit milestones on mount/next for round state — default: true if round memory exists */
  emitMilestones?: boolean;
  /** Compute timer results on unmount — default: true if timer memory exists */
  computeTimerResults?: boolean;
}
```

### Lifecycle

| Hook | Implementation |
|------|---------------|
| `onMount` | 1. Collect display fragments from `fragment:display` memory. 2. Collect state fragments from `round` and `timer` memory. 3. Emit `segment` output (block identity). 4. If round state exists and multi-round → emit `milestone` output. |
| `onNext` | 1. If round state exists → read `children:status`. 2. If `allCompleted` (or no children) → emit `milestone` output with round + timer fragments. |
| `onUnmount` | 1. Read timer memory → compute elapsed from spans. 2. Create `ElapsedFragment`, `TotalFragment`, `SpansFragment`. 3. Write results to `fragment:result` memory. 4. Emit `completion` output with all result fragments. |
| `onDispose` | No-op |

### Memory Contract
- **Reads:** `fragment:display`, `round`, `timer`, `children:status`
- **Writes:** `fragment:result` tag (on unmount)
- **Outputs emitted:** `segment` (mount), `milestone` (mount/next), `completion` (unmount)

### Key Architectural Change: Decoupling

**Before (`RoundOutputBehavior`):**
```typescript
const childRunner = block.getBehavior(ChildRunnerBehavior);
if (childRunner && !childRunner.allChildrenCompleted) return [];
```

**After (`ReportOutputBehavior`):**
```typescript
const childStatus = ctx.getMemory('children:status') as ChildrenStatusState | undefined;
if (childStatus && !childStatus.allCompleted) return [];
```

## Tasks

### 6.1 Create `ReportOutputBehavior`

**File:** `src/runtime/behaviors/ReportOutputBehavior.ts`

Merge output logic from all three behaviors. Key methods:
- `collectDisplayFragments(ctx)` — from `fragment:display` memory
- `collectStateFragments(ctx)` — from `round` and `timer` memory
- `buildMilestoneFragments(ctx)` — CurrentRoundFragment + timer elapsed
- `computeTimerResults(ctx)` — elapsed/spans from timer spans (ported from `TimerOutputBehavior`)
- `formatLabel(ctx)` — block label or config override

### 6.2 Create `ReportOutputBehavior.test.ts`

Test cases (port from existing tests + consolidate):

**Segment output (mount):**
- Emits segment output on mount with display fragments
- Uses custom label when provided
- Falls back to block label
- Includes round fragments in segment
- Includes timer fragments in segment
- Merges display and runtime state fragments
- Deduplicates overlapping fragmentTypes

**Milestone output (mount/next):**
- Emits milestone on mount for multi-round blocks
- Skips milestone for single-round blocks
- Emits milestone on next when children:status.allCompleted
- Does NOT emit milestone when children still in progress
- Includes timer state in milestones (timer resets, cumulative elapsed)
- Handles unbounded rounds

**Completion output (unmount):**
- Computes elapsed from timer spans
- Creates ElapsedFragment, TotalFragment, SpansFragment
- Writes results to fragment:result memory
- Emits completion output
- Handles non-timer blocks (degenerate spans)
- Handles pause-aware elapsed

### 6.3 Update Strategies

Replace old output behaviors in strategy wiring:

- `GenericTimerStrategy.ts` — `SegmentOutputBehavior` → `ReportOutputBehavior`
- `GenericLoopStrategy.ts` — `SegmentOutputBehavior` + `RoundOutputBehavior` → `ReportOutputBehavior`
- `AmrapLogicStrategy.ts` — `SegmentOutputBehavior` + `RoundOutputBehavior` → `ReportOutputBehavior`
- `IntervalLogicStrategy.ts` — `SegmentOutputBehavior` + `RoundOutputBehavior` → `ReportOutputBehavior`
- `EffortFallbackStrategy.ts` — `SegmentOutputBehavior` → `ReportOutputBehavior`

Note: `TimerOutputBehavior` may only be added by specific strategies — check each.

### 6.4 Update `behaviors/index.ts`

- Add: `ReportOutputBehavior`
- Remove: `SegmentOutputBehavior`, `TimerOutputBehavior`, `RoundOutputBehavior`

### 6.5 Delete Old Behaviors

- `src/runtime/behaviors/SegmentOutputBehavior.ts`
- `src/runtime/behaviors/TimerOutputBehavior.ts`
- `src/runtime/behaviors/RoundOutputBehavior.ts`

### 6.6 Update Existing Tests

Heavy test update:
- `src/runtime/behaviors/__tests__/SegmentOutputBehavior.test.ts` → port to `ReportOutputBehavior.test.ts`
- `src/runtime/behaviors/__tests__/RoundOutputBehavior.test.ts` → port to `ReportOutputBehavior.test.ts`
- All integration tests that check for `segment`, `milestone`, `completion` outputs

### 6.7 Validate

```bash
bun run test
bun x tsc --noEmit
```

## Dependencies

- **Requires:** Phase 1 (TimerBehavior for timer memory), Phase 2 (ReEntryBehavior for round memory)
- **Required by:** None

## Risk: Medium

Three behaviors merged, but they have clear responsibilities. The main challenge is ensuring output ordering and content matches existing behavior exactly. Integration tests are the primary validation — if outputs change shape, downstream consumers (UI, analytics) will break.

### Mitigation

1. Port tests first — existing output assertions define the contract
2. Run `AnalyticsTransformer` and `ResultsTable` tests to verify downstream compatibility
3. Compare output shapes before/after using Storybook runtime stories
