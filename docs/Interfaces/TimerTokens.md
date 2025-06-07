## Description
Token definitions for the Wod.Wiki lexical analyzer. This module defines all the lexical tokens used by the Chevrotain-based parser to tokenize workout script text into structured elements.

## Original Location
`src/core/parser/timer.tokens.ts`

## Token Categories

### Whitespace and Structure
- **WhiteSpace**: Skipped whitespace patterns (`/\s+/`)
- **Return**: Line endings (`/\s*\r?\n/`)
- **Comma**: Statement separators (`/,/`)

### Operators and Symbols
- **Plus**: Increment operator (`/\+/`)
- **Minus**: Decrement operator (`/\-/`)
- **Up**: Trend indicator (`/\^/`)
- **Collon**: Time and label separator (`/:/`)
- **QuestionSymbol**: Optional marker (`/\?/`)
- **AtSign**: Reference indicator (`/@/`)
- **AllowedSymbol**: General symbols (`/[\\\/.,@!$%^*=&]+/`)

### Grouping Tokens
- **GroupOpen**: Round bracket open (`/\(/`)
- **GroupClose**: Round bracket close (`/\)/`)
- **ActionOpen**: Square bracket open (`/\[/`)
- **ActionClose**: Square bracket close (`/\]/`)

### Value Tokens
- **Timer**: Time patterns (`/(?::\d+|(?:\d+:){1,3}\d+)/`)
- **Number**: Numeric values (`/\d*\.?\d+/`)
- **Identifier**: Text identifiers (`/[a-zA-Z]\w*/`)

### Unit Tokens
- **Distance**: Distance units (`/(m|ft|mile|km|miles)\b/i`)
- **Weight**: Weight units (`/(kg|lb|bw)\b/i`)

### Special Categories
- **Trend**: Abstract category for trend tokens (parent of Up)

## Usage

```typescript
import { allTokens } from "./timer.tokens";
import { Lexer } from "chevrotain";

const lexer = new Lexer(allTokens);
const tokens = lexer.tokenize("10 pushups :30s");
```

## Token Priority

Tokens are ordered by priority in the `allTokens` array, with keywords appearing before general identifiers to ensure correct tokenization.

## Relationships

- Used by: [[MdTimerParse]] for grammar rule matching
- Consumed by: [[MdTimerRuntime]] during lexical analysis
- Dependencies: Chevrotain lexer framework

## Processing Flow

1. **Input Text** → Lexer tokenization using these token definitions
2. **Token Stream** → Parser consumes tokens according to grammar rules
3. **Parse Tree** → Visitor transforms tokens into AST nodes
4. **AST** → JIT compilation into executable blocks
