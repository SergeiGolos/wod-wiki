# Processor Registry: Avoiding the "God Class"

To avoid creating a single monolithic engine that handles every sport and modality, we use a **Registry of Stateless Processors** (ECS-style).

## 1. The Fragment Processor

A `FragmentProcessor` (also called a "System" or "Handler") is a small, specialized unit of logic that only acts on specific fragments.

```typescript
interface IFragmentProcessor {
    // Only runs if these fragment types are present in the block's Plan.
    requiredFragments: FragmentType[];

    // Runs on every Tick (timer updates, etc.)
    onTick(block: IRuntimeBlock, fragments: ICodeFragment[], context: IContext): void;

    // Runs on every Next (round advance, etc.)
    onNext(block: IRuntimeBlock, fragments: ICodeFragment[], context: IContext): void;
}
```

## 2. Examples of Decoupled Processors

- **`TimerProcessor`**: Looks for `DurationFragment` and updates `SpansFragment`.
- **`RoundProcessor`**: Looks for `RoundsFragment` and updates `CurrentRoundFragment`.
- **`PoseProcessor` (Yoga)**: Looks for `PoseFragment` and handles hold-time logic.
- **`ScoreProcessor`**: Watches `RepFragments` and updates `TotalRepsFragment`.

## 3. How Dialects Assemble the Engine

The **Dialect** acts as the "Glue." It specifies which processors should be active for a given script.

```typescript
// Dialect Configuration
class CrossfitDialect {
    processors = [
        new TimerProcessor(),
        new RoundProcessor(),
        new RestInjectionProcessor()
    ];
}

class YogaDialect {
    processors = [
        new PoseProcessor(),
        new TransitionProcessor(),
        new BreathProcessor()
    ];
}
```

## 4. Why This Works

- **Decoupled**: `TimerProcessor` doesn't know about `PoseProcessor`.
- **Testable**: You can test the `RoundProcessor` in isolation with a mock block.
- **Highly Re-usable**: A `TimerProcessor` can be used by CrossFit (AMRAP), Yoga (Holds), or a Running app (Intervals). You write the logic **once**.
- **Fewer Lines of Code**: We eliminate the "middle-man" of Behavior classes and Strategy overhead.
- **No God Class**: The `Runtime` just loops through the active processors and calls them.

## 5. Processor Scope Clarification

> **Important**: Processors handle **cross-cutting concerns** that apply to any block type. They do NOT replace the core execution logic (completion policy, child dispatch, timer lifecycle) — that responsibility belongs to **Typed Block** subclasses. See [07-approach-comparison.md](07-approach-comparison.md) for the hybrid architecture.

### Cross-Cutting Processors (Run Against Any Block Type)

| Processor | Replaces | Purpose |
| :--- | :--- | :--- |
| `AnalyticsProjector` | `ReportOutputBehavior` | Projects fragment bucket → OutputStatements at push/pop/change |
| `HistoryProcessor` | `HistoryRecordBehavior` | Emits history records on block pop |
| `SoundProcessor` | `SoundCueBehavior` | Emits sound fragments at lifecycle points |
| `DisplayProcessor` | `LabelingBehavior` | Writes display/label fragments from plan + block type |
| `ControlsProcessor` | `ButtonBehavior` | Writes action button fragments from block type |

### NOT Processors (Owned by Typed Blocks)

| Concern | Why Not a Processor | Owner |
| :--- | :--- | :--- |
| Timer state (spans, pause/resume) | Tightly coupled to block lifecycle | `TimerMixin` on typed blocks |
| Completion policy | Different per archetype | Each typed block subclass |
| Child dispatch | Cursor-based, loop-conditional | `ContainerBlock` base class |
| Round tracking | Bound to completion + child dispatch | `ContainerBlock` constructor |

## The Execution Loop

```typescript
for (const processor of dialect.processors) {
    const relevantFragments = block.getFragments(processor.requiredFragments);
    if (relevantFragments.length > 0) {
        processor.onTick(block, relevantFragments, context);
    }
}
```
