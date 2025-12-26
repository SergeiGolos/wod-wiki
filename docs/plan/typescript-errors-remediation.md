# TypeScript Errors Remediation Plan

**Generated**: 2025-12-26  
**Total Errors**: 495  
**Files Affected**: ~80

---

## Summary Table

| # | Error Type | Count | Ease | Impact | Risk | Description |
|---|------------|-------|------|--------|------|-------------|
| 1 | TS6133 - Unused variables | 129 | 1 | 🟢 Low | 🟢 Low | Declared but never read |
| 2 | TS2307 - Module not found | 84 | 2 | 🔴 High | 🟡 Medium | Import path issues |
| 3 | TS2345 - Type mismatch | 40 | 3 | 🟡 Medium | 🟡 Medium | Argument type incompatible |
| 4 | TS2322 - Type not assignable | 38 | 3 | 🟡 Medium | 🟡 Medium | Assignment type mismatch |
| 5 | TS2769 - No overload matches | 33 | 3 | 🟡 Medium | 🟡 Medium | Function call signature |
| 6 | TS7006 - Implicit any | 32 | 2 | 🟡 Medium | 🟢 Low | Parameter missing type |
| 7 | TS2339 - Property not found | 29 | 3 | 🟡 Medium | 🟡 Medium | Missing interface member |
| 8 | TS2353 - Object literal | 26 | 2 | 🟡 Medium | 🟢 Low | Unknown property in object |
| 9 | TS2554 - Expected arguments | 19 | 2 | 🟡 Medium | 🟢 Low | Wrong argument count |
| 10 | TS2308 - Duplicate export | 16 | 1 | 🟢 Low | 🟢 Low | Re-export conflicts |
| 11 | Other | 49 | 3 | 🟡 Medium | 🟡 Medium | Mixed issues |

---

## Errors by Directory

| Directory | Errors | Category |
|-----------|--------|----------|
| `tests/` (combined) | 155 | Test infrastructure |
| `src/runtime/` | 93 | Core runtime |
| `src/editor/` | 69 | Editor components |
| `src/components/` | 37 | UI components |
| `src/runtime-test-bench/` | 28 | Debug tooling |
| `src/core/` | 28 | Core types |
| `stories/` | 34 | Storybook |
| Other | 51 | Mixed |

---

## Phase 1: Quick Wins (Est. 2-3 hours)

### 1.1 TS6133 - Unused Variables (129 errors)

**Ease**: 1 | **Impact**: 🟢 Low | **Risk**: 🟢 Low

**Pattern**: Variables declared but never used. Fix with underscore prefix or removal.

**Top Files**:
- `src/editor/WodWikiSyntaxInitializer.tsx` - 8 unused params
- `src/editor/inline-cards/RowBasedCardManager.ts` - 8 unused imports
- `src/editor/inline-cards/rule-generators/WodBlockRuleGenerator.ts` - 5 unused vars

**Implementation**:
```bash
# Find all TS6133 errors
cat /tmp/tsc-output.txt | grep "TS6133" | head -50

# For each file:
# 1. Remove unused imports
# 2. Prefix unused params with underscore: (event) → (_event)
# 3. Remove unused local variables
```

**Example Fixes**:
```typescript
// Before
import { CardContent, RowRule, HeadingContent } from './types';
const handler = (event) => { ... };

// After  
import { CardContent } from './types';
const handler = (_event) => { ... };
```

### 1.2 TS2308 - Duplicate Exports (16 errors)

**Ease**: 1 | **Impact**: 🟢 Low | **Risk**: 🟢 Low

**Location**: `src/editor/inline-cards/index.ts`

**Issue**: Re-exporting same names from multiple modules.

**Fix**: Use explicit re-exports or consolidate type definitions.

```typescript
// Before
export * from './types';
export * from './parsers'; // Also exports CardContent, etc.

// After
export type { CardContent, CardType } from './types';
export { parseCards } from './parsers';
```

---

## Phase 2: Module Resolution (Est. 3-4 hours)

### 2.1 TS2307 - Module Not Found (84 errors)

**Ease**: 2 | **Impact**: 🔴 High | **Risk**: 🟡 Medium

**Categories**:

#### A. Missing Files (Create or Remove Import)
```
src/editor/index.ts(1,15): Cannot find module './editor-entry'
src/index.ts(31,15): Cannot find module './types'
src/components/layout/WodWorkbench.tsx: Cannot find '../../views/runtime/RuntimeLayout'
```

**Fix**: Either create missing files or remove dead imports.

#### B. Core Types Circular Import (28 errors in `src/core/types/`)
```
src/core/types/clock.ts: Cannot find '../runtime/ScriptRuntime'
src/core/types/core.ts: Cannot find '../core/models/CodeMetadata'
src/core/types/runtime.ts: Cannot find '../runtime/IScriptRuntime'
```

**Issue**: `src/core/types/` imports from `src/runtime/` creating circular dependency.

**Fix Options**:
1. Move type definitions to shared location
2. Use `import type` to break circular dependency
3. Restructure exports to avoid cycles

#### C. Monaco Worker Imports (5 errors)
```
src/markdown-editor/utils/monacoLoader.ts: Cannot find 'monaco-editor/esm/vs/editor/editor.worker?worker'
```

**Fix**: Add Vite worker import declarations:
```typescript
// src/vite-env.d.ts or vitest.shims.d.ts
declare module '*?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
```

### 2.2 TS7016 - Missing Declaration (3 errors)

**Ease**: 1 | **Impact**: 🟢 Low | **Risk**: 🟢 Low

**Location**: `src/editor/inline-cards/RowRuleRenderer.ts`

**Issue**: `react-dom/client` missing types.

**Fix**: 
```bash
bun add -d @types/react-dom
```

---

## Phase 3: Type Mismatches (Est. 4-5 hours)

### 3.1 TS2345 - Argument Type Incompatible (40 errors)

**Ease**: 3 | **Impact**: 🟡 Medium | **Risk**: 🟡 Medium

**Categories**:

#### A. Test Mock Types
```
tests/performance/stack-performance.test.ts: 'PerformanceTestBlock' not assignable to 'IRuntimeBlock'
tests/harness/BehaviorTestHarness.ts: search criteria type mismatch
```

**Fix**: Update test mocks to implement full interface or use type assertions:
```typescript
// Option 1: Implement interface fully
class PerformanceTestBlock implements IRuntimeBlock { ... }

// Option 2: Use type assertion
const block = createMockBlock() as unknown as IRuntimeBlock;
```

#### B. Enum Value Mismatches
```
tests/jit-compilation/fragment-compilation.test.ts: '"or"' not assignable to 'GroupType'
```

**Fix**: Use enum values instead of strings:
```typescript
// Before
{ groupType: 'or' }
// After
{ groupType: GroupType.OR }
```

### 3.2 TS2322 - Type Not Assignable (38 errors)

**Ease**: 3 | **Impact**: 🟡 Medium | **Risk**: 🟡 Medium

**Categories**:

#### A. BlockKey String Mismatch (10 errors in runtime-selectors.test.ts)
```
Type 'string' is not assignable to type 'BlockKey'
```

**Fix**: Use BlockKey constructor:
```typescript
// Before
key: 'block-1'
// After
key: new BlockKey('block-1')
```

#### B. Nullable Types
```
Type 'number | null' is not assignable to type 'number'
Type 'undefined' is not assignable to type 'string'
```

**Fix**: Add null checks or update type signatures.

### 3.3 TS7006 - Implicit Any (32 errors)

**Ease**: 2 | **Impact**: 🟡 Medium | **Risk**: 🟢 Low

**Location**: Mostly in Monaco Editor callbacks

**Pattern**:
```typescript
// Before
provideCompletionItems: (model, position, context, token) => { ... }

// After
provideCompletionItems: (
  model: editor.ITextModel,
  position: Position,
  context: languages.CompletionContext,
  token: CancellationToken
) => { ... }
```

---

## Phase 4: Interface & Object Errors (Est. 2-3 hours)

### 4.1 TS2339 - Property Does Not Exist (29 errors)

**Ease**: 3 | **Impact**: 🟡 Medium | **Risk**: 🟡 Medium

**Pattern**: Accessing properties not defined in interface.

**Fix Options**:
1. Add property to interface
2. Use type guards
3. Use optional chaining with fallback

### 4.2 TS2353 - Object Literal Properties (26 errors)

**Ease**: 2 | **Impact**: 🟡 Medium | **Risk**: 🟢 Low

**Pattern**: Extra properties in object literals.

**Fix**: Remove unknown properties or extend interface.

### 4.3 TS2769 - No Overload Matches (33 errors)

**Ease**: 3 | **Impact**: 🟡 Medium | **Risk**: 🟡 Medium

**Location**: Mostly React component props and test assertions.

**Fix**: Match component prop types exactly or update component signatures.

---

## Implementation Order

| Priority | Phase | Errors | Time |
|----------|-------|--------|------|
| 1 | Phase 1: Quick Wins | 145 | 2-3 hrs |
| 2 | Phase 2: Module Resolution | 87 | 3-4 hrs |
| 3 | Phase 3: Type Mismatches | 110 | 4-5 hrs |
| 4 | Phase 4: Interface Errors | 88 | 2-3 hrs |
| | **Total** | **495** | **11-15 hrs** |

---

## Top 10 Files to Fix First

| # | File | Errors | Phase |
|---|------|--------|-------|
| 1 | `tests/runtime-execution/stack/stack-api.test.ts` | 34 | 3 |
| 2 | `tests/performance/stack-performance.test.ts` | 31 | 3 |
| 3 | `src/editor/WodWikiSyntaxInitializer.tsx` | 23 | 1+3 |
| 4 | `src/runtime-test-bench/selectors/runtime-selectors.test.ts` | 19 | 3 |
| 5 | `src/runtime/strategies/__tests__/EffortStrategy.test.ts` | 18 | 3 |
| 6 | `tests/runtime-execution/stack/stack-edge-cases.test.ts` | 17 | 3 |
| 7 | `tests/jit-compilation/fragment-compilation.test.ts` | 17 | 3 |
| 8 | `stories/components/WodScriptVisualizer.stories.tsx` | 17 | 4 |
| 9 | `stories/runtime/Crossfit.stories.tsx` | 16 | 4 |
| 10 | `src/runtime/behaviors/__tests__/IBehavior.test.ts` | 12 | 3 |

---

## Verification

```bash
# Run TypeScript check
bun x tsc --noEmit

# Count remaining errors
bun x tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Target: 0 errors
```

---

## CI Enforcement

After reaching zero errors, add to CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: TypeScript Check
  run: bun x tsc --noEmit
```

---

## Notes

1. **Test files account for ~155 errors (31%)** - Focus on production code first if time-constrained
2. **Storybook files have 34 errors** - Lower priority for CI
3. **Core runtime has 93 errors** - High priority for production stability
4. **Many errors are interconnected** - Fixing module resolution (Phase 2) may resolve cascading errors

