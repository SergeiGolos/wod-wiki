# Test Naming Conventions

This document defines naming conventions for test files in the WOD Wiki project.

## General Principles

1. **Use descriptive names** that clearly indicate what is being validated
2. **Use kebab-case** for all test filenames
3. **No suffix indicators** - the directory structure indicates test type (unit, integration, etc.)
4. **Group related tests** in subfolders when appropriate

## Directory Structure

```
tests/
├── language-compilation/     # Parser and AST generation tests
├── jit-compilation/          # Strategy and block compilation tests
├── runtime-execution/        # Runtime state management tests
│   ├── stack/               # RuntimeStack lifecycle
│   ├── blocks/              # Block implementations
│   ├── behaviors/           # Behavior implementations
│   ├── memory/              # Memory allocation and references
│   ├── events/              # Event system
│   └── workflows/           # Integration workflows
├── metrics-recording/        # Metric collection and emission
├── performance/             # Performance benchmarks (deferred)
└── e2e/                     # Playwright browser tests
```

## Naming Patterns

### Language Compilation Tests

- `parser-integration.test.ts` - Parser integration with runtime
- `statement-ids.test.ts` - Statement ID validation
- `wod-script-parsing.test.ts` - WodScript parsing logic
- `parser-error-recovery.test.ts` - Error recovery behavior

### JIT Compilation Tests

- `strategy-precedence.test.ts` - Strategy precedence order validation
- `strategy-matching.test.ts` - Strategy matching logic
- `block-compilation.test.ts` - Block creation from statements
- `fragment-compilation.test.ts` - Fragment → MetricValue transformation

### Runtime Execution Tests

**Stack:**
- `stack-api.test.ts` - RuntimeStack API contract
- `stack-disposal.test.ts` - Block disposal and cleanup
- `stack-edge-cases.test.ts` - Edge cases and boundary conditions

**Blocks:**
- `{block-name}-lifecycle.test.ts` - Block lifecycle (mount/next/dispose)
- Example: `timer-block-lifecycle.test.ts`, `effort-block-lifecycle.test.ts`

**Behaviors:**
- `{behavior-name}.test.ts` - Behavior implementation
- Example: `completion-behavior.test.ts`, `timer-behavior.test.ts`

**Memory:**
- `block-context.test.ts` - BlockContext lifecycle and memory management
- `memory-reference.test.ts` - Memory reference interface
- `anchor-subscriptions.test.ts` - Anchor-based subscription model

**Events:**
- `{event-name}.test.ts` - Event class and handler
- Example: `next-event.test.ts`, `next-event-handler.test.ts`

**Workflows:**
- `{workflow-name}-workflow.test.ts` - Integration workflow
- Example: `next-button-workflow.test.ts`, `runtime-hooks.test.ts`

**Top-level:**
- `orchestration.test.ts` - ScriptRuntime orchestration
- `actions.test.ts` - Runtime actions (Push, Pop, EmitMetric)

### Metrics Recording Tests

- `metric-collector.test.ts` - MetricCollector implementation
- `metric-inheritance.test.ts` - Metric inheritance across blocks
- `metric-emission.test.ts` - Metric emission actions

### Performance Tests

- `{component-name}-performance.test.ts` - Performance benchmarks
- Example: `stack-performance.test.ts`

## Placeholder Tests

Tests marked as TODO should include:

```typescript
/**
 * {Test Category} Tests
 * 
 * TODO: Implement {description of what needs testing}
 * - Bullet point of specific test case
 * - Another test case
 */

import { describe, it, expect } from 'vitest';

describe('{Test Category}', () => {
  it.todo('should {description of test case}');
  it.todo('should {description of another test case}');
});
```

## Anti-Patterns to Avoid

❌ **Don't use suffix indicators:**
- `~parser.contract.test.ts~` → Use `parser-integration.test.ts`
- `~block.unit.test.ts~` → Use `block-compilation.test.ts`

❌ **Don't use implementation file names:**
- `~timer.parser.test.ts~` → Use `parser-integration.test.ts`
- `~JitCompiler.test.ts~` → Use `strategy-precedence.test.ts`

❌ **Don't mix concerns:**
- Tests should validate ONE concern (language, JIT, runtime, or metrics)
- Integration tests belong in `workflows/` subfolder

## Test IDs

Legacy tests may include test IDs (e.g., `TSP-001`, `TSC-001`, `TBC-001`). These can be preserved for traceability but are not required for new tests.

## Running Tests

- `npm test` - Run all unit tests (language, JIT, runtime, metrics)
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:ui` - Run Storybook and Playwright UI tests
- `npm run test:perf` - Run performance benchmarks
- `npm run test:e2e` - Run Playwright end-to-end tests
