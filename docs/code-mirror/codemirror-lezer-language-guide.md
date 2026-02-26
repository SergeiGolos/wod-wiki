# CodeMirror Language Package Guide

**Source:** https://codemirror.net/examples/lang-package/
**Purpose:** Understanding CodeMirror 6's language system using Lezer parser generator
**Date:** 2026-02-18
**Tags:** #codemirror #lezer #parser #language #documentation

---

## Overview

CodeMirror 6 uses **Lezer** - a parser generator that converts declarative grammars into efficient, incremental parsers. This is the recommended approach for adding custom language support.

### What Lezer Provides

1. **Incremental Parsing** - Only re-parses changed portions of text (fast updates)
2. **Error Tolerance** - Continues parsing even with syntax errors (graceful degradation)
3. **Syntax Tree** - Produces a structured tree (not just tokens)
4. **Editor Integration** - Works seamlessly with CodeMirror's highlighting, folding, and indentation

### Three Ways to Implement a Parser

| Method | Complexity | Use Case | Pros | Cons |
|---------|-------------|-----------|-------|-------|
| **Lezer Grammar** | Low | Most languages | Declarative, efficient, structured | Requires grammar definition |
| **Stream Parser** | Very Low | Simple tokenization | Easy to start | No structure, limited |
| **Custom Parser** | High | Complex edge cases | Full control | Lots of work |

**Recommendation:** Use **Lezer Grammar** for WodScript - provides structure for execution while maintaining fast editing.

---

## Writing a Lezer Grammar

### Basic Structure

A grammar file defines the syntax rules of your language:

```grammar
// wodscript.grammar
@top Program { Statement* }

Statement { Exercise | Round | Property }

@tokens {
  "name:" @nameProp
  "type:" @typeProp
  "rounds:" @roundsProp
  Exercise @exercise
  Number @number
  Ident @ident
  ":" @colon
  "-" @dash
}

Exercise {
  @dash Ident @exerciseName @number? @unit?
}

Property {
  @nameProp String | @typeProp Ident | @roundsProp Number
}

Round {
  @roundsProp Number
}
```

### Key Concepts

1. **@top** - The root rule of the grammar
2. **Tokens** - Define the basic lexical elements (keywords, identifiers, numbers)
3. **Rules** - Combine tokens into higher-level structures
4. **@tokens block** - List all token patterns
5. **@tokenName** - Tag tokens for later use in props

### Building the Parser

```bash
# Generate JavaScript parser from grammar
lezer-generator wodscript.grammar

# Output: wodscript.js (contains parse tables)
```

Or use Rollup plugin to import directly from `.grammar` file:

```javascript
import rollupPluginLezer from '@lezer/generator/rollup'

export default {
  plugins: [
    rollupPluginLezer({
      include: ['src/grammar/*.grammar']
    })
  ]
}
```

Then import parser directly:

```typescript
import { parser } from './wodscript.grammar'
```

---

## CodeMirror Integration

### Adding Editor Metadata

The Lezer parser is generic. We need to add CodeMirror-specific metadata:

```typescript
import { parser } from './wodscript.grammar'
import {
  foldNodeProp,
  foldInside,
  indentNodeProp
} from '@codemirror/language'
import { styleTags, tags as t } from '@lezer/highlight'

// Configure parser with editor-specific props
let parserWithMetadata = parser.configure({
  props: [
    styleTags({
      // Map node names to highlighting tags
      Exercise: t.className,
      Property: t.propertyName,
      Number: t.number,
      String: t.string,
      Ident: t.variableName,
      "name:": t.keyword,
      "type:": t.keyword,
      "rounds:": t.keyword
    }),
    indentNodeProp.add({
      Exercise: context => context.column(context.node.from) + 2
    }),
    foldNodeProp.add({
      Round: foldInside,
      Statement: foldInside
    })
  ]
})
```

### Highlighting Tags

The `styleTags` helper maps grammar nodes to standard highlighting tags:

```typescript
import { styleTags, tags as t } from '@lezer/highlight'

styleTags({
  Exercise: t.className,          // Highlight as class name
  Property: t.propertyName,      // Highlight as property
  Number: t.number,              // Highlight as number
  String: t.string,              // Highlight as string
  Ident: t.variableName,          // Highlight as variable
  "name:": t.keyword,           // Highlight as keyword
  "type:": t.keyword,
  "rounds:": t.keyword
})
```

Common tags include:
- `t.keyword` - Keywords (if, for, etc.)
- `t.variableName` - Variable identifiers
- `t.className` - Class/type names
- `t.propertyName` - Object properties
- `t.number` - Numeric literals
- `t.string` - String literals
- `t.lineComment` - Line comments
- `t.blockComment` - Block comments

### Indentation

Control how CodeMirror auto-indents specific node types:

```typescript
import { indentNodeProp } from '@codemirror/language'

indentNodeProp.add({
  Exercise: context => {
    // Indent exercises 2 spaces from start of line
    return context.column(context.node.from) + 2
  },
  Round: context => {
    // Indent rounds to match opening marker
    return context.column(context.node.from) + context.unit
  }
})
```

The `context` object provides:
- `node.from` - Start position of the node
- `node.to` - End position of the node
- `context.unit` - One indent unit (usually 2 or 4 spaces)
- `context.column(pos)` - Get column at position

### Folding

Define which nodes can be collapsed:

```typescript
import { foldNodeProp, foldInside } from '@codemirror/language'

foldNodeProp.add({
  Round: foldInside,           // Fold entire round
  Statement: foldInside,       // Fold individual statements
  Exercise: foldInside         // Fold exercise details
})
```

`foldInside` hides everything except the delimiters of the node.

---

## Creating a Language Package

### Wrap Parser in Language

```typescript
import { LRLanguage } from '@codemirror/language'
import { parserWithMetadata } from './parser'

export const wodscriptLanguage = LRLanguage.define({
  name: 'wodscript',
  parser: parserWithMetadata,
  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['(', ')', '[', ']'] }
  }
})
```

### Add Language-Specific Extensions

```typescript
import { completeFromList } from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { insertNewlineAndIndent } from '@codemirror/commands'

// Autocompletion
export const wodscriptCompletion = wodscriptLanguage.data.of({
  autocomplete: completeFromList([
    { label: 'name:', type: 'keyword' },
    { label: 'type:', type: 'keyword' },
    { label: 'rounds:', type: 'keyword' },
    { label: 'AMRAP', type: 'type' },
    { label: 'RFT', type: 'type' },
    { label: 'EMOM', type: 'type' },
    { label: 'Thrusters', type: 'exercise' },
    { label: 'Pull-ups', type: 'exercise' }
  ])
})

// Keybindings
export const wodscriptKeymap = keymap([
  { key: 'Tab', run: insertNewlineAndIndent }
])
```

### Main Export Function

```typescript
import { LanguageSupport } from '@codemirror/language'

export function wodscript(config = {}) {
  return new LanguageSupport(wodscriptLanguage, [
    wodscriptCompletion,
    wodscriptKeymap
  ])
}
```

This follows the convention of exporting a function named after the language.

---

## Using in CodeMirror

### Basic Setup

```typescript
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { wodscript } from '@codemirror/lang-wodscript'

const view = new EditorView({
  doc: `name: "Fran"
type: AMRAP
timecap: 7

rounds: 3
- Thrusters: 95/65 lbs, 21 reps
- Pull-ups: 21 reps`,
  extensions: [
    basicSetup,
    wodscript()
  ],
  parent: document.body
})
```

### Accessing the Syntax Tree

This is the key for extracting `CodeStatement[]`:

```typescript
import { syntaxTree } from '@codemirror/language'

// Get current syntax tree
const tree = syntaxTree(view.state)

// Walk the tree to extract statements
const statements: CodeStatement[] = []

tree.iterate({
  enter: (node) => {
    if (node.type.name === 'Exercise') {
      const text = view.state.doc.sliceString(node.from, node.to)
      statements.push(parseExercise(text, node))
    } else if (node.type.name === 'Property') {
      statements.push(parseProperty(node))
    }
  }
})

console.log(statements)
// [
//   { type: 'property', key: 'name', value: 'Fran' },
//   { type: 'property', key: 'type', value: 'AMRAP' },
//   { type: 'exercise', name: 'Thrusters', load: '95/65 lbs', reps: 21 },
//   ...
// ]
```

### Walking the Syntax Tree

The `tree.iterate()` method visits each node:

```typescript
tree.iterate({
  enter: (node) => {
    console.log({
      type: node.type.name,
      from: node.from,
      to: node.to,
      text: view.state.doc.sliceString(node.from, node.to)
    })
  }
})
```

Filter for specific node types:

```typescript
tree.iterate({
  enter: (node) => {
    // Only process top-level statements
    if (node.type.name === 'Statement') {
      processStatement(node)
    }
  }
})
```

Access node children:

```typescript
tree.iterate({
  enter: (node) => {
    if (node.type.name === 'Exercise') {
      const children = node.getChild('Exercise')

      // Access specific child by type
      const name = node.getChild('Ident')
      const number = node.getChild('Number')

      console.log({
        exercise: name,
        reps: number
      })
    }
  }
})
```

---

## Example: Simple Lisp Language

From the CodeMirror documentation, here's a minimal language definition:

### Grammar File

```grammar
@top Program { Expression* }

@skip { space }

Expression {
  CallExpression | String | Number | Ident
}

CallExpression {
  "(" @lparen Expression+ @rparen ")"
}

@tokens {
  "(" @lparen
  ")" @rparen
  String @string
  Number @number
  Ident @ident
  space { whitespace }
}
```

### Parser Configuration

```typescript
import { parser } from './lisp.grammar'
import {
  foldNodeProp,
  foldInside,
  indentNodeProp
} from '@codemirror/language'
import { styleTags, tags as t } from '@lezer/highlight'

let parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Ident: t.variableName,
      Number: t.number,
      String: t.string,
      "(": t.paren
    }),
    indentNodeProp.add({
      CallExpression: context =>
        context.column(context.node.from) + context.unit
    }),
    foldNodeProp.add({
      CallExpression: foldInside
    })
  ]
})
```

### Language Package

```typescript
import { LRLanguage } from '@codemirror/language'
import { LanguageSupport } from '@codemirror/language'
import { completeFromList } from '@codemirror/autocomplete'

export const lispLanguage = LRLanguage.define({
  parser: parserWithMetadata,
  languageData: {
    commentTokens: { line: ';' }
  }
})

export const lispCompletion = lispLanguage.data.of({
  autocomplete: completeFromList([
    { label: 'defun', type: 'keyword' },
    { label: 'defvar', type: 'keyword' },
    { label: 'let', type: 'keyword' },
    { label: 'cons', type: 'function' },
    { label: 'car', type: 'function' },
    { label: 'cdr', type: 'function' }
  ])
})

export function lisp() {
  return new LanguageSupport(lispLanguage, [lispCompletion])
}
```

---

## Key Takeaways for WodScript

### What Lezer Replaces

**Before (wod-wiki with Chevrotain):**
- Heavy parser library
- Separate AST generation
- Complex visitor pattern
- Manual tokenization

**After (CodeMirror + Lezer):**
- Simple grammar file (.grammar)
- Automatic syntax tree generation
- Direct tree walking
- Built-in tokenization and highlighting

### Architecture Simplification

```
Old Architecture:
Chevrotain Parser → AST → Visitor → CodeStatement[]

New Architecture:
Lezer Grammar → Syntax Tree → Direct extraction → CodeStatement[]
```

### Benefits

1. **Incremental Updates** - Only re-parse changed text
2. **Editor Integration** - Built-in highlighting, folding, indentation
3. **Error Tolerance** - Graceful degradation on syntax errors
4. **Lightweight** - No heavy parser dependencies
5. **Structured Output** - Syntax tree provides both editing and execution needs

### Next Steps

1. Write WodScript grammar file (.grammar)
2. Generate Lezer parser
3. Configure with highlighting, indentation, folding
4. Create language package export
5. Implement tree walking to extract `CodeStatement[]`
6. Add autocompletion for exercises and properties

---

## Resources

- [CodeMirror Language Package Example](https://codemirror.net/examples/lang-package/)
- [Lezer System Guide](https://lezer.codemirror.net/docs/guide/)
- [Lezer Basic Example](https://lezer.codemirror.net/examples/basic/)
- [CodeMirror Language Repo](https://github.com/codemirror/language)
- [Example Language Repo](https://github.com/codemirror/lang-example)

---

**End of CodeMirror Language Package Guide**

**Status:** ✅ Complete
**Ready for Implementation:** Yes
