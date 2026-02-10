# DistanceFragment

`DistanceFragment` represents a distance measurement with units in a workout script. It supports both explicit values and collectible placeholders.

## Type Definition

```typescript
class DistanceFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Distance;
  readonly type: string = "distance";
  readonly origin: FragmentOrigin;
  
  readonly value: { amount: number | undefined, units: string };
  readonly image: string;           // Display string (e.g., "400 m")
  readonly units: string;           // Unit string
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Distance`
- **Legacy Type**: `"distance"`
- **Origin**: `'parser'` (explicit) or `'user'` (collectible)

## Constructor

```typescript
constructor(
  value: number | undefined,    // Distance amount (undefined = collectible)
  units: string,                // Unit string ("m", "km", "mi", etc.)
  meta?: CodeMetadata           // Source location
)
```

## WOD Script Syntax

```markdown
400m Run                    # 400 meters
1.5mi Jog                   # 1.5 miles
?m Row                      # Collectible distance
5km Bike                    # 5 kilometers
```

## Analytics Integration

`DistanceFragment` values are accessed directly via `IFragmentSource`:

```typescript
const distanceFragment = block.getFragment(FragmentType.Distance);
const amount = distanceFragment?.value?.amount; // number | undefined
const units = distanceFragment?.value?.units;   // "m", "km", "mi", etc.
```

## Supported Units

| Unit | Description |
|------|-------------|
| `m` | Meters |
| `km` | Kilometers |
| `mi` | Miles |
| `ft` | Feet |
| `yd` | Yards |
| `cal` | Calories (for rowers/bikes) |

## Collectible Pattern

When amount is undefined, the fragment represents a value to be collected:

```typescript
const collectible = new DistanceFragment(undefined, 'm');

expect(collectible.value.amount).toBeUndefined();
expect(collectible.image).toBe('? m');
expect(collectible.origin).toBe('user');
```

## Usage Examples

### Explicit Distance

```typescript
const distance = new DistanceFragment(400, 'm', { line: 1, column: 1 });

expect(distance.value.amount).toBe(400);
expect(distance.value.units).toBe('m');
expect(distance.image).toBe('400 m');
expect(distance.origin).toBe('parser');
```

### Collectible Distance

```typescript
const distance = new DistanceFragment(undefined, 'm');

expect(distance.value.amount).toBeUndefined();
expect(distance.image).toBe('? m');
expect(distance.origin).toBe('user');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('400m Run');
const distance = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Distance) as DistanceFragment;

expect(distance.value.amount).toBe(400);
expect(distance.value.units).toBe('m');
```

### Preserves Unit Case

```typescript
const script = new MdTimerRuntime().read('400M Run');
const distance = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Distance) as DistanceFragment;

expect(distance.value.units).toBe('M');  // Case preserved
```

## Related

- [ResistanceFragment](ResistanceFragment.md) - Similar pattern with weight
- [RepFragment](RepFragment.md) - Alternative rep-based work
- [TimerFragment](TimerFragment.md) - Time-based alternative
