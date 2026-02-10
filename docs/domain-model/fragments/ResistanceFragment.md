# ResistanceFragment

`ResistanceFragment` represents a weight or resistance measurement with units in a workout script. It supports both explicit values and collectible placeholders.

## Type Definition

```typescript
class ResistanceFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Resistance;
  readonly type: string = "resistance";
  readonly origin: FragmentOrigin;
  
  readonly value: { amount: number | undefined, units: string };
  readonly image: string;           // Display string (e.g., "135 #")
  readonly units: string;           // Unit string
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Resistance`
- **Legacy Type**: `"resistance"`
- **Origin**: `'parser'` (explicit) or `'user'` (collectible)

## Constructor

```typescript
constructor(
  value: number | undefined,    // Weight amount (undefined = collectible)
  units: string,                // Unit string ("#", "kg", "lb", etc.)
  meta?: CodeMetadata           // Source location
)
```

## WOD Script Syntax

```markdown
135# Deadlift               # 135 pounds
60kg Squat                  # 60 kilograms
?# Bench Press              # Collectible weight
2pood Kettlebell            # 2 pood (kettlebell unit)
```

## Analytics Integration

`ResistanceFragment` values are accessed directly via `IFragmentSource`:

```typescript
const resistanceFragment = block.getFragment(FragmentType.Resistance);
const amount = resistanceFragment?.value?.amount; // number | undefined
const units = resistanceFragment?.value?.units;   // "#", "kg", "lb", etc.
```

## Supported Units

| Unit | Description |
|------|-------------|
| `#` | Pounds (lb) |
| `lb` | Pounds |
| `kg` | Kilograms |
| `pood` | Kettlebell unit (~16kg) |
| `%` | Percentage of 1RM |

## Collectible Pattern

When amount is undefined, the fragment represents a value to be collected:

```typescript
const collectible = new ResistanceFragment(undefined, '#');

expect(collectible.value.amount).toBeUndefined();
expect(collectible.image).toBe('? #');
expect(collectible.origin).toBe('user');
```

## Usage Examples

### Explicit Weight

```typescript
const resistance = new ResistanceFragment(135, '#', { line: 1, column: 1 });

expect(resistance.value.amount).toBe(135);
expect(resistance.value.units).toBe('#');
expect(resistance.image).toBe('135 #');
expect(resistance.origin).toBe('parser');
```

### Collectible Weight

```typescript
const resistance = new ResistanceFragment(undefined, '#');

expect(resistance.value.amount).toBeUndefined();
expect(resistance.image).toBe('? #');
expect(resistance.origin).toBe('user');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('135# Deadlift');
const resistance = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Resistance) as ResistanceFragment;

expect(resistance.value.amount).toBe(135);
expect(resistance.value.units).toBe('#');
```

## Related

- [DistanceFragment](DistanceFragment.md) - Similar pattern with distance
- [RepFragment](RepFragment.md) - Reps at given weight
- [ActionFragment](ActionFragment.md) - Movement paired with resistance
