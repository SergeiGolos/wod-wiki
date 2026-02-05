# RoundsFragment

`RoundsFragment` represents a round count for interval-based workout structures like EMOM, Tabata, or multi-round WODs.

## Type Definition

```typescript
class RoundsFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Rounds;
  readonly type: string = "rounds";
  readonly origin: FragmentOrigin = 'parser';
  
  readonly value: number | string;    // Round count or mode string
  readonly image: string;             // Display string
  readonly count: number | string;    // Alias for value
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Rounds`
- **Legacy Type**: `"rounds"`
- **Origin**: Always `'parser'`

## Constructor

```typescript
constructor(
  count: number | string,     // Round count or mode (e.g., "AMRAP")
  meta?: CodeMetadata         // Source location
)
```

## WOD Script Syntax

```markdown
5x [1:00]                    # 5 rounds of 1-minute intervals
[:5:00 AMRAP]                # AMRAP mode (string value)
  10 Push-ups
3 Rounds                     # 3 rounds explicit
```

## Compiler Integration

`RoundsFragmentCompiler` converts to `MetricValue`:

```typescript
class RoundsFragmentCompiler implements IFragmentCompiler {
  readonly type = 'rounds';
  
  compile(fragment: RoundsFragment): MetricValue[] {
    if (typeof fragment.value === 'string') {
      return [{
        type: MetricValueType.Rounds,
        value: undefined,
        unit: fragment.value  // "AMRAP", "EMOM", etc.
      }];
    }
    return [{
      type: MetricValueType.Rounds,
      value: fragment.value,
      unit: ''
    }];
  }
}
```

## Runtime Behaviors

RoundsFragment drives these behaviors:

- `RoundInitBehavior`: Initializes round counter
- `RoundAdvanceBehavior`: Advances to next round
- `RoundOutputBehavior`: Emits round progress outputs

## Output Integration

`RoundOutputBehavior` emits fragments for round progress:

```typescript
ctx.emitOutput('milestone', [{
  type: 'count',
  fragmentType: FragmentType.Rounds,
  value: round.current,
  image: `Round ${round.current} of ${round.total}`,
  origin: 'runtime'
}]);
```

## Usage Examples

### Numeric Rounds

```typescript
const rounds = new RoundsFragment(5, { line: 1, column: 1 });

expect(rounds.value).toBe(5);
expect(rounds.image).toBe('5');
expect(typeof rounds.value).toBe('number');
```

### String Mode

```typescript
const amrap = new RoundsFragment('AMRAP', { line: 1, column: 1 });

expect(amrap.value).toBe('AMRAP');
expect(typeof amrap.value).toBe('string');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('5x [1:00]');
const roundsFragment = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Rounds);

expect(roundsFragment.value).toBe(5);
```

## Related

- [RoundState Memory](../memory/RoundState.md) - Runtime round state
- [TimerFragment](TimerFragment.md) - Interval duration
- [GroupFragment](GroupFragment.md) - Round/compose grouping
