# TimerFragment

`TimerFragment` represents a duration or time value in a workout script. It parses time strings into component parts and determines timer direction.

## Type Definition

```typescript
class TimerFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Timer;
  readonly type: string = "duration";
  readonly origin: FragmentOrigin;
  
  readonly value: number | undefined;     // Duration in milliseconds
  readonly image: string;                 // Original string (e.g., "5:00")
  readonly meta: CodeMetadata;            // Source location
  
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly original: number | undefined;  // Initial duration in ms
  readonly forceCountUp: boolean;         // ^ modifier applied
  
  get direction(): 'up' | 'down';         // Computed timer direction
}
```

## Fragment Type

- **Type**: `FragmentType.Timer`
- **Legacy Type**: `"duration"`
- **Origin**: `'parser'` (from source) or `'runtime'` (collectible)

## Constructor

```typescript
constructor(
  image: string,                    // Timer string: "5:00", "1:30:00", ":?"
  meta: CodeMetadata,               // Source location
  forceCountUp: boolean = false     // ^ modifier for count-up with duration
)
```

## Timer Formats

| Format | Example | Result |
|--------|---------|--------|
| `mm:ss` | `5:00` | 5 minutes |
| `hh:mm:ss` | `1:30:00` | 1.5 hours |
| `dd:hh:mm:ss` | `1:00:00:00` | 1 day |
| `:ss` | `:30` | 30 seconds |
| `:` | `:` | 0 (count-up) |
| `:?` | `:?` | Collectible |
| `5:00^` | Parsed with `forceCountUp` | Count-up with duration |

## Direction Logic

```typescript
get direction(): 'up' | 'down' {
  if (this.forceCountUp) return 'up';        // ^ modifier
  if (this.value === undefined) return 'up'; // Collectible
  return this.value > 0 ? 'down' : 'up';     // Duration determines direction
}
```

## WOD Script Syntax

```markdown
5:00 Run                    # 5 minute countdown
: Rest                      # Count-up stopwatch
1:30:00 AMRAP               # 90 minute countdown
:? Time Trial               # Collectible timer
5:00^ Warm-up               # 5 min count-up (stops at 5:00)
```

## Compiler Integration

`TimerFragmentCompiler` converts to `MetricValue`:

```typescript
class TimerFragmentCompiler implements IFragmentCompiler {
  readonly type = 'duration';
  
  compile(fragment: TimerFragment): MetricValue[] {
    return [{
      type: MetricValueType.Time,
      value: fragment.value,
      unit: 'ms'
    }];
  }
}
```

## Runtime Behaviors

TimerFragment drives these behaviors:

- `TimerInitBehavior`: Initializes timer state from fragment
- `TimerTickBehavior`: Updates elapsed time on ticks
- `TimerCompletionBehavior`: Detects timer completion
- `TimerOutputBehavior`: Emits timer-related outputs

## Validation

The constructor validates timer components:

```typescript
// Negative values not allowed
new TimerFragment("-5:00", meta);  // throws Error

// Seconds/minutes must be < 60 when other components present
new TimerFragment("5:99", meta);   // throws Error (if minutes > 0)
new TimerFragment("99", meta);     // valid (99 seconds only)
```

## Usage Examples

### Standard Countdown

```typescript
const timer = new TimerFragment("5:00", { line: 1, column: 1 });

expect(timer.value).toBe(300000);      // 5 min in ms
expect(timer.direction).toBe('down');
expect(timer.minutes).toBe(5);
expect(timer.seconds).toBe(0);
```

### Stopwatch (Count-up)

```typescript
const timer = new TimerFragment(":", { line: 1, column: 1 });

expect(timer.value).toBe(0);
expect(timer.direction).toBe('up');
```

### Collectible Timer

```typescript
const timer = new TimerFragment(":?", { line: 1, column: 1 });

expect(timer.value).toBeUndefined();
expect(timer.direction).toBe('up');
expect(timer.origin).toBe('runtime');
```

## Related

- [TimerState Memory](../memory/TimerState.md) - Runtime timer state
- [RepFragment](RepFragment.md) - For-time rep counting
- [RoundsFragment](RoundsFragment.md) - EMOM/interval rounds
