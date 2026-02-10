# RepFragment

`RepFragment` represents a repetition count in a workout script. It supports both explicit counts and collectible placeholders for runtime input.

## Type Definition

```typescript
class RepFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Rep;
  readonly type: string = "rep";
  readonly origin: FragmentOrigin;
  
  readonly value?: number;    // Rep count (undefined for collectible)
  readonly image: string;     // Display string
  readonly reps?: number;     // Alias for value
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Rep`
- **Legacy Type**: `"rep"`
- **Origin**: `'parser'` (explicit count) or `'user'` (collectible)

## Constructor

```typescript
constructor(
  reps?: number,              // Rep count (undefined = collectible)
  meta?: CodeMetadata         // Source location
)
```

## Validation

```typescript
// Negative values not allowed
new RepFragment(-5);  // throws Error

// Must be integer
new RepFragment(10.5);  // throws Error

// Undefined creates collectible
new RepFragment(undefined);  // origin: 'user'
```

## WOD Script Syntax

```markdown
10 Push-ups              # Explicit: 10 reps
? Burpees                # Collectible: ask user
21-15-9 Thrusters        # Rep scheme (parsed as multiple RepFragments)
```

## Analytics Integration

`RepFragment` values are accessed directly via `IFragmentSource`:

```typescript
const repFragment = block.getFragment(FragmentType.Rep);
const count = repFragment?.value; // number | undefined
```

## Collectible Pattern

When `reps` is undefined, the fragment represents a value to be collected at runtime:

```typescript
const collectible = new RepFragment(undefined);

expect(collectible.value).toBeUndefined();
expect(collectible.image).toBe('?');
expect(collectible.origin).toBe('user');
```

The runtime can later update this with the actual value through the memory system.

## Usage Examples

### Explicit Rep Count

```typescript
const reps = new RepFragment(10, { line: 1, column: 1 });

expect(reps.value).toBe(10);
expect(reps.image).toBe('10');
expect(reps.origin).toBe('parser');
```

### Collectible Reps

```typescript
const reps = new RepFragment(undefined);

expect(reps.value).toBeUndefined();
expect(reps.image).toBe('?');
expect(reps.origin).toBe('user');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('10 Push-ups');
const repFragment = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Rep);

expect(repFragment.value).toBe(10);
```

## Related

- [RoundsFragment](RoundsFragment.md) - Round counting
- [IncrementFragment](IncrementFragment.md) - Ascending/descending rep schemes
- [ActionFragment](ActionFragment.md) - Movement paired with reps
