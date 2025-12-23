# Parser System

The parser system converts workout script text into structured `CodeStatement` nodes using a Chevrotain parsing library.

## Overview

The parser system consists of:

- **WodScript** - Container for parsed workout scripts
- **Timer Tokens** - Token definitions for workout syntax
- **Timer Parser** - Grammar rules for parsing
- **Timer Visitor** - Visitor pattern for tree transformation
- **Chevrotain** - Underlying parsing engine

## WodScript

Container that holds parsed workout statements and metadata.

### Constructor

```typescript
constructor(content: string, statements: CodeStatement[])
```

**Parameters:**

| Parameter | Type | Description |
|-----------|-------|-------------|
| `content` | `string` | Original workout script text |
| `statements` | `CodeStatement[]` | Parsed statement nodes |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `content` | `string` | Read-only original script |
| `statements` | `CodeStatement[]` | Read-only parsed statements |

**Example:**

```typescript
const script = new WodScript(workoutText, parsedStatements);
console.log('Parsed', script.statements.length, 'statements');
```

## CodeStatement

Represents a single parsed statement from workout script.

### Interface

```typescript
interface ICodeStatement {  
  id: number;
  parent?: number;
  children: number[][];
  fragments: ICodeFragment[];
  isLeaf?: boolean;
  meta: CodeMetadata;
  hints?: Set<string>;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Unique identifier for this statement |
| `parent` | `number | undefined` | ID of parent statement (if nested) |
| `children` | `number[][]` | Child statement IDs grouped by round/interval |
| `fragments` | `ICodeFragment[]` | Fragments parsed from this statement |
| `isLeaf` | `boolean | undefined` | Whether this is a leaf (executable) node |
| `meta` | `CodeMetadata` | Source code location (line, column) |
| `hints` | `Set<string> | undefined` | Semantic hints from dialect processing |

### Statement Hierarchy

Statements form a tree structure:

```
Workout Script (Root)
├── Statement 1: "3 Rounds"
│   ├── Child Group 1: [2]
│   └── Child Group 2: [3]
├── Statement 2: "10 Push-ups @ 135lb"
└── Statement 3: "15 Squats"
```

## Parsing Process

### 1. Tokenization

Script text is tokenized according to defined tokens:

- **Duration tokens** - Time values (e.g., "5:00", "30s")
- **Rep tokens** - Repetition counts (e.g., "10", "21-15-9")
- **Action tokens** - Keywords and commands
- **Literal tokens** - Text and labels

### 2. Parsing

Tokens are matched against grammar rules to build parse tree:

```typescript
// Example: "5:00 AMRAP: 10 Push-ups"
Tokens: [
  { type: 'Duration', image: '5:00' },
  { type: 'AMRAP', image: 'AMRAP' },
  { type: 'Colon', image: ':' },
  { type: 'Rep', image: '10' },
  { type: 'Identifier', image: 'Push-ups' }
]
```

### 3. Tree Transformation

Visitor pattern transforms parse tree into `CodeStatement` nodes:

```typescript
class TimerVisitor extends timerParser.getBaseCstVisitorConstructor() {
  statement(ctx) {
    // Transform CST to CodeStatement
    return new CodeStatement({
      id: generateId(),
      fragments: this.extractFragments(ctx),
      meta: this.extractMeta(ctx)
    });
  }
}
```

### 4. Dialect Processing

Registered dialects analyze statements and add semantic hints:

```typescript
dialectRegistry.processAll(statements);

// Dialects add hints like:
// - 'time_bound' for AMRAP
// - 'repeating_interval' for EMOM
// - 'group' for nested statements
```

## Parser Grammar

The parser defines grammar rules for workout syntax:

### Timer Rule

Parses time durations:

```
timer: duration
duration: [hours ':']? minutes [':' seconds]? | seconds
```

**Examples:**
- "5:00" → 5 minutes
- "1:30:00" → 1 hour, 30 minutes
- "30s" → 30 seconds

### Rep Rule

Parses repetition counts:

```
rep: NUMBER | NUMBER '-' NUMBER | '?'
```

**Examples:**
- "10" → 10 reps
- "21-15-9" → Rep scheme [21, 15, 9]
- "?" → Collectible reps

### Workout Structure

```
workout: statement*
statement: (rounds | timer | effort | action)+
```

## CodeMetadata

Tracks source code location for debugging and error reporting.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `line` | `number` | Line number in source (1-indexed) |
| `column` | `number` | Column number in source (1-indexed) |
| `offset` | `number` | Byte offset from start of file |
| `length` | `number` | Length of parsed segment |

**Example:**

```typescript
const meta: CodeMetadata = {
  line: 5,
  column: 12,
  offset: 89,
  length: 15
};
```

## Error Handling

Parser returns structured errors for invalid syntax:

```typescript
interface ParseError {
  line: number;
  column: number;
  message: string;
  expected: string[];
  actual: string;
}
```

**Example Error:**

```
"5 Round" // Missing 's'

Error at line 1, column 6:
  Expected: RoundsFragment, Identifier
  Actual: End of input
```

## See Also

- [Fragment Types](./fragment-types.md) - Fragments created by parser
- [Runtime System](./runtime-system.md) - How statements become blocks
- [Services](./services.md) - Dialect registry and processing
