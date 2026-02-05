# IOutputStatement

> Runtime-generated output representing execution results

## Definition

```typescript
interface IOutputStatement extends ICodeStatement {
    /** The type of output this statement represents */
    readonly outputType: OutputStatementType;
    
    /** Execution timing — when this output occurred */
    readonly timeSpan: TimeSpan;
    
    /** The source statement ID that triggered this output */
    readonly sourceStatementId?: number;
    
    /** The block key that produced this output */
    readonly sourceBlockKey: string;
    
    /** Stack level (depth) when emitted. 0 = root, 1 = first child */
    readonly stackLevel: number;
    
    /** Runtime-generated fragments with origin: 'runtime' | 'user' */
    readonly fragments: ICodeFragment[];
}
```

## Output Types

```typescript
type OutputStatementType = 'segment' | 'completion' | 'milestone' | 'label' | 'metric';
```

| Type | Purpose | Example |
|------|---------|---------|
| `segment` | Timed portion of execution | Round started, effort interval |
| `completion` | Block finished executing | Timer complete, rounds exhausted |
| `milestone` | Notable event during execution | Halfway point, sound cue, personal record |
| `label` | Display-only output | "Rest" indicator, phase marker |
| `metric` | Recorded statistic | Total reps, average pace |

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
}
```

### Example Usage

```typescript
class TimerOutputBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit segment started
        ctx.emitOutput('segment', [
            { fragmentType: FragmentType.Timer, value: timer.durationMs, origin: 'runtime' }
        ], { label: 'Timer Started' });
        return [];
    }
    
    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit completion with elapsed time
        ctx.emitOutput('completion', [
            { fragmentType: FragmentType.Timer, value: elapsed, origin: 'runtime' }
        ], { label: `Completed: ${formatTime(elapsed)}` });
        return [];
    }
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

```typescript
// Runtime-generated elapsed time
{
    fragmentType: FragmentType.Timer,
    value: 45000,
    origin: 'runtime',
    image: '0:45'
}

// User-recorded actual reps
{
    fragmentType: FragmentType.Rep,
    value: 12,
    origin: 'user',
    image: '12'
}
```

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
- [[../layers/03-runtime-layer|Runtime Layer]] - Output producer

## Source Files

- `src/core/models/OutputStatement.ts`
- `src/runtime/contracts/IBehaviorContext.ts` (emitOutput)
