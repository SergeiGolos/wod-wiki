# Parser Layer

> **Input:** Raw text (workout script)  
> **Output:** `ICodeStatement[]` with `ICodeFragment[]`

## Responsibility

Transform text into structured, validated code statements with typed fragments.

## Key Interfaces

- **Input:** `string` (raw script text)
- **Output:** `IScript` containing:
  - `statements: ICodeStatement[]`
  - `errors?: ParseError[]`

## Fragment Types

| Type | Example | Fragment Class |
|------|---------|----------------|
| Timer | `5:00`, `0:00`, `1:30:00` | `TimerFragment` |
| Rep | `10`, `21-15-9` | `RepFragment` |
| Rounds | `3 Rounds` | `RoundsFragment` |
| Action | `Push-ups`, `Run` | `ActionFragment` |
| Effort | `@hard`, `@moderate` | `EffortFragment` |
| Distance | `400m`, `1 mile` | `DistanceFragment` |
| Resistance | `135#`, `60kg` | `ResistanceFragment` |

## Test Contract

```typescript
// Parser MUST produce:
// 1. Correct fragment types for input syntax
// 2. Valid metadata (line, column, offsets)
// 3. Correct parent/child relationships
// 4. Semantic errors for invalid values

const script = parse('5:00 Run');
expect(script.statements).toHaveLength(1);
expect(script.statements[0].fragments).toContainFragmentOfType(FragmentType.Timer);
```

## Related Files

- [[../contracts/ICodeStatement|ICodeStatement]]
- [[../contracts/ICodeFragment|ICodeFragment]]
- [[../testing/parser-tests|Parser Tests]]
