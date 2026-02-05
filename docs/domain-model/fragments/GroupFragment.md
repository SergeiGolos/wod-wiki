# GroupFragment

`GroupFragment` represents a grouping marker that controls how statements are organized into rounds or composed segments.

## Type Definition

```typescript
import { GroupType } from "../../../parser/timer.visitor";

class GroupFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Group;
  readonly type: string = "group";
  readonly origin: FragmentOrigin = 'parser';
  
  readonly value: GroupType;          // 'compose' or 'round'
  readonly group: GroupType;          // Alias for value
  readonly image: string;             // Original marker
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Group`
- **Legacy Type**: `"group"`
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

`GroupFragmentCompiler` is a pass-through (affects structure only):

```typescript
class GroupFragmentCompiler implements IFragmentCompiler {
  readonly type = 'group';
  
  compile(_fragment: GroupFragment): MetricValue[] {
    return [];  // No metric output
  }
}
```

Group fragments control block structure rather than producing metrics.

## Usage Examples

### Compose Marker

```typescript
const group = new GroupFragment('compose', '+', { line: 1, column: 1 });

expect(group.group).toBe('compose');
expect(group.value).toBe('compose');
expect(group.image).toBe('+');
```

### Round Marker

```typescript
const group = new GroupFragment('round', '-', { line: 1, column: 1 });

expect(group.group).toBe('round');
expect(group.value).toBe('round');
expect(group.image).toBe('-');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('+ 5:00 Run');
const group = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Group) as GroupFragment;

expect(group.group).toBe('compose');
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
