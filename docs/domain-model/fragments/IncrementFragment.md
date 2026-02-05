# IncrementFragment

`IncrementFragment` represents an ascending or descending direction marker in a workout script. It indicates whether rep counts should increase or decrease across sets.

## Type Definition

```typescript
class IncrementFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Increment;
  readonly type: string = "increment";
  readonly origin: FragmentOrigin = 'parser';
  
  readonly value: number;           // +1 (ascending) or -1 (descending)
  readonly increment: number;       // Alias for value
  readonly image: string;           // Original marker ("^" or "v")
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Increment`
- **Legacy Type**: `"increment"`
- **Origin**: Always `'parser'`

## Constructor

```typescript
constructor(
  image: string,            // "^" for ascending, anything else for descending
  meta?: CodeMetadata       // Source location
)
```

## WOD Script Syntax

```markdown
^ 10 Push-ups               # Ascending: 1, 2, 3... to 10
v 10 Burpees                # Descending: 10, 9, 8... to 1
21-15-9 Thrusters           # Implicit descending scheme
```

## Direction Logic

```typescript
constructor(image: string, meta?: CodeMetadata) {
  this.increment = image === "^" ? 1 : -1;
  this.value = this.increment;
}
```

| Image | Increment | Meaning |
|-------|-----------|---------|
| `^` | `+1` | Ascending (1→2→3...) |
| `v` | `-1` | Descending (10→9→8...) |

## Compiler Integration

`IncrementFragmentCompiler` is a pass-through (no metrics):

```typescript
class IncrementFragmentCompiler implements IFragmentCompiler {
  readonly type = 'increment';
  
  compile(_fragment: IncrementFragment): MetricValue[] {
    return [];  // No metric output
  }
}
```

Increment fragments affect block behavior rather than producing metrics.

## Usage Examples

### Ascending Ladder

```typescript
const increment = new IncrementFragment('^', { line: 1, column: 1 });

expect(increment.value).toBe(1);
expect(increment.increment).toBe(1);
expect(increment.image).toBe('^');
```

### Descending Ladder

```typescript
const increment = new IncrementFragment('v', { line: 1, column: 1 });

expect(increment.value).toBe(-1);
expect(increment.increment).toBe(-1);
expect(increment.image).toBe('v');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('^ 10 Push-ups');
const increment = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Increment) as IncrementFragment;

expect(increment.increment).toBe(1);
```

## Common Patterns

### Death by... (Ascending EMOM)

```markdown
[:EMOM 10:00]
  ^ 1 Burpee
```

Executes 1 burpee minute 1, 2 burpees minute 2, etc.

### Ladder Down

```markdown
v 10 Pull-ups
```

Executes 10, 9, 8, 7... down to 1.

## Related

- [RepFragment](RepFragment.md) - Base rep count to increment
- [RoundsFragment](RoundsFragment.md) - Rounds structure
- [GroupFragment](GroupFragment.md) - Grouping control
