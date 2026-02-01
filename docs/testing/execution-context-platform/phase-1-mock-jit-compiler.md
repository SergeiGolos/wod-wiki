# Phase 1: MockJitCompiler Implementation

**Duration**: 30 minutes  
**Priority**: High  
**Dependencies**: None

## Overview

Create a `MockJitCompiler` that extends the real `JitCompiler` to record all compilation calls and allow test authors to define specific block responses for given statements. This enables precise control over what blocks are returned during test execution without requiring full script parsing.

## Goals

- ✅ Extend `JitCompiler` with call recording
- ✅ Support predicate-based block matching
- ✅ Provide convenient text-based matchers
- ✅ Maintain compatibility with real JitCompiler API
- ✅ Enable assertion on compilation history

## File Structure

```
tests/harness/
├── MockJitCompiler.ts              # NEW - Main implementation
└── __tests__/
    └── MockJitCompiler.test.ts     # NEW - Unit tests
```

## Technical Specification

### 1. Core Types

```typescript
/**
 * Record of a single compile() call
 */
interface CompileCall {
  statements: CodeStatement[];
  runtime: IScriptRuntime;
  timestamp: Date;
  result: IRuntimeBlock | undefined;
}

/**
 * Predicate-based matcher for statements
 */
interface BlockMatcher {
  predicate: (statements: CodeStatement[], runtime: IScriptRuntime) => boolean;
  blockOrFactory: IRuntimeBlock | ((statements: CodeStatement[], runtime: IScriptRuntime) => IRuntimeBlock);
  priority?: number; // Higher priority evaluated first
}
```

### 2. MockJitCompiler Class

```typescript
export class MockJitCompiler extends JitCompiler {
  private _compileCalls: CompileCall[] = [];
  private _matchers: BlockMatcher[] = [];
  private _defaultBlock?: IRuntimeBlock;

  constructor(strategies: IRuntimeBlockStrategy[] = [], dialectRegistry?: DialectRegistry) {
    super(strategies, dialectRegistry);
  }

  /**
   * Override compile to record and optionally return matched block
   */
  compile(statements: CodeStatement[], runtime: IScriptRuntime): IRuntimeBlock | undefined {
    const startTime = new Date();
    let result: IRuntimeBlock | undefined;

    // Check matchers in priority order
    const sortedMatchers = [...this._matchers].sort((a, b) => 
      (b.priority ?? 0) - (a.priority ?? 0)
    );

    for (const matcher of sortedMatchers) {
      if (matcher.predicate(statements, runtime)) {
        result = typeof matcher.blockOrFactory === 'function'
          ? matcher.blockOrFactory(statements, runtime)
          : matcher.blockOrFactory;
        break;
      }
    }

    // Fallback to default or parent compilation
    if (!result) {
      result = this._defaultBlock ?? super.compile(statements, runtime);
    }

    // Record the call
    this._compileCalls.push({
      statements: [...statements],
      runtime,
      timestamp: startTime,
      result
    });

    return result;
  }

  // Configuration API
  whenMatches(
    predicate: (statements: CodeStatement[], runtime: IScriptRuntime) => boolean,
    blockOrFactory: IRuntimeBlock | ((statements: CodeStatement[], runtime: IScriptRuntime) => IRuntimeBlock),
    priority?: number
  ): this {
    this._matchers.push({ predicate, blockOrFactory, priority });
    return this;
  }

  whenTextContains(
    text: string,
    blockOrFactory: IRuntimeBlock | ((statements: CodeStatement[], runtime: IScriptRuntime) => IRuntimeBlock),
    priority?: number
  ): this {
    return this.whenMatches(
      (statements) => statements.some(s => 
        JSON.stringify(s).toLowerCase().includes(text.toLowerCase())
      ),
      blockOrFactory,
      priority
    );
  }

  withDefaultBlock(block: IRuntimeBlock): this {
    this._defaultBlock = block;
    return this;
  }

  // Assertion API
  get compileCalls(): readonly CompileCall[] {
    return [...this._compileCalls];
  }

  get lastCompileCall(): CompileCall | undefined {
    return this._compileCalls[this._compileCalls.length - 1];
  }

  clearCalls(): void {
    this._compileCalls = [];
  }

  // Convenience assertions
  wasCompiled(predicate: (call: CompileCall) => boolean): boolean {
    return this._compileCalls.some(predicate);
  }

  getCompiledStatementIds(): number[] {
    return this._compileCalls.flatMap(call => call.statements.map(s => s.id));
  }
}
```

## Implementation Steps

### Step 1: Create MockJitCompiler.ts (15 min)

1. Create file: `tests/harness/MockJitCompiler.ts`
2. Import dependencies:
   - `JitCompiler` from `@/runtime/compiler/JitCompiler`
   - `CodeStatement` from `@/core/models/CodeStatement`
   - `IScriptRuntime`, `IRuntimeBlock` from `@/runtime/contracts`
   - `DialectRegistry` from `@/services/DialectRegistry`
   - `IRuntimeBlockStrategy` from `@/runtime/contracts`
3. Define interfaces: `CompileCall`, `BlockMatcher`
4. Implement `MockJitCompiler` class extending `JitCompiler`
5. Implement `compile()` override with recording logic
6. Implement configuration methods: `whenMatches()`, `whenTextContains()`, `withDefaultBlock()`
7. Implement assertion methods: getters and helper functions
8. Add comprehensive JSDoc comments for all public methods

### Step 2: Create Unit Tests (15 min)

1. Create file: `tests/harness/__tests__/MockJitCompiler.test.ts`
2. Set up test structure with describe blocks
3. Test scenarios:
   - **Basic recording**: Verify compileCalls are recorded
   - **Predicate matching**: Test whenMatches() with custom predicates
   - **Text matching**: Test whenTextContains() convenience method
   - **Priority ordering**: Verify higher priority matchers evaluated first
   - **Default fallback**: Test withDefaultBlock() and super.compile() fallback
   - **Factory functions**: Test dynamic block creation via factory
   - **Call clearing**: Test clearCalls() resets state
   - **Assertion helpers**: Test wasCompiled() and getCompiledStatementIds()

### Test Structure Example

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { MockJitCompiler } from '@/testing/harness/MockJitCompiler';
import { MockBlock } from '@/testing/harness/MockBlock';
import { CodeStatement } from '@/core/models/CodeStatement';
import { TimerFragment } from '@/runtime/compiler/fragments/TimerFragment';

describe('MockJitCompiler', () => {
  let mockJit: MockJitCompiler;
  let mockRuntime: any;

  beforeEach(() => {
    mockJit = new MockJitCompiler();
    mockRuntime = { 
      stack: {}, 
      memory: {}, 
      clock: { now: new Date() } 
    };
  });

  describe('Call Recording', () => {
    it('should record all compile calls with timestamps', () => {
      const statement = new CodeStatement({
        id: 1,
        fragments: [new TimerFragment(600000, 'down')],
        children: [],
        meta: undefined
      });

      mockJit.compile([statement], mockRuntime);
      mockJit.compile([statement], mockRuntime);

      expect(mockJit.compileCalls).toHaveLength(2);
      expect(mockJit.compileCalls[0].statements).toHaveLength(1);
      expect(mockJit.compileCalls[0].timestamp).toBeInstanceOf(Date);
      expect(mockJit.compileCalls[0].runtime).toBe(mockRuntime);
    });

    it('should track the last compile call', () => {
      const statement1 = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      const statement2 = new CodeStatement({ id: 2, fragments: [], children: [], meta: undefined });

      mockJit.compile([statement1], mockRuntime);
      mockJit.compile([statement2], mockRuntime);

      expect(mockJit.lastCompileCall?.statements[0].id).toBe(2);
    });

    it('should return undefined for lastCompileCall when no calls made', () => {
      expect(mockJit.lastCompileCall).toBeUndefined();
    });
  });

  describe('Predicate Matching', () => {
    it('should return matched block when predicate matches', () => {
      const timerBlock = new MockBlock('timer-test', []);
      
      mockJit.whenMatches(
        (stmts) => stmts.some(s => s.fragments.some(f => f.fragmentType === 'timer')),
        timerBlock
      );

      const timerStatement = new CodeStatement({
        id: 1,
        fragments: [new TimerFragment(600000, 'down')],
        children: [],
        meta: undefined
      });

      const result = mockJit.compile([timerStatement], mockRuntime);

      expect(result).toBe(timerBlock);
    });

    it('should use first matching predicate (priority order)', () => {
      const block1 = new MockBlock('block-1', []);
      const block2 = new MockBlock('block-2', []);
      
      mockJit.whenMatches(() => true, block1, 10); // Lower priority
      mockJit.whenMatches(() => true, block2, 20); // Higher priority

      const result = mockJit.compile([], mockRuntime);

      expect(result).toBe(block2); // Higher priority wins
    });

    it('should fall through to next matcher if predicate does not match', () => {
      const block1 = new MockBlock('block-1', []);
      const block2 = new MockBlock('block-2', []);
      
      mockJit.whenMatches((stmts) => stmts.length > 5, block1);
      mockJit.whenMatches((stmts) => stmts.length > 0, block2);

      const statement = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      const result = mockJit.compile([statement], mockRuntime);

      expect(result).toBe(block2); // First matcher fails, second succeeds
    });

    it('should pass both statements and runtime to predicate', () => {
      let capturedStatements: any;
      let capturedRuntime: any;

      mockJit.whenMatches((stmts, rt) => {
        capturedStatements = stmts;
        capturedRuntime = rt;
        return true;
      }, new MockBlock('test', []));

      const statement = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      mockJit.compile([statement], mockRuntime);

      expect(capturedStatements).toEqual([statement]);
      expect(capturedRuntime).toBe(mockRuntime);
    });
  });

  describe('Text Matching', () => {
    it('should match statements containing text (case insensitive)', () => {
      const timerBlock = new MockBlock('timer', []);
      
      mockJit.whenTextContains('10:00', timerBlock);

      const statement = new CodeStatement({
        id: 1,
        fragments: [new TimerFragment(600000, 'down')], // Will serialize with "10:00"
        children: [],
        meta: undefined
      });

      const result = mockJit.compile([statement], mockRuntime);

      expect(result).toBe(timerBlock);
    });

    it('should handle text matching with priority', () => {
      const block1 = new MockBlock('block-1', []);
      const block2 = new MockBlock('block-2', []);
      
      mockJit.whenTextContains('timer', block1, 10);
      mockJit.whenTextContains('timer', block2, 20);

      const statement = new CodeStatement({
        id: 1,
        fragments: [new TimerFragment(600000, 'down')],
        children: [],
        meta: undefined
      });

      const result = mockJit.compile([statement], mockRuntime);

      expect(result).toBe(block2); // Higher priority wins
    });

    it('should not match when text not present', () => {
      const timerBlock = new MockBlock('timer', []);
      
      mockJit.whenTextContains('not-present-text', timerBlock);

      const statement = new CodeStatement({
        id: 1,
        fragments: [],
        children: [],
        meta: undefined
      });

      const result = mockJit.compile([statement], mockRuntime);

      expect(result).not.toBe(timerBlock);
    });
  });

  describe('Factory Functions', () => {
    it('should call factory to create blocks dynamically', () => {
      let callCount = 0;

      mockJit.whenMatches(
        () => true,
        (stmts, runtime) => {
          callCount++;
          return new MockBlock(`dynamic-${callCount}`, []);
        }
      );

      mockJit.compile([], mockRuntime);
      mockJit.compile([], mockRuntime);

      expect(callCount).toBe(2);
      expect(mockJit.compileCalls[0].result?.key.toString()).toContain('dynamic-1');
      expect(mockJit.compileCalls[1].result?.key.toString()).toContain('dynamic-2');
    });

    it('should pass statements and runtime to factory', () => {
      let capturedStatements: any;
      let capturedRuntime: any;

      mockJit.whenMatches(
        () => true,
        (stmts, rt) => {
          capturedStatements = stmts;
          capturedRuntime = rt;
          return new MockBlock('test', []);
        }
      );

      const statement = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      mockJit.compile([statement], mockRuntime);

      expect(capturedStatements).toEqual([statement]);
      expect(capturedRuntime).toBe(mockRuntime);
    });
  });

  describe('Default Fallback', () => {
    it('should use default block when no matchers match', () => {
      const defaultBlock = new MockBlock('default', []);
      mockJit.withDefaultBlock(defaultBlock);

      mockJit.whenMatches(() => false, new MockBlock('never-matches', []));

      const result = mockJit.compile([], mockRuntime);

      expect(result).toBe(defaultBlock);
    });

    it('should call parent compile when no default and no matchers', () => {
      // Parent compile with no strategies should return undefined
      const result = mockJit.compile([], mockRuntime);

      expect(result).toBeUndefined();
      expect(mockJit.compileCalls).toHaveLength(1);
    });
  });

  describe('Assertion Helpers', () => {
    it('should detect if statement was compiled', () => {
      const statement1 = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      const statement2 = new CodeStatement({ id: 2, fragments: [], children: [], meta: undefined });
      
      mockJit.compile([statement1], mockRuntime);
      mockJit.compile([statement2], mockRuntime);

      expect(mockJit.wasCompiled(call => call.statements.some(s => s.id === 1))).toBe(true);
      expect(mockJit.wasCompiled(call => call.statements.some(s => s.id === 99))).toBe(false);
    });

    it('should extract all compiled statement IDs', () => {
      const statement1 = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      const statement2 = new CodeStatement({ id: 2, fragments: [], children: [], meta: undefined });
      const statement3 = new CodeStatement({ id: 3, fragments: [], children: [], meta: undefined });
      
      mockJit.compile([statement1, statement2], mockRuntime);
      mockJit.compile([statement3], mockRuntime);

      expect(mockJit.getCompiledStatementIds()).toEqual([1, 2, 3]);
    });

    it('should return empty array for getCompiledStatementIds when no calls', () => {
      expect(mockJit.getCompiledStatementIds()).toEqual([]);
    });
  });

  describe('Clearing State', () => {
    it('should clear all recorded calls', () => {
      const statement = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      
      mockJit.compile([statement], mockRuntime);
      expect(mockJit.compileCalls).toHaveLength(1);

      mockJit.clearCalls();
      
      expect(mockJit.compileCalls).toHaveLength(0);
      expect(mockJit.lastCompileCall).toBeUndefined();
    });

    it('should not clear matchers when clearing calls', () => {
      const block = new MockBlock('test', []);
      mockJit.whenMatches(() => true, block);

      const statement = new CodeStatement({ id: 1, fragments: [], children: [], meta: undefined });
      mockJit.compile([statement], mockRuntime);
      mockJit.clearCalls();

      // Matchers should still work
      const result = mockJit.compile([statement], mockRuntime);
      expect(result).toBe(block);
    });
  });

  describe('Fluent API', () => {
    it('should support method chaining', () => {
      const block1 = new MockBlock('block-1', []);
      const block2 = new MockBlock('block-2', []);
      const defaultBlock = new MockBlock('default', []);

      const result = mockJit
        .whenMatches(() => false, block1)
        .whenTextContains('test', block2)
        .withDefaultBlock(defaultBlock);

      expect(result).toBe(mockJit);
    });
  });
});
```

## Acceptance Criteria

- ✅ `MockJitCompiler` extends `JitCompiler` correctly
- ✅ All `compile()` calls are recorded with timestamp
- ✅ Predicate matching works with custom functions
- ✅ Text matching provides convenient API
- ✅ Priority ordering determines which matcher executes first
- ✅ Factory functions can create blocks dynamically
- ✅ Default block fallback works when no matcher succeeds
- ✅ Parent `super.compile()` called when no default set
- ✅ Assertion helpers (`wasCompiled`, `getCompiledStatementIds`) work correctly
- ✅ `clearCalls()` resets state between tests
- ✅ All unit tests pass (14+ test cases)
- ✅ No TypeScript errors
- ✅ Fluent API supports method chaining

## Integration Notes

- **Existing Code**: Extends `JitCompiler` from [src/runtime/compiler/JitCompiler.ts](../../../src/runtime/compiler/JitCompiler.ts)
- **Reused Patterns**: Similar recording pattern to `TestableRuntime`'s operation tracking
- **Reused Components**: Uses existing `MockBlock` from test harness
- **Next Phase**: Will be integrated into `ExecutionContextTestHarness` in Phase 2

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Matcher predicates too slow | Keep predicates simple; add performance test if needed |
| Memory from recorded calls | Provide `clearCalls()` and document cleanup in tests |
| TypeScript type complexity | Use explicit types; avoid excessive generics |
| Predicate order confusion | Document priority system clearly; add examples |
| Matcher evaluation overhead | Sort matchers once, evaluate in order |

## Example Usage (Preview)

```typescript
import { MockJitCompiler } from '@/testing/harness';
import { MockBlock } from '@/testing/harness';
import { TimerBehavior } from '@/runtime/behaviors';

// Create mock JIT with pre-configured responses
const mockJit = new MockJitCompiler();

// Register a timer block for any timer-like statements
mockJit.whenTextContains('10:00', 
  new MockBlock('timer-10', [new TimerBehavior({ 
    direction: 'down', 
    durationMs: 600000 
  })])
);

// Register effort blocks using a factory
mockJit.whenMatches(
  (stmts) => stmts.some(s => s.fragments.some(f => f.fragmentType === 'effort')),
  (stmts, runtime) => new MockBlock(`effort-${stmts[0].id}`, [/* behaviors */])
);

// Use in runtime
const runtime = new ScriptRuntime(script, mockJit, dependencies);

// Trigger compilation via action
runtime.do(new CompileAndPushBlockAction([1, 2, 3]));

// After execution, inspect compilation history
console.log('Compile calls:', mockJit.compileCalls.length);
console.log('Statement IDs:', mockJit.getCompiledStatementIds());
console.log('Last result:', mockJit.lastCompileCall?.result?.blockType);

// Verify specific compilation occurred
expect(mockJit.wasCompiled(call => call.statements.length === 3)).toBe(true);

// Clear for next test
mockJit.clearCalls();
```

## Performance Considerations

- **Recording overhead**: Shallow copy of statements array (~1-5ms per compile)
- **Matcher evaluation**: Linear search through matchers (negligible for <10 matchers)
- **Memory usage**: Each CompileCall ~1-2KB (not a concern for typical test suites)
- **Cleanup**: Always call `clearCalls()` in `beforeEach()` or `afterEach()`

## Completion Checklist

- [x] `src/testing/harness/MockJitCompiler.ts` created with all methods
- [x] All interfaces exported: `CompileCall`, `BlockMatcher`
- [x] Unit test file created: `src/testing/harness/__tests__/MockJitCompiler.test.ts`
- [x] 14+ test cases covering all functionality (21 tests)
- [x] All tests pass: `bun test src/testing/harness/__tests__/MockJitCompiler.test.ts --preload ./tests/unit-setup.ts`
- [x] No TypeScript errors in MockJitCompiler: `bun x tsc --noEmit`
- [x] JSDoc comments added to all public methods
- [x] Example usage documented in this file
- [x] Fluent API verified (method chaining)
- [x] Integration pattern documented for next phase

## Related Files

- **Extends**: [src/runtime/compiler/JitCompiler.ts](../../../src/runtime/compiler/JitCompiler.ts)
- **Uses**: [src/testing/harness/MockBlock.ts](../../../src/testing/harness/MockBlock.ts)
- **Pattern Reference**: [src/testing/testable/TestableRuntime.ts](../../../src/testing/testable/TestableRuntime.ts)
- **Implementation**: [src/testing/harness/MockJitCompiler.ts](../../../src/testing/harness/MockJitCompiler.ts)
- **Tests**: [src/testing/harness/__tests__/MockJitCompiler.test.ts](../../../src/testing/harness/__tests__/MockJitCompiler.test.ts)

---

**Status**: ✅ Completed (2025-02-01)  
**Next Phase**: [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md)
