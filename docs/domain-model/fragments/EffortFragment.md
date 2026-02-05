# EffortFragment

`EffortFragment` represents an effort level or intensity zone in a workout script. It captures subjective intensity descriptors like "easy", "hard", or "very hard".

## Type Definition

```typescript
class EffortFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Effort;
  readonly type: string = "effort";
  readonly origin: FragmentOrigin = 'parser';
  
  readonly value: string;         // Effort level string
  readonly image: string;         // Display string (same as value)
  readonly effort: string;        // Alias for value
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Effort`
- **Legacy Type**: `"effort"`
- **Origin**: Always `'parser'`

## Constructor

```typescript
constructor(
  effort: string,           // Effort level descriptor
  meta?: CodeMetadata       // Source location
)
```

## WOD Script Syntax

```markdown
easy Run                    # Easy effort
hard Push-ups               # Hard effort
very hard Burpees           # Multi-word effort
moderate pace               # Moderate effort
```

## Compiler Integration

`EffortFragmentCompiler` converts to `MetricValue`:

```typescript
class EffortFragmentCompiler implements IFragmentCompiler {
  readonly type = 'effort';
  
  compile(fragment: EffortFragment): MetricValue[] {
    const label = fragment.value?.toString().trim();
    if (!label) return [];
    return [{
      type: MetricValueType.Effort,
      value: undefined,
      unit: `effort:${label}`
    }];
  }
}
```

## Common Effort Levels

| Level | Description |
|-------|-------------|
| `easy` | Recovery pace, conversational |
| `moderate` | Sustainable effort |
| `hard` | Challenging but maintainable |
| `very hard` | High intensity |
| `max` | Maximum effort |
| `RPE 7` | Rate of perceived exertion |

## Usage Examples

### Single-Word Effort

```typescript
const effort = new EffortFragment('hard', { line: 1, column: 1 });

expect(effort.value).toBe('hard');
expect(effort.image).toBe('hard');
expect(effort.origin).toBe('parser');
```

### Multi-Word Effort

```typescript
const effort = new EffortFragment('very hard', { line: 1, column: 1 });

expect(effort.value).toBe('very hard');
expect(effort.image).toBe('very hard');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('very hard Run');
const effort = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Effort) as EffortFragment;

expect(effort.value).toBe('very hard');
```

## Related

- [ActionFragment](ActionFragment.md) - Movement paired with effort
- [TimerFragment](TimerFragment.md) - Duration at effort level
- [RepFragment](RepFragment.md) - Reps at effort level
