# Parser module architecture

The parser is intentionally split into two seams so we can evolve dialect behavior without touching syntax parsing:

1. `syntax-parser.ts` (`extractSyntaxFacts`) — Lezer + `EditorState` only. Produces parser-native `SyntaxFacts`.
2. `semantic-classifier.ts` (`classifyStatements`) — converts `SyntaxFacts` into runtime `ParsedCodeStatement` metrics.

`lezer-mapper.ts` keeps the stable public API (`extractStatements`) as a transparent pipeline:

```ts
const facts = extractSyntaxFacts(state);
return classifyStatements(facts);
```

## Why this seam exists

- Syntax tests can assert grammar extraction independently from metric decisions.
- Semantic tests can run against plain `SyntaxFacts` fixtures without CodeMirror/Lezer setup.
- Future dialect modules can reuse `SyntaxFacts` directly while keeping `extractStatements` backward-compatible.

## Testing strategy

- Unit test `extractSyntaxFacts` (`syntax-parser.test.ts`) for primitive extraction and hierarchy.
- Unit test `classifyStatements` (`__tests__/semantic-classifier.test.ts`) for metric classification and fragment merges.
- Integration test `MdTimerRuntime.read` (`md-timer.integration.test.ts`) to verify parser round-trip stability and pipeline parity.

## Migration notes for dialect work

- Prefer consuming exported `SyntaxFacts` + primitive kinds when adding dialect-specific logic.
- Keep `semantic-classifier.ts` independent of grammar internals (`parser.terms`) and `EditorState`.
- Keep `syntax-parser.ts` free of runtime metric imports so parser and classifier stay independently testable.
