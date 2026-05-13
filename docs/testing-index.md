# Testing Documentation Index

This document provides an overview of all testing documentation and guides for the WOD Wiki project.

## 📚 Documentation Suite

The testing documentation is organized into five comprehensive guides:

### 1. [Component Testing Guidelines](./component-testing-guidelines.md)
**Core testing philosophy and standards**

- Testing philosophy (quality over quantity)
- Test harness selection guide
- Testing patterns with examples
- Test structure conventions
- Assertion guidelines
- Anti-patterns to avoid
- Coverage goals

**Best for**: Understanding project testing standards and patterns

### 2. [Test Templates](./test-templates.md)
**Ready-to-use templates for common scenarios**

- Behavior unit test template
- Component integration test template
- Strategy/JIT test template
- Event handler test template
- Memory management test template
- React component test template
- Storybook interaction test template

**Best for**: Starting new tests quickly with proven patterns

### 3. [Storybook Testing Guide](./storybook-testing.md)
**Storybook integration test patterns**

- Storybook testing philosophy
- Story structure standards
- Interaction testing patterns
- Common testing scenarios
- Accessibility testing
- Visual regression testing

**Best for**: Component integration testing and Storybook stories

### 4. [PR Testing Checklist](./pr-testing-checklist.md)
**Quality gate for pull requests**

- Pre-merge checklist
- Multi-layer validation protocol
- Anti-patterns to reject
- Type safety validation
- E2E requirements
- Security considerations
- Quick reference commands

**Best for**: Code review and PR validation

### 5. [TDD Workflow Guide](./tdd-workflow-guide.md)
**Test-Driven Development process**

- Red-Green-Refactor cycle
- Roles and responsibilities
- Step-by-step workflow
- Common TDD patterns
- Troubleshooting guide
- Best practices

**Best for**: Understanding TDD process and collaboration

## 🎯 Quick Start Guides

### For Unit Test Engineers

Start here when writing tests:

1. **New behavior?** → [Test Templates → Behavior Unit Test](./test-templates.md#behavior-unit-test-template)
2. **New strategy?** → [Test Templates → Strategy/JIT Test](./test-templates.md#strategyjit-test-template)
3. **Need TDD refresher?** → [TDD Workflow Guide](./tdd-workflow-guide.md)
4. **Reviewing PR?** → [PR Testing Checklist](./pr-testing-checklist.md)

### For Core Developers

Start here when implementing features:

1. **Received failing tests?** → [TDD Workflow → GREEN Phase](./tdd-workflow-guide.md#phase-2-green-)
2. **Need to refactor?** → [TDD Workflow → REFACTOR Phase](./tdd-workflow-guide.md#phase-3-refactor-)
3. **Adding component?** → [Storybook Testing Guide](./storybook-testing.md)
4. **Submitting PR?** → [PR Testing Checklist](./pr-testing-checklist.md)

### For Code Reviewers

Start here when reviewing PRs:

1. **Reviewing tests?** → [PR Testing Checklist → Test Quality](./pr-testing-checklist.md#test-quality-validation)
2. **Checking coverage?** → [Component Testing → Coverage Goals](./component-testing-guidelines.md#coverage-goals)
3. **Validating patterns?** → [Component Testing → Anti-Patterns](./component-testing-guidelines.md#anti-patterns-to-avoid)
4. **Approving merge?** → [PR Testing Checklist → Final Checks](./pr-testing-checklist.md#before-merge-final-checks)

## 🧪 Test Harness Quick Reference

### BehaviorTestHarness

**Use for**: Testing individual behaviors in isolation

```typescript
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

const harness = new BehaviorTestHarness()
  .withClock(new Date('2024-01-01T12:00:00Z'));

const block = new MockBlock('test', [new YourBehavior()]);
harness.push(block);
harness.mount();
```

**Key methods**:
- `harness.push(block)` - Push block to stack
- `harness.mount()` - Mount current block
- `harness.next()` - Call next() on block
- `harness.unmount()` - Unmount and dispose
- `harness.advanceClock(ms)` - Advance mock clock
- `harness.simulateEvent(name, data)` - Dispatch event
- `harness.wasEventEmitted(name)` - Check event emission

### ExecutionContextTestHarness

**Use for**: Testing execution context and strategy interactions

```typescript
import { ExecutionContextTestBuilder } from '@/testing/harness';

const harness = new ExecutionContextTestBuilder()
  .withClock(new Date('2024-01-01T12:00:00Z'))
  .withMaxDepth(20)
  .build();
```

**Key features**:
- Real event bus integration
- Action execution tracking
- JIT compilation testing
- Strategy validation

### Factory Functions

**Use for**: Quick setup of common scenarios

```typescript
import {
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
  createBasicTestHarness,
} from '@/testing/harness';
```

## 📋 Testing Workflow

### Standard TDD Cycle

```
1. RED 🔴
   └─ Unit Test Engineer writes failing tests
   └─ Tests validate requirements
   └─ Tests actually fail (not tautological)

2. GREEN 🟢
   └─ Core Developer implements code
   └─ Makes all tests pass
   └─ Minimal implementation

3. REFACTOR 🔵
   └─ Collaborative improvement
   └─ Keep tests green
   └─ No behavior changes
```

### Multi-Layer Validation

Every test must pass 5 layers of validation:

1. **Syntax**: Tests compile without errors
2. **Logic**: Assertions are meaningful
3. **Execution**: Tests pass on good code, fail on bad
4. **Coverage**: Adequate code coverage
5. **Failure**: Tests can actually fail

## 🎓 Learning Path

### Beginner

1. Read [Component Testing Guidelines](./component-testing-guidelines.md)
2. Use [Test Templates](./test-templates.md) for first tests
3. Follow [TDD Workflow Guide](./tdd-workflow-guide.md) step-by-step

### Intermediate

1. Study [Storybook Testing Guide](./storybook-testing.md) patterns
2. Apply [PR Testing Checklist](./pr-testing-checklist.md) to reviews
3. Practice [TDD Workflow Guide](./tdd-workflow-guide.md) advanced patterns

### Advanced

1. Contribute new patterns to templates
2. Refactor test harness for new use cases
3. Mentor others on TDD practices
4. Improve documentation based on experience

## 🔧 Essential Commands

### Running Tests

```bash
# Unit tests
bun run test

# Component/integration tests
bun run test:components

# All tests
bun run test:all

# Watch mode
bun run test --watch

# Coverage report
bun run test:coverage
```

### Storybook

```bash
# Start Storybook
bun run storybook

# Build Storybook
bun run build-storybook

# Run Storybook tests
bun run test:storybook
```

### Type Checking

```bash
# Type check without emitting
bun x tsc --noEmit
```

## 📊 Coverage Goals

- **Line coverage**: >80%
- **Branch coverage**: >70%
- **Function coverage**: >85%
- **Critical paths**: 100%

**Remember**: Coverage without quality is failure.

## 🚨 Common Pitfalls

### ❌ Tautological Tests

```typescript
// BAD - Always passes
expect(result).toBe(result);

// GOOD - Meaningful assertion
expect(result).toBe(42);
```

### ❌ Testing Implementation

```typescript
// BAD - Tests structure
expect(component.items instanceof Array).toBe(true);

// GOOD - Tests behavior
expect(component.getItem(0)).toBe('first');
```

### ❌ Over-Mocking

```typescript
// BAD - Tests the mock
const mock = { process: mock() };
mock.process.mockReturnValue('test');

// GOOD - Tests real behavior
const service = new RealService();
```

## 🤝 Collaboration

### Between Unit Test Engineer and Core Developer

1. **Unit Test Engineer**: Write failing tests (RED)
2. **Core Developer**: Implement code (GREEN)
3. **Both**: Refactor together (REFACTOR)

### Communication

- Use clear test names to describe behavior
- Document complex test logic
- Comment edge cases and error conditions
- Pair on complex refactoring

## 📚 Additional Resources

### Internal Documentation

- [Runtime API Documentation](./runtime-api.md)
- [AGENTS.md → Unit Test Engineer](../AGENTS.md)
- [CLAUDE.md → Testing Guidelines](../CLAUDE.md)

### External Resources

- [Bun Test Documentation](https://bun.sh/docs/test)
- [Storybook Documentation](https://storybook.js.org/docs)
- [Testing Library](https://testing-library.com/docs/)

## 🔄 Keeping Documentation Current

This documentation should evolve with the project:

1. **Add new patterns** as they emerge
2. **Update templates** for new component types
3. **Refine guidelines** based on experience
4. **Fix errors** and clarify ambiguities

**Process**:
1. Identify gap or improvement
2. Draft change
3. Test with real scenarios
4. Submit PR with documentation update
5. Review and merge

---

**Last Updated**: 2025-01-12
**Maintained By**: Unit Test Engineer (wod-unit-tester)
**Version**: 1.0.0

For questions or improvements, please create an issue or PR referencing this documentation suite.
