# Technical Debt Remediation Plan

**Generated**: 2025-12-26  
**Updated**: 2025-12-26  
**Project**: WOD Wiki v0.5.0  
**Analysis Scope**: Full codebase (46,246 LOC across 351 source files)

---

## Summary Table

| #   | Issue                  | Ease | Impact    | Risk      | Status | Description                                      |
| --- | ---------------------- | ---- | --------- | --------- | ------ | ------------------------------------------------ |
| 1   | TypeScript Errors      | 3    | 🔴 High   | 🔴 High   | Open   | 508 type errors prevent strict compilation       |
| 2   | ~~Console Statements~~ | 1    | 🟡 Medium | 🟡 Medium | ✅ Done | ~~198~~ → 38 statements (31 console.error kept)  |
| 3   | TODO/FIXME Markers     | 2    | 🟡 Medium | 🟡 Medium | Open   | 26+ incomplete implementations tracked           |
| 4   | Test Coverage Gap      | 3    | 🔴 High   | 🟡 Medium | Open   | ~13% test ratio (6,331 test LOC / 46,246 source) |
| 5   | `any` Type Usage       | 2    | 🟡 Medium | 🟡 Medium | Open   | 101 files contain `any` type annotations         |
| 6   | Large File Complexity  | 3    | 🟡 Medium | 🟢 Low    | Open   | 8 files exceed 500 lines                         |
| 7   | Missing Chore Template | 1    | 🟢 Low    | 🟢 Low    | Open   | No `chore_request.yml` issue template            |
| 8   | ~~Class Components~~   | 2    | 🟢 Low    | 🟢 Low    | ✅ Done | ~~3 legacy class components remain~~ → 0 (all migrated) |
| 9   | Broken Doc Links       | 2    | 🟡 Medium | 🟢 Low    | Open   | 17 broken links in /docs directory               |

---

## Detailed Remediation Plans

### 1. TypeScript Errors (508 errors)

**Overview**: Strict TypeScript compilation fails with 508 errors across the codebase.

**Explanation**: Type mismatches, missing type annotations, and incompatible mock types prevent `tsc --noEmit` from passing. Key issues include:
- Mock type incompatibilities in `tests/setup.ts` (ResizeObserver, IntersectionObserver)
- Unused variable declarations (TS6133)
- Type assignment errors (TS2322)

**Requirements**:
- TypeScript 5.x knowledge
- Understanding of Vitest mock patterns

**Implementation Steps**:
1. Fix test setup mocks with proper type casting
2. Address unused variable warnings with `_` prefix or removal
3. Run `bun x tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | sort -rn` to prioritize by file
4. Target zero errors for CI enforcement

**Testing**: Run `bun x tsc --noEmit` - should exit with code 0

---

### 2. Console Statements ✅ COMPLETED

**Overview**: ~~Production code contained 198 console.log/warn/error statements.~~ Remediated on 2025-12-26.

**Resolution Summary**:
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Total** | 196 | 38 | -158 (-81%) |
| **console.log** | 109 | 6* | -103 |
| **console.warn** | 54 | 0 | -54 |
| **console.error** | 32 | 31 | -1 |
| **console.debug** | 1 | 1 | 0 |

*\*6 remaining console.log are in JSDoc comments (documentation examples)*

**What was kept**:
- `console.error` for error handling (31 statements)
- `console.debug` guarded by enableLogging/debugMode flags (1 statement)
- JSDoc examples in documentation (6 statements)

**Verification**: `grep -rn "console\." ./src --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v ".spec." | wc -l` returns 38

---

### 3. TODO/FIXME Markers (26+ items)

**Overview**: Codebase contains 26+ TODO/FIXME comments indicating incomplete work.

**Explanation**: Key incomplete areas:
- `RuntimeAdapter.ts`: 10 TODOs for metrics, highlighting, references, status detection
- `useRuntimeTestBench.ts`: 5 TODOs for execution logic, stepping
- `GroupStrategy.ts`: Full compile() implementation pending
- `LoopCoordinatorBehavior.ts`: Effort block child support pending

**Requirements**:
- Domain knowledge of runtime execution model

**Implementation Steps**:
1. Extract TODOs: `grep -rn "TODO\|FIXME" ./src --include="*.ts" --include="*.tsx"`
2. Create GitHub issues for each category (use `tasks.md` template)
3. Prioritize by component criticality
4. Address in sprints, removing markers when complete

**Testing**: Verify functionality after each TODO resolution

---

### 4. Test Coverage Gap (~13% ratio)

**Overview**: Test code represents only 13% of source code volume (6,331 / 46,246 lines).

**Explanation**: 
- 46 test files for 351 source files (~13% file coverage)
- 7 `__tests__` directories exist but coverage is uneven
- Runtime, parser, and editor modules have different coverage levels

**Requirements**:
- Test harness understanding (see `tests/harness/`)
- Vitest and Playwright knowledge

**Implementation Steps**:
1. Run `bun run test:coverage` to get baseline metrics
2. Identify untested critical paths: `src/runtime/`, `src/parser/`
3. Use existing `BehaviorTestHarness` and `RuntimeTestBuilder` patterns
4. Target 80% branch coverage for core runtime modules
5. Add integration tests for JIT compilation paths

**Testing**: Coverage report should show improvement after each batch

---

### 5. `any` Type Usage (101 files)

**Overview**: 101 source files contain explicit `any` type annotations.

**Explanation**: `any` bypasses TypeScript's type safety, allowing runtime errors that could be caught at compile time. Common in:
- Event handlers
- Third-party library integrations
- Complex generic patterns

**Requirements**:
- TypeScript generics proficiency
- Understanding of existing type system (`src/types/`)

**Implementation Steps**:
1. Identify files: `grep -rln ": any\|<any>\|as any" ./src --include="*.ts" --include="*.tsx"`
2. Replace with proper types, `unknown`, or generics
3. Use type guards for narrowing `unknown`
4. Add `no-explicit-any` ESLint rule when count reaches <10

**Testing**: `bun x tsc --noEmit` should pass

---

### 6. Large File Complexity (8 files >500 lines)

**Overview**: 8 source files exceed 500 lines, indicating potential SRP violations.

**Explanation**:
| File | Lines | Concern |
|------|-------|---------|
| `QueueTestHarness.tsx` | 836 | Test component complexity |
| `RowRuleRenderer.ts` | 827 | Editor rendering logic |
| `TestableRuntime.ts` | 791 | Test infrastructure |
| `StackedClockDisplay.tsx` | 682 | UI component size |
| `LoopCoordinatorBehavior.ts` | 523 | Behavior complexity |
| `UnifiedWorkbench.tsx` | 513 | Layout component |

**Requirements**:
- Component decomposition patterns
- React composition patterns

**Implementation Steps**:
1. Identify cohesive sub-components within large files
2. Extract hooks from components (e.g., `useStackedClock` from `StackedClockDisplay`)
3. Split behaviors into smaller, composable units
4. Apply barrel exports to maintain import compatibility

**Testing**: Storybook visual regression, unit tests should pass

---

### 7. Missing Chore Template

**Overview**: No `chore_request.yml` issue template exists for technical debt tracking.

**Explanation**: Current templates (implement, plan, specify, tasks) don't specifically address technical debt or maintenance work.

**Requirements**:
- GitHub Actions workflow familiarity

**Implementation Steps**:
1. Create `.github/ISSUE_TEMPLATE/chore_request.yml`:
```yaml
name: Chore Request
description: Technical debt or maintenance task
labels: ["chore", "tech-debt"]
body:
  - type: textarea
    id: description
    attributes:
      label: Description
      description: What needs to be improved?
    validations:
      required: true
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options:
        - Low
        - Medium
        - High
    validations:
      required: true
```
2. Add to template list in `config.yml`

**Testing**: Create test issue using new template

---

### 8. Class Components ✅ COMPLETED

**Overview**: ~~3 React class components remain in the codebase.~~ All React components have been migrated to functional components.

**Resolution Summary** (Completed 2025-12-26):
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **React Class Components** | 3 (estimated) | 0 | -3 (-100%) |

**Explanation**: Modern React favors functional components with hooks. Class components are harder to test, optimize, and compose. This migration was completed in prior work.

**Requirements**:
- React hooks migration patterns

**Implementation Steps** (Completed):
1. ✅ Identify: `grep -rn "React.Component\|extends Component" ./src --include="*.tsx"`
2. ✅ Convert to functional components with hooks
3. ✅ Replace lifecycle methods with useEffect
4. ✅ Convert state to useState/useReducer

**Verification**: 
- Command: `grep -rn "React.Component\|extends Component" ./src --include="*.tsx"` returns only TypeScript type utilities
- All `.tsx` files in `./src` use functional component patterns
- No class component patterns found in codebase

---

### 9. Broken Documentation Links (17 links)

**Overview**: 17 broken internal links in `/docs` directory.

**Explanation**: Documentation references non-existent files, impacting developer experience and wiki publishing.

**Requirements**:
- Understanding of docs structure

**Implementation Steps**:
1. Run `bun run docs:check` to get current broken links
2. Either create missing files or update references
3. Key missing targets:
   - `runtime-action-lifecycle.md`
   - `docs/generated/index.md`
   - Various `DOCUMENTATION_SUMMARY.md` references
4. Add docs:check to CI pipeline

**Testing**: `bun run docs:check` should exit with code 0

---

## Priority Matrix

| Priority | Issues | Rationale |
|----------|--------|-----------|
| **P0 - Critical** | TypeScript Errors | Blocks strict mode CI |
| **P1 - High** | Test Coverage, Console Statements | Quality and maintainability |
| **P2 - Medium** | TODOs, `any` Usage | Gradual improvement |
| **P3 - Low** | Large Files, Class Components, Templates, Doc Links | Incremental refactoring |

---

## Metrics Tracking

Track progress using these commands:

```bash
# TypeScript errors
bun x tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Console statements
grep -r "console\." ./src --include="*.ts" --include="*.tsx" | grep -v test | wc -l

# TODO markers
grep -r "TODO\|FIXME" ./src --include="*.ts" --include="*.tsx" | wc -l

# any usage
grep -r ": any\|<any>\|as any" ./src --include="*.ts" --include="*.tsx" | wc -l

# Test count
bun run test 2>&1 | grep -E "^\s*[0-9]+ pass"
```

---

*Document generated by technical debt analysis. Review and update quarterly.*
