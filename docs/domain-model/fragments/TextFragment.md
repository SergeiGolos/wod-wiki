# TextFragment

`TextFragment` represents display text or heading content in a workout script. It captures text labels and optional heading levels for structured output.

## Type Definition

```typescript
class TextFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Text;
  readonly type: string = "text";
  readonly origin: FragmentOrigin = 'parser';
  
  readonly value: { text: string, level?: string };
  readonly image: string;           // Display string (same as text)
  readonly text: string;            // Text content
  readonly level?: string;          // Heading level (h1, h2, etc.)
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Text`
- **Legacy Type**: `"text"`
- **Origin**: Always `'parser'`

## Constructor

```typescript
constructor(
  text: string,             // Text content
  level?: string,           // Optional heading level
  meta?: CodeMetadata       // Source location
)
```

## WOD Script Syntax

```markdown
# Workout A                  # Heading level 1
## Warm-up                   # Heading level 2
### Round 1                  # Heading level 3

Run to the park             # Plain text (no level)
```

## Compiler Integration

`TextFragmentCompiler` is a pass-through (display only):

```typescript
class TextFragmentCompiler implements IFragmentCompiler {
  readonly type = 'text';
  
  compile(_fragment: TextFragment): MetricValue[] {
    return [];  // No metric output
  }
}
```

Text fragments are for display purposes and don't produce metrics.

## Usage Examples

### Plain Text

```typescript
const text = new TextFragment('Run to the park', undefined, { line: 1, column: 1 });

expect(text.text).toBe('Run to the park');
expect(text.value.text).toBe('Run to the park');
expect(text.level).toBeUndefined();
```

### Heading Text

```typescript
const heading = new TextFragment('Workout A', 'h1', { line: 1, column: 1 });

expect(heading.text).toBe('Workout A');
expect(heading.value.text).toBe('Workout A');
expect(heading.value.level).toBe('h1');
expect(heading.level).toBe('h1');
```

### In Display Context

```typescript
// Rendering logic might use level for styling
function renderText(fragment: TextFragment) {
  if (fragment.level === 'h1') {
    return <h1>{fragment.text}</h1>;
  } else if (fragment.level === 'h2') {
    return <h2>{fragment.text}</h2>;
  }
  return <p>{fragment.text}</p>;
}
```

## Heading Levels

| Markdown | Level | Typical Use |
|----------|-------|-------------|
| `#` | `h1` | Workout title |
| `##` | `h2` | Section header |
| `###` | `h3` | Subsection/round |
| `####` | `h4` | Detail header |

## Related

- [ActionFragment](ActionFragment.md) - Named actions
- [EffortFragment](EffortFragment.md) - Effort descriptions
- [DisplayState Memory](../memory/DisplayState.md) - Display state
