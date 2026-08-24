# Interfaces and Implementations

WOD Wiki is designed around small, composable seams. Most extension is "implement the interface and register it."

## `IDialect`

A dialect analyzes a `CodeStatement` and returns additional metrics/hints.

```typescript
export interface IDialect {
  id: string;
  name: string;
  analyze(statement: ICodeStatement): DialectAnalysis;
}

export interface DialectAnalysis {
  metrics?: MetricContainer | IMetric[];
}
```

Example:

```typescript
export class MyDialect implements IDialect {
  id = 'my';
  name = 'My Dialect';

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: IMetric[] = [];
    if (statement.metrics.has(MetricType.Effort)) {
      hints.push(new Metric(MetricType.Hint, 'workout.my', 'dialect'));
    }
    return { metrics: hints };
  }
}
```

Register it by adding it to the `DialectStack` used by the compiler.

## `IRuntimeBlockStrategy`

Strategies decide which behaviors a compiled block receives. They are priority-ordered and composed on a shared `BlockBuilder`.

```typescript
export interface IRuntimeBlockStrategy {
  readonly name: string;
  readonly priority: number;
  match(nodes: ICodeStatement[], runtime: IRuntimeContext): boolean;
  apply(builder: BlockBuilder, nodes: ICodeStatement[], runtime: IRuntimeContext): void;
}
```

Built-in strategies include:

| Strategy | Priority band | Responsibility |
| ---------- | -------------- | ---------------- |
| `SessionRootStrategy` | logic | Wraps the whole script in a session root block |
| `AmrapLogicStrategy` | logic | Adds AMRAP loop/exit behaviors |
| `IntervalLogicStrategy` | logic | EMOM / interval behavior |
| `GenericTimerStrategy` | component | Timer behaviors (count-up/down) |
| `GenericLoopStrategy` | component | Round/loop behaviors |
| `GenericGroupStrategy` | component | Group/lap composition |
| `EffortFallbackStrategy` | fallback | Basic effort block |
| `ChildrenStrategy` | fallback | Handles children routing |
| `ReportOutputStrategy` | enhancement | Emits output statements |
| `SoundStrategy` | enhancement | Adds sound cues |

## `IRuntimeBehavior`

A behavior is a capability attached to a runtime block.

```typescript
export interface IRuntimeBehavior {
  readonly name: string;
  mount?(block: IRuntimeBlock, context: IBehaviorContext): void;
  next?(block: IRuntimeBlock, context: IBehaviorContext): void;
  unmount?(block: IRuntimeBlock, context: IBehaviorContext): void;
  dispose?(block: IRuntimeBlock, context: IBehaviorContext): void;
  onEvent?(block: IRuntimeBlock, event: IEvent, context: IBehaviorContext): void;
}
```

Built-in behaviors:

| Behavior | Purpose |
| ---------- | --------- |
| `CountdownTimerBehavior` | Count-down timer |
| `CountupTimerBehavior` | Count-up / elapsed timer |
| `SoundCueBehavior` | Beep/cue sounds |
| `ReportOutputBehavior` | Emit `OutputStatement`s |
| `LabelingBehavior` | Compose display labels |
| `ChildSelectionBehavior` | Advance child blocks |
| `ExitBehavior` | Detect completion and pop |
| `ButtonBehavior` | Render action buttons |
| `SpanTrackingBehavior` | Record active time spans |
| `MetricPromotionBehavior` | Promote child metrics to parent |
| `CompletionTimestampBehavior` | Stamp completion time |
| `WaitingToStartInjectorBehavior` | Inject a ready/waiting gate |

## `IRealtimeProcessor` and `ISummaryProcessor`

Analytics processors derive metrics from execution output.

- `IRealtimeProcessor` runs during execution (e.g., pace, power per segment).
- `ISummaryProcessor` runs after execution (e.g., total volume, TIS, session load).

Register them on the analytics profile used by `RuntimeFactory`.

## `IStorage` and persistence

`IStorage` is the raw per-store seam:

```typescript
export interface IStorage {
  readonly<T>(store: StoreName): IReadonlyStore<T>;
  readwrite<T>(store: StoreName): IReadWriteStore<T>;
  transaction<T>(stores: StoreName[], mode: IDBTransactionMode): ITransaction;
}
```

Adapters:

- `IndexedDBStorage` — production
- `InMemoryStorage` — tests

Persistence layers (e.g., `IndexedDBNotePersistence`) compose `IStorage` into domain operations.

## Language Pack API

A **Language Pack** bundles a dialect, editor extensions, and analytics processors under one identity.

```typescript
import { defineLanguagePack, registerLanguagePack } from '@bitcobblers/wod-wiki-engine';

const pack = defineLanguagePack({
  id: 'powerlifting',
  name: 'Powerlifting Pack',
  tags: ['time', 'lift'],
  aliases: { time: ['lift'] },
  runnable: true,
  lang: {
    dialects: [new PowerliftingDialect()],
    realtimeProcessors: [new BarSpeedProcessor()],
    summaryProcessors: [new TotalVolumeProcessor()],
  },
  ui: {
    editorExtensions: [powerliftingAutocomplete()],
  },
});

registerLanguagePack(pack);
```

Packs override; they never replace the base grammar and default analytics.

## `wod` CLI

The engine CLI exposes the pipeline for scripts and tests:

```bash
# Parse a file
wod parse workout.txt

# Run a file (headless)
wod run workout.txt

# Query saved facts (stdin or file)
wod query "sum:reps{} by effort"
```

See [`05-architecture.md`](./05-architecture.md) and the engine package READMEs for more.
