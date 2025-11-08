# Unit Testing Deep Dive: WOD Script Language Parser

## Overview

This document provides a comprehensive analysis of the unit testing architecture and implementation for the WOD (Workout of the Day) scripting language parser. The parser is built using Chevrotain, a parsing toolkit for JavaScript/TypeScript, and follows a rigorous testing methodology to ensure reliability, performance, and correctness.

## Table of Contents

1. [Parser Architecture](#parser-architecture)
2. [Testing Infrastructure](#testing-infrastructure)
3. [Core Parser Components](#core-parser-components)
4. [Test Categories](#test-categories)
5. [Testing Patterns and Best Practices](#testing-patterns-and-best-practices)
6. [Test Configuration](#test-configuration)
7. [Performance Testing](#performance-testing)
8. [Error Handling and Recovery](#error-handling-and-recovery)
9. [Validation Framework](#validation-framework)
10. [Test Utilities and Helpers](#test-utilities-and-helpers)
11. [Future Testing Enhancements](#future-testing-enhancements)

## Parser Architecture

### 1. Tokenization Layer (`timer.tokens.ts`)

The tokenization layer defines all lexical elements of the WOD script language:

```typescript
// Core token definitions
export const Timer = createToken({
  name: "Timer",
  pattern: /(?::\d+|(?:\d+:){1,3}\d+)/,
});

export const Number = createToken({
  name: "Number",
  pattern: /\d*\.?\d+/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z]\w*/,
});
```

**Token Categories:**
- **Control Tokens**: ActionOpen `[`, ActionClose `]`, GroupOpen `(`, GroupClose `)`
- **Data Tokens**: Number, Identifier, Timer, Distance, Weight
- **Operators**: Minus `-`, Plus `+`, AtSign `@`, Collon `:`
- **Special Symbols**: AllowedSymbol for various punctuation

### 2. Grammar Definition (`timer.parser.ts`)

The parser defines the grammar using Chevrotain's CSTParser:

```typescript
export class MdTimerParse extends CstParser {
  constructor(tokens?: IToken[]) {
    super(allTokens);
    const $ = this as any;

    $.RULE("wodMarkdown", () => {
      $.AT_LEAST_ONE_SEP({
        SEP: Return,
        DEF: () => {
          $.SUBRULE($.wodBlock, { LABEL: "markdown" });
        },
      });
    });
    
    // ... additional rules
  }
}
```

**Grammar Rules:**
- `wodMarkdown`: Top-level entry point
- `wodBlock`: Individual workout statements
- `action`: Action fragments `[action: ...]`
- `duration`: Timer fragments
- `reps`: Repetition count fragments
- `rounds`: Round grouping `(1-2-3)`
- `effort`: Exercise name fragments
- `resistance`: Weight fragments
- `distance`: Distance fragments

### 3. AST Visitor Pattern (`timer.visitor.ts`)

The visitor transforms CST (Concrete Syntax Tree) into the application's internal representation:

```typescript
export class MdTimerInterpreter extends BaseCstVisitor {
  wodMarkdown(ctx: any) {
    // Processes markdown blocks into ICodeStatement[]
    let blocks = ctx.markdown
      .filter((block: any) => block !== null && block !== undefined)
      .flatMap((block: any) => this.visit(block) || []);
    
    // Build parent-child relationships
    // Group children by lap fragments
    return blocks;
  }
}
```

**Key Features:**
- **Hierarchical Processing**: Maintains parent-child relationships between statements
- **Lap Fragment Grouping**: Groups consecutive compose (+) fragments
- **Metadata Preservation**: Tracks line numbers, character positions, and other metadata
- **Error Handling**: Robust error recovery and reporting

## Testing Infrastructure

### Test Configuration

The testing setup uses Vitest with specialized configurations:

```javascript
// vitest.unit.config.js
export default defineConfig({
  test: {
    exclude: ['tests/e2e/**', '**/node_modules/**', '**/dist/**'],
  },
  projects: [
    {
      test: {
        name: 'unit',
        include: [
          'tests/language-compilation/**/*.test.{ts,tsx}',
          // ... other test categories
        ],
        environment: 'node',
      },
    },
  ],
});
```

### Test Environment Setup

Comprehensive test setup with mocking and configuration:

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Performance API mocking
if (!globalThis.performance) {
  globalThis.performance = {
    now: vi.fn(() => Date.now()),
    // ... other performance methods
  } as any;
}

// Observer API mocking
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

## Core Parser Components

### 1. Main Runtime (`md-timer.ts`)

The primary runtime interface orchestrates parsing:

```typescript
export class MdTimerRuntime {
  lexer: Lexer;
  visitor: MdTimerInterpreter;
  
  constructor() {
    this.lexer = new Lexer(allTokens);
    this.visitor = new MdTimerInterpreter();
  }

  read(inputText: string): IScript {
    const { tokens } = this.lexer.tokenize(inputText);
    const parser = new MdTimerParse(tokens) as any;
    const cst = parser.wodMarkdown();
    const raw = cst != null ? this.visitor.visit(cst) : ([] as ICodeStatement[]);
    return new WodScript(inputText, raw, parser.errors) as IScript;
  }
}
```

### 2. Script Representation (`WodScript.ts`)

Defines the parsed script structure:

```typescript
export class WodScript implements IScript {
  constructor(
    public readonly source: string,
    public readonly statements: ICodeStatement[],
    public readonly errors: any[]
  ) {}
  
  getId(id: number): ICodeStatement | undefined {
    return this.statements.find(stmt => stmt.id === id);
  }
  
  getIds(ids: number[]): ICodeStatement[] {
    return ids.map(id => this.getId(id)).filter(Boolean) as ICodeStatement[];
  }
}
```

## Test Categories

### 1. Integration Tests (`parser-integration.test.ts`)

**Purpose**: End-to-end parser functionality validation

**Test Coverage**:
```typescript
describe('T076: Parse Code to WodScript', () => {
  describe('Valid workout parsing', () => {
    it('should parse simple timer statement', () => {
      const code = 'timer 5min';
      const script = parser.read(code);
      
      expect(script.statements).toBeDefined();
      expect(script.statements.length).toBeGreaterThan(0);
      expect(script.errors).toHaveLength(0);
    });
  });
});
```

**Key Test Areas**:
- Simple timer statement parsing
- Rounds with reps (TODO: Block syntax support)
- Complex workout structures (TODO: Nested block syntax)
- Empty code handling
- Error capture and reporting
- Performance requirements (<100ms for 100 lines)
- Rapid successive parsing (debounce simulation)
- Result structure validation

### 2. Statement ID Tests (`statement-ids.test.ts`)

**Purpose**: Verify statement ID assignment and line number correlation

**Key Assertions**:
```typescript
it('should assign line numbers as statement IDs', () => {
  const input = `first statement
second statement
third statement`;

  const result = runtime.read(input);
  
  expect(result.statements.length).toBe(3);
  expect(result.statements[0].id).toBe(1);
  expect(result.statements[1].id).toBe(2);
  expect(result.statements[2].id).toBe(3);
});
```

**Verification Points**:
- Line numbers used as statement IDs (not character offsets)
- Nested structure ID assignment
- Complex structure ID consistency
- ID-type consistency throughout parsing pipeline

### 3. WodScript Type Tests (`wod-script-parsing.test.ts`)

**Purpose**: Type safety and API contract validation

**Test Focus**:
```typescript
describe('WodScript ID Type Consistency', () => {
  it('should accept only numeric IDs for getId', () => {
    const statement = script.getId(1);
    expect(statement).toBeDefined();
    expect(typeof statement?.id).toBe('number');
  });
  
  it('should use numeric comparison for ID lookup', () => {
    const statement = script.getId(2);
    expect(statement?.id).toBe(2);
    expect(typeof statement?.id).toBe('number');
  });
});
```

### 4. Error Recovery Tests (`parser-error-recovery.test.ts`)

**Purpose**: Parser resilience and error handling validation

**Planned Test Areas** (Currently TODO):
- Malformed fragment syntax handling
- Unmatched braces and parentheses
- Invalid timer formats
- Invalid rep schemes
- Error position reporting accuracy
- Partial recovery capabilities

## Testing Patterns and Best Practices

### 1. AAA Pattern (Arrange, Act, Assert)

Consistent use of the AAA pattern across all tests:

```typescript
it('should parse timer statement with proper structure', () => {
  // Arrange
  const code = 'timer 5min';
  const parser = new MdTimerRuntime();
  
  // Act
  const result = parser.read(code);
  
  // Assert
  expect(result.statements).toHaveLength(1);
  expect(result.errors).toHaveLength(0);
  expect(result.source).toBe(code);
});
```

### 2. Test Data Organization

**Mock Data Patterns**:
```typescript
const mockMeta: CodeMetadata = {
  line: 1,
  startOffset: 0,
  endOffset: 10,
  columnStart: 1,
  columnEnd: 10,
  length: 10
};

const mockStatements: ICodeStatement[] = [
  {
    id: 1,
    parent: undefined,
    children: [[2], [3]],
    fragments: [],
    isLeaf: false,
    meta: mockMeta
  },
  // ... more mock statements
];
```

### 3. Performance Testing

**Timing Assertions**:
```typescript
it('should parse 100 lines in <100ms', () => {
  const lines = Array(100).fill('timer 1min').join('\n');
  
  const start = performance.now();
  parser.read(lines);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100);
});
```

### 4. Error Testing Patterns

**Graceful Error Handling**:
```typescript
it('should handle invalid syntax gracefully', () => {
  const code = 'invalid {{{ syntax';
  const script = parser.read(code);

  expect(script.errors).toBeDefined();
  expect(Array.isArray(script.errors)).toBe(true);
});
```

## Test Configuration

### Vitest Configuration Details

**Unit Test Environment**:
- **Excludes**: E2E tests, node_modules, dist files
- **Environment**: Node.js for language compilation tests
- **Include Patterns**: Specific test directories and file extensions

**Component Test Environment**:
- **Environment**: jsdom for React component tests
- **Setup Files**: `./tests/setup.ts` for global mocking

### Global Test Setup

**Mocking Strategy**:
```typescript
// Console method mocking for cleaner output
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn((...args) => {
    // Allow certain expected errors
    const errorMsg = args.join(' ');
    if (errorMsg.includes('Warning: ReactDOM.render is no longer supported')) {
      return;
    }
    originalError(...args);
  });
});
```

## Performance Testing

### 1. Benchmarks

**Performance Requirements**:
- **Parse Speed**: <100ms for 100 lines of simple timer statements
- **Memory Usage**: Efficient memory management for large scripts
- **Successive Parses**: Handle rapid parsing without performance degradation

### 2. Performance Test Implementation

```typescript
describe('Performance requirements', () => {
  it('should parse 100 lines in <100ms', () => {
    const lines = Array(100).fill('timer 1min').join('\n');
    
    const start = performance.now();
    parser.read(lines);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

### 3. Memory and Resource Testing

**Resource Management**:
- Proper cleanup of parser instances
- Memory leak prevention in parsing pipeline
- Efficient AST visitor implementation

## Error Handling and Recovery

### 1. Error Types

**Parse-Time Errors**:
- **Syntax Errors**: Invalid token sequences
- **Grammar Errors**: Rule violations
- **Lexical Errors**: Invalid token patterns

**Runtime Validation Errors**:
- **Circular References**: Infinite loop prevention
- **Nesting Depth**: Stack overflow prevention
- **Timer Validation**: Invalid timer configurations

### 2. Validation Framework

**Validation Interface** (`IValidationRule.ts`):
```typescript
export interface IValidationRule {
  readonly name: string;
  validate(statement: CodeStatement): IValidationResult;
}

export interface IValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sourcePosition?: number[];
}
```

### 3. Built-in Validators

**Circular Reference Validator**:
```typescript
export class CircularReferenceValidator implements IValidationRule {
  readonly name = 'CircularReferenceValidator';
  
  validate(statement: CodeStatement): IValidationResult {
    const visited = new Set<CodeStatement>();
    return this.validateRecursive(statement, visited, []);
  }
}
```

**Nesting Depth Validator**:
```typescript
export class NestingDepthValidator implements IValidationRule {
  readonly name = 'NestingDepthValidator';
  
  validate(statement: CodeStatement): IValidationResult {
    return this.validateDepth(statement, 0);
  }
}
```

**Timer Event Validator**:
```typescript
export class TimerEventValidator implements IValidationRule {
  readonly name = 'TimerEventValidator';
  
  validate(statement: CodeStatement): IValidationResult {
    if ('duration' in statement) {
      const duration = (statement as any).duration;
      if (typeof duration === 'number' && duration <= 0) {
        return {
          isValid: false,
          errorMessage: `Timer duration must be positive (got: ${duration})`,
          sourcePosition: statement.id
        };
      }
    }
    return { isValid: true };
  }
}
```

## Test Utilities and Helpers

### 1. Test Helpers

**Runtime Helpers** (`tests/helpers/test-utils.ts`):
```typescript
// Common test utilities for parser testing
export const createMockParser = () => new MdTimerRuntime();
export const createTestScript = (content: string) => ({
  source: content,
  statements: [],
  errors: []
});
```

### 2. Assertion Helpers

**Custom Assertions**:
```typescript
// Helper for validating script structure
export const expectValidScript = (script: IScript) => {
  expect(script).toBeDefined();
  expect(script.statements).toBeDefined();
  expect(Array.isArray(script.statements)).toBe(true);
  expect(script.errors).toBeDefined();
  expect(Array.isArray(script.errors)).toBe(true);
};

// Helper for validating statement metadata
export const expectValidMetadata = (meta: CodeMetadata) => {
  expect(meta.line).toBeGreaterThanOrEqual(0);
  expect(meta.startOffset).toBeGreaterThanOrEqual(0);
  expect(meta.endOffset).toBeGreaterThanOrEqual(meta.startOffset);
};
```

### 3. Test Data Factories

**Mock Data Creation**:
```typescript
export const createMockStatement = (
  id: number,
  parent?: number,
  children: number[][] = []
): ICodeStatement => ({
  id,
  parent,
  children,
  fragments: [],
  isLeaf: children.length === 0,
  meta: createMockMetadata(id)
});
```

## Future Testing Enhancements

### 1. Planned Improvements

**Error Recovery Testing**:
- Comprehensive error recovery validation
- Malformed fragment syntax testing
- Unmatched brace/parentheses handling
- Invalid timer format testing

**Advanced Feature Testing**:
- Nested block syntax support
- Complex workout structure validation
- Cross-referencing and anchor testing
- Performance optimization validation

### 2. Test Coverage Expansion

**Additional Test Areas**:
- **Edge Cases**: Unicode handling, special characters, very large inputs
- **Integration**: End-to-end workout execution scenarios
- **Regression**: Known issue prevention and fix validation
- **Security**: Input sanitization and injection prevention

### 3. Test Automation

**Continuous Integration**:
- Automated test execution on code changes
- Performance regression detection
- Code coverage reporting and monitoring
- Test result analysis and reporting

## Conclusion

The WOD script parser unit testing architecture demonstrates a comprehensive approach to language parser validation. The testing strategy encompasses:

1. **Architectural Testing**: Validation of parser components and their interactions
2. **Functional Testing**: End-to-end parsing scenario validation
3. **Performance Testing**: Speed and efficiency requirements validation
4. **Error Testing**: Resilience and recovery capability validation
5. **Type Safety**: TypeScript type system integration validation

The testing infrastructure provides a solid foundation for parser development, maintenance, and enhancement. Future improvements should focus on expanding error recovery testing, adding support for advanced language features, and enhancing test automation capabilities.

This testing approach ensures the reliability, performance, and correctness of the WOD scripting language parser, supporting the development of robust workout definition and execution systems.
