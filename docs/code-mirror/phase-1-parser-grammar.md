# Phase 1: WodScript Language Package & Lezer Parser

**Goal**: Replace the Chevrotain-based parser with a modern, incremental Lezer parser integrated into the CodeMirror 6 ecosystem.

## 1.1 Grammar Specification (`src/grammar/wodscript.grammar`)

The new grammar will use Lezer's LR-style declarative syntax. It must support all existing "fragments" (reps, duration, distance, etc.) while allowing for future structured properties.

### Key Rules to Implement:
- **`@top Program`**: The entry point, consisting of one or more `Block`s.
- **`Block`**: A logical unit (workout, round, or exercise).
- **`Property`**: Key-value pairs (e.g., `name: "Fran"`, `type: AMRAP`).
- **`Exercise`**: A line starting with `-` or a number, followed by exercise details.
- **`Fragment`**: The building blocks of an exercise:
    - `Duration` (e.g., `5:00`, `:30`, `^10:00`)
    - `Reps` (e.g., `21`, `15-12-9`, `?`)
    - `Distance` (e.g., `400m`, `1.5km`)
    - `Weight/Resistance` (e.g., `95lb`, `@32kg`, `?kg`)
    - `Action/Comment` (e.g., `[Thrusters]`, `// Note`)

### Tokenization Strategy:
- Use `@tokens` block for regex-based matching of numbers, timers, and units.
- Prioritize specific tokens (like `Distance` units) over general identifiers to avoid ambiguity.

## 1.2 Tree-to-Statement Mapping

Instead of a Chevrotain Visitor, we will implement a "Tree Walker" using Lezer's `tree.iterate()`.

### Implementation Task:
- Create `src/parser/lezer-mapper.ts`.
- Function: `extractStatements(state: EditorState): ICodeStatement[]`.
- Logic:
    1. Iterate through the `SyntaxTree`.
    2. For each `Exercise` node, extract its child `Fragment` nodes.
    3. Map nodes to `ICodeFragment` types (matching the existing `FragmentType` enum).
    4. Construct `ParsedCodeStatement` objects with accurate line/column metadata derived from node offsets.

## 1.3 Testing & Validation

### Requirements:
- **Unit Tests**: Create `tests/parser/lezer-wodscript.test.ts`.
- **Parity Check**: Ensure that parsing a complex workout (like `Simple & Sinister`) results in the exact same `CodeStatement[]` structure as the old parser.
- **Error Tolerance**: Verify that the parser doesn't crash on invalid syntax and still produces a partial tree for highlighting.

## 1.4 Deliverables:
- `src/grammar/wodscript.grammar`
- `src/parser/wodscript-language.ts` (The CodeMirror language extension)
- `src/parser/lezer-mapper.ts`
- Comprehensive test suite for the new parser.
