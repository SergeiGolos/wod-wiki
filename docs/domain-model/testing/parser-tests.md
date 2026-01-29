# Parser Layer Tests (Test Point 1)

> **Contract:** `Text → ICodeStatement[]`

## What This Tests

The parser layer converts raw workout script text into structured `ICodeStatement` objects containing typed `ICodeFragment` arrays.

## Test Boundaries

| Input | Output | Assert |
|-------|--------|--------|
| Raw text string | `IScript.statements[]` | Correct fragment types |
| Timer syntax `5:00` | `TimerFragment` | value, direction, minutes, seconds |
| Rep syntax `10` | `RepFragment` | value |
| Rounds syntax `(3)` | `RoundsFragment` | value, count |
| Action syntax `[:action]` | `ActionFragment` | name, isPinned |
| Invalid input | `IScript.errors[]` | Error messages |

## Existing Tests

| Test File | Coverage |
|-----------|----------|
| [timer-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/timer-fragment.parser.test.ts) | Timer formats, directions, placeholders |
| [action-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/action-fragment.parser.test.ts) | Pinned/unpinned actions |
| [rounds-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/rounds-fragment.parser.test.ts) | Label/numeric/sequence rounds |
| [rep-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/rep-fragment.parser.test.ts) | Rep counts |
| [effort-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/effort-fragment.parser.test.ts) | Effort levels |
| [distance-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/distance-fragment.parser.test.ts) | Distance values |
| [resistance-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/resistance-fragment.parser.test.ts) | Weight/resistance |
| [increment-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/increment-fragment.parser.test.ts) | Increments |
| [lap-fragment.parser.test.ts](file:///x:/wod-wiki/src/parser/__tests__/lap-fragment.parser.test.ts) | Lap events |

## Test Pattern

```typescript
import { MdTimerRuntime } from '../md-timer';
import { FragmentType } from '../../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Fragment Parser Contract', () => {
  it('produces correct fragment type', () => {
    const script = parse('5:00 Run');
    
    expect(script.statements).toHaveLength(1);
    expect(script.statements[0].hasFragment(FragmentType.Timer)).toBe(true);
  });
});
```

## Missing Coverage

- [ ] Hierarchy tests (parent/child relationships)
- [ ] Multi-statement parsing
- [ ] Complex nested structures
- [ ] Statement metadata validation (line, column)

## Run Tests

```bash
bun test src/parser/__tests__ --preload ./tests/unit-setup.ts
```
