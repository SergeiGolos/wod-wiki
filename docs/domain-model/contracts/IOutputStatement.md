# IOutputStatement

> Runtime-generated output representing execution results

## Definition

```typescript
interface IOutputStatement extends ICodeStatement {
    /** The type of output this statement represents */
    readonly outputType: OutputStatementType;
    
    /** Execution timing — when this output occurred */
    readonly timeSpan: TimeSpan;
    
    /** @deprecated Access via getFragment(FragmentType.Spans) instead */
    readonly spans: ReadonlyArray<TimeSpan>;
    
    /** @deprecated Access via getFragment(FragmentType.Elapsed)?.value instead */
    readonly elapsed: number;
    
    /** @deprecated Access via getFragment(FragmentType.Total)?.value instead */
    readonly total: number;
    
    /** The source statement ID that triggered this output */
    readonly sourceStatementId?: number;
    
    /** The block key that produced this output */
    readonly sourceBlockKey: string;
    
    /** Stack level (depth) when emitted. 0 = root, 1 = first child */
    readonly stackLevel: number;
    
    /** Runtime-generated fragments with origin: 'runtime' | 'user' */
    readonly fragments: ICodeFragment[];
    
    /** Per-fragment source locations */
    readonly fragmentMeta: Map<ICodeFragment, CodeMetadata>;
    
    /** Reason the block completed (propagated from block.completionReason) */
    readonly completionReason?: string;
}
```

## Output Types

```typescript
type OutputStatementType = 
    | 'segment'    // Timed portion of execution (round, effort interval)
    | 'milestone'  // Notable event (halfway, sound cue, personal record)
    | 'system'     // Debug/diagnostic output from lifecycle events
    | 'event'      // External stimuli or internal trigger tracking
    | 'group'      // Identified segment with children
    | 'load'       // Initial script state
    | 'compiler'   // Behavior configuration and setup
    | 'analytics'; // Output from the analytics engine
```

| Type | Purpose | Example |
|------|---------|---------|
| `segment` | Timed portion of execution | Round started, effort interval |
| `milestone` | Notable event during execution | Halfway point, sound cue |
| `system` | Debug/diagnostic lifecycle events | Push, pop, next, event-action |
| `event` | External or internal trigger tracking | User click, timer event |
| `group` | Identified segment with children | EMOM group, superset |
| `load` | Initial script state | Script loaded/compiled |
| `compiler` | Behavior configuration/setup | Block builder output |
| `analytics` | Analytics engine output | Aggregated metrics |

## Design Principle

**Outputs are for reporting/recording.** They are the "return value" of execution:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ICodeStatement (Input)                                             │
│  "What was parsed"                                                  │
│  - Source text                                                      │
│  - Parsed fragments                                                 │
│  - Structure                                                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼ Execution
                                
┌─────────────────────────────────────────────────────────────────────┐
│  IOutputStatement (Output)                                          │
│  "What was executed"                                                │
│  - Execution timing (TimeSpan)                                      │
│  - Runtime fragments                                                │
│  - Type classification                                              │
│  - Source linkage                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Emitting Outputs

Behaviors emit outputs through `IBehaviorContext.emitOutput()`:

```typescript
interface IBehaviorContext {
    emitOutput(
        type: OutputStatementType,
        fragments: ICodeFragment[],
        options?: OutputOptions
    ): void;
}

interface OutputOptions {
    label?: string;
    completionReason?: string;
}
```

### Example Usage

```typescript
class ReportOutputBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit segment started
        ctx.emitOutput('segment', [
            { fragmentType: FragmentType.Duration, value: timer.durationMs, origin: 'runtime', type: 'duration' }
        ], { label: 'Timer Started' });
        return [];
    }
    
    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit segment with completion context
        ctx.emitOutput('segment', [
            { fragmentType: FragmentType.Duration, value: elapsed, origin: 'runtime', type: 'duration' }
        ], { label: `Completed`, completionReason: ctx.block.completionReason });
        return [];
    }
    
    onNext(ctx: IBehaviorContext): IRuntimeAction[] { return []; }
    onDispose(ctx: IBehaviorContext): void {}
}
```

## Output vs Event

| Aspect | Output | Event |
|--------|--------|-------|
| **Purpose** | Recording/reporting | Coordination/input |
| **Source** | Internal behaviors | External systems |
| **Persistence** | Stored in history | Fire-and-forget |
| **Direction** | Behavior → History | External → Behavior |

### When to Use Outputs

✅ **Recording execution results:**
```typescript
ctx.emitOutput('completion', fragments, { label: 'Timer Complete' });
```

✅ **Sound cues (for audio system to observe):**
```typescript
ctx.emitOutput('milestone', [new SoundFragment('beep', 'countdown')]);
```

✅ **Round milestones:**
```typescript
ctx.emitOutput('milestone', [roundFragment], { label: 'Round 3 of 5' });
```

### When NOT to Use Outputs

❌ **Coordination between components** — use memory instead
❌ **UI state updates** — use memory subscriptions
❌ **Triggering other behaviors** — use markComplete or memory

## Fragment Origins

Fragments in outputs should have appropriate origins:

| Origin | Meaning |
|--------|---------|
| `runtime` | Generated during execution (elapsed time, computed values) |
| `user` | Collected from user input (actual reps completed) |
| `execution` | Generated during the execution pipeline |

```typescript
// Runtime-generated elapsed time
{
    fragmentType: FragmentType.Duration,
    value: 45000,
    origin: 'runtime',
    type: 'duration',
    image: '0:45'
}

// User-recorded actual reps
{
    fragmentType: FragmentType.Rep,
    value: 12,
    origin: 'user',
    type: 'rep',
    image: '12'
}
```

## Time Data in Outputs

Output statements carry time data primarily through fragments:

| Fragment Type | Purpose |
|---------------|---------|
| `FragmentType.Spans` | Raw TimeSpan[] recordings (source of truth) |
| `FragmentType.Duration` | Planned target from parser |
| `FragmentType.Elapsed` | @deprecated — Σ(end − start) of active segments |
| `FragmentType.Total` | @deprecated — lastEnd − firstStart |
| `FragmentType.SystemTime` | System Date.now() when logged |

The direct properties `spans`, `elapsed`, `total` on `IOutputStatement` are **deprecated proxies**.
Prefer `getFragment(FragmentType.Elapsed)` etc., or use `getDisplayFragments()` for UI rendering.

## Output Collection

Outputs are collected by the runtime and made available for:

1. **History tracking** — workout history records
2. **UI display** — execution timeline
3. **Analytics** — performance analysis
4. **Audio systems** — sound cue playback (via SoundFragment)

```typescript
// Subscribing to outputs
runtime.outputs$.subscribe(output => {
    if (output.outputType === 'milestone') {
        const sounds = output.fragments.filter(f => f.fragmentType === FragmentType.Sound);
        sounds.forEach(s => audioPlayer.play(s.value.sound));
    }
});
```

## TimeSpan

Every output includes execution timing:

```typescript
class TimeSpan {
    readonly started: number;    // Epoch ms
    readonly ended?: number;     // Epoch ms (undefined if still running)
    
    get duration(): number;      // ended - started
    get isOpen(): boolean;       // ended === undefined
}
```

## Related Interfaces

- [[ICodeStatement]] - Base interface (input)
- [[ICodeFragment]] - Fragment interface
- [[IEvent]] - For external input (not recording)
- [[03-runtime-layer|Runtime Layer]] - Output producer

## Source Files

- `src/core/models/OutputStatement.ts`
- `src/runtime/contracts/IBehaviorContext.ts` (emitOutput)
