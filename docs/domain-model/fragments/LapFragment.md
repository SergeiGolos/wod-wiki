# LapFragment

`LapFragment` represents a grouping marker that controls how statements are organized into rounds or composed segments.

## Type Definition

```typescript
import { GroupType } from "../../../parser/timer.visitor";

class LapFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Lap;
  readonly type: string = "lap";
  readonly origin: FragmentOrigin = 'parser';
  
  readonly value: GroupType;          // 'compose' or 'round'
  readonly group: GroupType;          // Alias for value
  readonly image: string;             // Original marker
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Lap`
- **Legacy Type**: `"lap"`
- **Origin**: Always `'parser'`

## Constructor

```typescript
constructor(
  group: GroupType,         // 'compose' or 'round'
  image: string,            // "+" or "-"
  meta?: CodeMetadata       // Source location
)
```

## GroupType Values

```typescript
type GroupType = 'compose' | 'round';
```

| Marker | GroupType | Purpose |
|--------|-----------|---------|
| `+` | `compose` | Combine statements into single segment |
| `-` | `round` | Mark as separate round/lap |

## WOD Script Syntax

```markdown
+ 5:00 Run                  # Compose with next statement
+ 20 Push-ups               # Combined into one block

- 1:00 Rest                 # Separate round marker
- 400m Sprint               # New round/lap
```

## Compiler Integration

`LapFragmentCompiler` is a pass-through (affects structure only):

```typescript
class LapFragmentCompiler implements IFragmentCompiler {
  readonly type = 'lap';
  
  compile(_fragment: LapFragment): MetricValue[] {
    return [];  // No metric output
  }
}
```

Lap fragments control block structure rather than producing metrics.

## Usage Examples

### Compose Marker

```typescript
const lap = new LapFragment('compose', '+', { line: 1, column: 1 });

expect(lap.group).toBe('compose');
expect(lap.value).toBe('compose');
expect(lap.image).toBe('+');
```

### Round Marker

```typescript
const lap = new LapFragment('round', '-', { line: 1, column: 1 });

expect(lap.group).toBe('round');
expect(lap.value).toBe('round');
expect(lap.image).toBe('-');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('+ 5:00 Run');
const lap = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Lap) as LapFragment;

expect(lap.group).toBe('compose');
```

## Grouping Patterns

### Compose (Super-set)

```markdown
+ 10 Push-ups
+ 10 Sit-ups
+ 10 Squats
```

These three movements compose into a single block executed together.

### Round Laps

```markdown
- 400m Run
- 20 Burpees
- 400m Run
```

Each line is a separate lap/round with timing recorded.

## Related

- [RoundsFragment](RoundsFragment.md) - Round count
- [IncrementFragment](IncrementFragment.md) - Direction control
- [TimerFragment](TimerFragment.md) - Lap timing
