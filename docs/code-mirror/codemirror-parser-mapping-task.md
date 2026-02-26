# Task: Map CodeMirror/Lezer Parser to WodScript CodeStatement[]

**Date:** 2026-02-18
**Task Type:** Parser Mapping & Architecture Refactoring
**Assigned To:** Claude Code
**Priority:** High
**Estimated Effort:** 6-8 hours
**Status:** Ready to Start

---

## Task Overview

Create a mapping between CodeMirror 6's Lezer parser and WodScript's `CodeStatement[]` representation. The goal is to **collapse the visitor and parser layers** into Lezer's syntax tree, eliminating the need for a separate AST/visitor pattern.

### Key Insight

CodeMirror's Lezer parser generates a syntax tree directly. Instead of:
- **Parser → AST → Visitor → CodeStatement[]**

We can do:
- **Lezer Grammar → Syntax Tree → Direct Extraction → CodeStatement[]**

This simplifies the architecture significantly.

---

## Reference Materials

### 1. CodeMirror Language Package Guide
**Location:** `/mnt/storage/share/captains-log/research/codemirror-lezer-language-guide.md`
**Key Sections:**
- Writing a Lezer Grammar
- Accessing the Syntax Tree
- Walking the Tree with `tree.iterate()`

### 2. WOD Wiki Existing Parser
**Location:** https://github.com/SergeiGolos/wod-wiki
**Key Files:**
- `src/parser/WodScript.ts` - Current Chevrotain-based parser
- `src/runtime/JitCompiler.ts` - JIT compilation of parsed scripts
- `src/runtime/ScriptRuntime.ts` - Runtime execution engine

### 3. Lezer Documentation
**URL:** https://lezer.codemirror.net/docs/guide/
**Key Concepts:**
- Grammar rules
- Token definitions
- Syntax tree structure
- Node iteration

---

## Required Deliverables

### 1. WodScript Grammar Definition (.grammar)

Create `wodscript.grammar` with rules for:

#### Top-Level Structure
```grammar
@top WorkoutDef { Property* Exercise* Round* }
```

#### Properties
- `name: "Fran"` - Workout name
- `type: AMRAP` - Workout type (AMRAP, RFT, EMOM, etc.)
- `timecap: 7` - Time cap in minutes
- `rounds: 3` - Number of rounds
- `rest: 60` - Rest between rounds (seconds)

#### Exercises
- `- Thrusters: 95/65 lbs, 21 reps` - Exercise definition
- Fields: name, load, reps, units, distance, time

#### Comments
- `# This is a comment` - Line comments

### 2. CodeStatement[] Interface

Define TypeScript interfaces for the output:

```typescript
interface CodeStatement {
  type: 'property' | 'exercise' | 'round'
  line?: number
  column?: number
}

interface PropertyStatement extends CodeStatement {
  type: 'property'
  key: 'name' | 'type' | 'timecap' | 'rounds' | 'rest'
  value: string | number
}

interface ExerciseStatement extends CodeStatement {
  type: 'exercise'
  name: string
  load?: string
  reps?: number
  units?: string
  distance?: string
  time?: string
}

interface RoundStatement extends CodeStatement {
  type: 'round'
  count?: number
  statements: CodeStatement[]
}
```

### 3. Tree Walking Logic

Implement function to extract `CodeStatement[]` from Lezer syntax tree:

```typescript
import { syntaxTree } from '@codemirror/language'

export function extractStatements(view: EditorView): CodeStatement[] {
  const tree = syntaxTree(view.state)
  const statements: CodeStatement[] = []

  tree.iterate({
    enter: (node) => {
      // Map syntax tree nodes to CodeStatement objects
      if (node.type.name === 'Property') {
        statements.push(extractProperty(node, view.state))
      } else if (node.type.name === 'Exercise') {
        statements.push(extractExercise(node, view.state))
      } else if (node.type.name === 'Round') {
        statements.push(extractRound(node, view.state))
      }
    }
  })

  return statements
}

function extractProperty(node: SyntaxNode, state: EditorState): PropertyStatement {
  const text = state.doc.sliceString(node.from, node.to)
  // Parse: name: "Fran" or type: AMRAP
  const [key, value] = text.split(':').map(s => s.trim())
  return {
    type: 'property',
    key,
    value
  }
}

function extractExercise(node: SyntaxNode, state: EditorState): ExerciseStatement {
  const text = state.doc.sliceString(node.from, node.to)
  // Parse: - Thrusters: 95/65 lbs, 21 reps
  // Extract exercise name and parameters
  return {
    type: 'exercise',
    name: 'Thrusters',
    load: '95/65 lbs',
    reps: 21
  }
}

function extractRound(node: SyntaxNode, state: EditorState): RoundStatement {
  const text = state.doc.sliceString(node.from, node.to)
  // Parse: rounds: 3 or nested exercises
  return {
    type: 'round',
    count: 3,
    statements: []
  }
}
```

### 4. Parser Configuration

Configure Lezer parser with CodeMirror metadata:

```typescript
import { parser } from './wodscript.grammar'
import {
  foldNodeProp,
  indentNodeProp
} from '@codemirror/language'
import { styleTags, tags as t } from '@lezer/highlight'

export const wodscriptParser = parser.configure({
  props: [
    styleTags({
      Property: t.propertyName,
      Exercise: t.className,
      "name:": t.keyword,
      "type:": t.keyword,
      "timecap:": t.keyword,
      "rounds:": t.keyword,
      "rest:": t.keyword,
      Number: t.number,
      String: t.string,
      Comment: t.lineComment
    }),
    indentNodeProp.add({
      Exercise: context => context.column(node.from) + 2,
      Round: context => context.column(node.from) + 2
    }),
    foldNodeProp.add({
      Round: foldInside,
      Exercise: foldInside
    })
  ]
})
```

### 5. Language Package Export

Create the main language package:

```typescript
import { LRLanguage } from '@codemirror/language'
import { LanguageSupport } from '@codemirror/language'
import { completeFromList } from '@codemirror/autocomplete'

export const wodscriptLanguage = LRLanguage.define({
  name: 'wodscript',
  parser: wodscriptParser,
  languageData: {
    commentTokens: { line: '#' }
  }
})

export const wodscriptCompletion = wodscriptLanguage.data.of({
  autocomplete: completeFromList([
    { label: 'name:', type: 'keyword' },
    { label: 'type:', type: 'keyword' },
    { label: 'timecap:', type: 'keyword' },
    { label: 'rounds:', type: 'keyword' },
    { label: 'rest:', type: 'keyword' },
    { label: 'AMRAP', type: 'type' },
    { label: 'RFT', type: 'type' },
    { label: 'EMOM', type: 'type' },
    { label: 'Thrusters', type: 'exercise' },
    { label: 'Pull-ups', type: 'exercise' },
    { label: 'Squats', type: 'exercise' },
    { label: 'Burpees', type: 'exercise' }
  ])
})

export function wodscript() {
  return new LanguageSupport(wodscriptLanguage, [wodscriptCompletion])
}
```

---

## Architecture Comparison

### Before (wod-wiki with Chevrotain)

```
WodScript Text
    ↓
Chevrotain Parser
    ↓
AST (Abstract Syntax Tree)
    ↓
Visitor Pattern
    ↓
CodeStatement[]
```

**Issues:**
- Heavy Chevrotain dependency
- Separate AST generation
- Complex visitor pattern
- Manual tokenization
- Not incremental (re-parse entire text on changes)

### After (CodeMirror + Lezer)

```
WodScript Text
    ↓
Lezer Grammar
    ↓
Syntax Tree (automatically generated)
    ↓
Direct Extraction (tree.iterate())
    ↓
CodeStatement[]
```

**Benefits:**
- Simple .grammar file (declarative)
- Automatic syntax tree
- Direct extraction (no visitor needed)
- Built-in highlighting/folding/indentation
- Incremental parsing (only re-parse changes)

---

## Mapping Requirements

### From wod-wiki AST Nodes to Lezer Syntax Tree

| wod-wiki Node | Lezer Rule | CodeStatement Type |
|---------------|-------------|-------------------|
| `PropertyNode` | `Property` | `PropertyStatement` |
| `ExerciseNode` | `Exercise` | `ExerciseStatement` |
| `RoundNode` | `Round` | `RoundStatement` |
| `CommentNode` | `Comment` | (ignored) |

### From Chevrotain to Lezer Grammar

| Chevrotain Rule | Lezer Rule | Example |
|-----------------|-------------|----------|
| `WorkoutDef` | `WorkoutDef` | `name: "Fran"` |
| `Property` | `Property` | `type: AMRAP` |
| `Exercise` | `Exercise` | `- Thrusters: 21 reps` |
| `Round` | `Round` | `rounds: 3` |
| `Comment` | `Comment` | `# Note` |

### Syntax Tree Node to CodeStatement Mapping

```typescript
// Given a syntax tree node from Lezer
function nodeToStatement(node: SyntaxNode, state: EditorState): CodeStatement {
  switch (node.type.name) {
    case 'Property':
      return {
        type: 'property',
        key: extractKey(node),
        value: extractValue(node)
      }
    case 'Exercise':
      return {
        type: 'exercise',
        name: extractName(node),
        reps: extractReps(node),
        load: extractLoad(node)
      }
    case 'Round':
      return {
        type: 'round',
        count: extractCount(node),
        statements: extractChildStatements(node)
      }
    default:
      throw new Error(`Unknown node type: ${node.type.name}`)
  }
}
```

---

## Implementation Steps

### Step 1: Analyze Existing WodScript Syntax
1. Review wod-wiki parser (`src/parser/WodScript.ts`)
2. Document all supported syntax constructs
3. Extract example workout scripts
4. Identify all token types needed

### Step 2: Design Lezer Grammar
1. Define top-level rules (`WorkoutDef`)
2. Define property rules (`Property`)
3. Define exercise rules (`Exercise`)
4. Define round rules (`Round`)
5. Define comment rules (`Comment`)
6. Define tokens (`name:`, `type:`, numbers, identifiers)

### Step 3: Write Grammar File
1. Create `src/grammar/wodscript.grammar`
2. Implement all rules from Step 2
3. Test with `lezer-generator`
4. Generate parser (`wodscript.js`)

### Step 4: Configure Parser for CodeMirror
1. Import generated parser
2. Add highlighting tags (`styleTags`)
3. Add indentation rules (`indentNodeProp`)
4. Add folding rules (`foldNodeProp`)
5. Export configured parser

### Step 5: Implement Tree Extraction
1. Write `extractStatements()` function
2. Implement `extractProperty()` helper
3. Implement `extractExercise()` helper
4. Implement `extractRound()` helper
5. Test with various workout scripts

### Step 6: Create Language Package
1. Wrap parser in `LRLanguage.define()`
2. Add autocompletion support
3. Export main `wodscript()` function
4. Test in CodeMirror editor

### Step 7: Test & Validate
1. Test with simple workout scripts
2. Test with complex nested structures
3. Test with syntax errors (error tolerance)
4. Verify highlighting works correctly
5. Verify folding and indentation
6. Validate extracted `CodeStatement[]`

---

## Testing Checklist

### Grammar Tests
- [ ] Parses property statements correctly (`name: "Fran"`)
- [ ] Parses exercise statements correctly (`- Thrusters: 21 reps`)
- [ ] Parses round definitions correctly (`rounds: 3`)
- [ ] Parses comments correctly (`# Note`)
- [ ] Handles whitespace properly
- [ ] Handles syntax errors gracefully

### Tree Extraction Tests
- [ ] `extractStatements()` returns correct `CodeStatement[]`
- [ ] `PropertyStatement` extracts key and value
- [ ] `ExerciseStatement` extracts name, reps, load
- [ ] `RoundStatement` extracts count and child statements
- [ ] Handles nested structures
- [ ] Preserves line/column information

### Integration Tests
- [ ] Highlighting works for all token types
- [ ] Auto-completion suggests keywords and exercises
- [ ] Indentation follows WodScript conventions
- [ ] Folding works for rounds and exercises
- [ ] Parser updates incrementally (fast edits)

---

## Example Inputs & Expected Outputs

### Input 1: Simple Workout

```wodscript
name: "Fran"
type: AMRAP
timecap: 7

rounds: 3
- Thrusters: 95/65 lbs, 21 reps
- Pull-ups: 21 reps
```

**Expected CodeStatement[]:**
```typescript
[
  { type: 'property', key: 'name', value: 'Fran' },
  { type: 'property', key: 'type', value: 'AMRAP' },
  { type: 'property', key: 'timecap', value: 7 },
  { type: 'property', key: 'rounds', value: 3 },
  { type: 'exercise', name: 'Thrusters', load: '95/65 lbs', reps: 21 },
  { type: 'exercise', name: 'Pull-ups', reps: 21 }
]
```

### Input 2: Complex Workout

```wodscript
name: "Cindy"
type: AMRAP
timecap: 20

- Pull-ups: 5 reps
- Push-ups: 10 reps
- Squats: 15 reps

rounds: as-many-as-possible
```

**Expected CodeStatement[]:**
```typescript
[
  { type: 'property', key: 'name', value: 'Cindy' },
  { type: 'property', key: 'type', value: 'AMRAP' },
  { type: 'property', key: 'timecap', value: 20 },
  { type: 'exercise', name: 'Pull-ups', reps: 5 },
  { type: 'exercise', name: 'Push-ups', reps: 10 },
  { type: 'exercise', name: 'Squats', reps: 15 },
  { type: 'round', count: 'as-many-as-possible', statements: [] }
]
```

### Input 3: EMOM Workout

```wodscript
name: "EMOM 10"
type: EMOM
timecap: 10

rounds: 10
- Thrusters: 95/65 lbs, 10 reps
- Box Jumps: 10 reps
rest: 0
```

**Expected CodeStatement[]:**
```typescript
[
  { type: 'property', key: 'name', value: 'EMOM 10' },
  { type: 'property', key: 'type', value: 'EMOM' },
  { type: 'property', key: 'timecap', value: 10 },
  { type: 'round', count: 10, statements: [
    { type: 'exercise', name: 'Thrusters', load: '95/65 lbs', reps: 10 },
    { type: 'exercise', name: 'Box Jumps', reps: 10 }
  ]},
  { type: 'property', key: 'rest', value: 0 }
]
```

---

## Notes

### Lezer vs Chevrotain

**Lezer Advantages:**
- Declarative grammar (easier to maintain)
- Built-in error tolerance
- Incremental parsing (fast updates)
- Direct CodeMirror integration
- Smaller bundle size

**Chevrotain Advantages:**
- More mature ecosystem
- Better tooling support
- Easier for complex grammars

**Decision:** Use Lezer for WodScript - simpler syntax and perfect fit for CodeMirror.

### Error Handling

Lezer parsers are error-tolerant by default. When syntax errors occur:
- Parser continues parsing
- Syntax tree still generated
- Errors marked in tree
- Highlighting still works

This is ideal for editing - user sees errors but editing continues.

### Performance

Lezer's incremental parsing means:
- Only re-parse changed portions
- Fast updates during typing
- No full re-parses needed
- Smooth editing experience

---

## Success Criteria

- [ ] Grammar file (`wodscript.grammar`) correctly parses WodScript
- [ ] Generated parser works with CodeMirror
- [ ] `extractStatements()` produces correct `CodeStatement[]`
- [ ] Highlighting, indentation, folding work
- [ ] Autocompletion suggests keywords and exercises
- [ ] All test cases pass
- [ ] Performance acceptable (instant re-renders)
- [ ] Error handling graceful (syntax errors don't break editor)

---

## Questions to Resolve

1. **Nested Rounds:** Should rounds support nested exercise definitions?
2. **Comments:** Should comments be preserved in `CodeStatement[]` or ignored?
3. **Units:** How to represent units (lbs, kg, meters, etc.) in statements?
4. **Variables:** Should WodScript support variables/references (e.g., `@load` from property)?
5. **Conditionals:** Should support conditional exercises (e.g., `if Rx: ... else: ...`)?

---

## References

- [CodeMirror Language Package Guide](https://codemirror.net/examples/lang-package/)
- [Lezer System Guide](https://lezer.codemirror.net/docs/guide/)
- [WOD Wiki Parser](https://github.com/SergeiGolos/wod-wiki/tree/main/src/parser)
- [WOD Wiki Runtime](https://github.com/SergeiGolos/wod-wiki/tree/main/src/runtime)

---

**End of Task Document**

**Status:** ✅ Ready for Claude Code
**Estimated Effort:** 6-8 hours
**Dependencies:** None (standalone task)
