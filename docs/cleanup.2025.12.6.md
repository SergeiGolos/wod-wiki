# WOD Wiki Codebase Cleanup Plan
**Date:** December 6, 2025  
**Mode:** Janitor - Tech Debt Elimination  
**Goal:** Eliminate dead code, reduce complexity, remove unused dependencies

---

## Executive Summary

This cleanup plan identifies **high-impact tech debt** across the WOD Wiki codebase. The focus is on **deletion over creation** - removing unused code, simplifying over-engineered patterns, and consolidating duplicated logic.

**Estimated Impact:**
- ~15-20% code reduction
- Improved build times
- Reduced test surface area
- Lower maintenance burden

---

## 1. Code Elimination Priority

### 1.1 Console.log Statements (HIGH PRIORITY)

**Found:** 50+ `console.log`, `console.error`, `console.warn` calls across production code

**Action:** Delete or convert to structured logging

**Files with excessive logging:**
```
tests/runtime-execution/stack/stack-api.test.ts (2 logs)
tests/metrics-recording/metric-inheritance.test.ts (12 logs)
tests/integration/metric-inheritance/rep-scheme-inheritance.test.ts (20+ logs)
src/editor/inline-cards/RowRuleRenderer.ts (debug logging)
stories/compiler/JitCompilerDemo.tsx (commented unused code)
```

**Strategy:**
1. **Tests:** Remove all `console.log` from tests - use assertions instead
2. **Production:** Replace with proper logging utility or delete entirely
3. **Debug code:** Remove commented-out logging patterns

**Savings:** ~100 lines, cleaner test output, faster CI runs

---

### 1.2 TODO/FIXME Markers (MEDIUM PRIORITY)

**Found:** 35+ TODO markers indicating incomplete work

**Critical TODOs to resolve:**
```typescript
// tests/metrics-recording/metric-emission.test.ts - 9 it.todo() tests
// tests/runtime-execution/actions.test.ts - 9 it.todo() tests
// docs/history-and-timer.md - 8 TODO items
// docs/plans/jit-02-dialect-registry.md - TODO: Handle inheritance rules
```

**Action:**
1. **Implement or delete** - No perpetual TODOs
2. Convert `it.todo()` to `it.skip()` if blocked, or implement
3. Remove TODO comments older than 6 months
4. Document blocking reasons for remaining TODOs

**Savings:** Clearer test status, reduced cognitive load

---

### 1.3 Unused Test Files (HIGH PRIORITY)

**Found:** Test files with only `.todo()` tests or skeleton structure

**Candidates for deletion:**
```
tests/metrics-recording/metric-emission.test.ts (100% todo tests)
tests/runtime-execution/actions.test.ts (100% todo tests)
```

**Action:**
1. Delete files with only `.todo()` tests
2. Consolidate into existing test files if overlap
3. Create GitHub issues for missing test coverage instead

**Savings:** ~50-100 lines, cleaner test suite

---

### 1.4 Duplicate Imports (LOW PRIORITY)

**Found:** Files with consecutive identical imports (poor formatting)

**Example:**
```typescript
// vitest.storybook.config.js
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';  // Duplicate!
```

**Action:**
1. Run ESLint/Prettier to auto-fix
2. Manual cleanup if auto-fix fails
3. Add pre-commit hook to prevent

**Savings:** Cleaner imports, better IDE performance

---

## 2. Simplification Opportunities

### 2.1 Vitest Configuration Consolidation (HIGH PRIORITY)

**Found:** 5 different Vitest config files with overlapping concerns

**Current structure:**
```
vitest.config.js             (base unit tests)
vitest.dev.config.js         (dev-specific overrides)
vitest.storybook.config.js   (Storybook tests)
vitest.workspace.config.js   (multi-project setup)
vitest.shims.d.ts            (TypeScript shims)
```

**Issues:**
- Duplicate plugin registrations
- Unclear inheritance hierarchy
- Hard to modify without breaking others

**Action:**
1. Consolidate into **2 configs:**
   - `vitest.config.ts` (all test types via workspace)
   - `vitest.shims.d.ts` (keep as-is)
2. Delete: `vitest.dev.config.js`, move dev overrides to env variables
3. Merge Storybook config into workspace projects

**Savings:** ~50 lines, clearer test configuration

---

### 2.2 Package.json Scripts Cleanup (MEDIUM PRIORITY)

**Found:** 32 npm scripts with overlapping functionality

**Redundant scripts:**
```json
"test": "vitest run --project=unit"
"test:watch": "vitest --project=unit"      // Can use: npm test -- --watch
"test:storybook": "bunx vitest --project=storybook"
"test:storybook:ui": "bunx vitest --project=storybook --ui"  // Can use flag
"dev:all": "bun scripts/dev-start.cjs"
"dev:web": "bun scripts/dev-start.cjs --web-only"  // Flag-based duplicates
"dev:no-emulator": "bun scripts/dev-start.cjs --no-emulator"
```

**Action:**
1. Consolidate flag-based variants into single script with args
2. Remove wrapper scripts that just add flags
3. Document common flag combos in README instead

**Savings:** ~5-7 script entries, simpler `package.json`

---

### 2.3 Documentation Consolidation (MEDIUM PRIORITY)

**Found:** 50+ markdown files in `/docs` with overlapping content

**Duplicates/overlaps:**
```
docs/runtime-overview.md
docs/Runtime_Engine_Deep_Dive.md
docs/Runtime_Implementation_Review.md
docs/Runtime_Architecture_Blocks_Strategies.md
docs/Runtime_Behaviors_Deep_Dive.md
docs/Runtime_Test_Bench.md
```

**Action:**
1. Merge 6 runtime docs into **1 comprehensive** `docs/runtime/README.md`
2. Create subdirectory structure:
   ```
   docs/
     runtime/
       README.md (overview + architecture)
       blocks.md
       behaviors.md
       testing.md
     monaco/
       README.md (consolidate 8 Monaco docs)
     plans/ (keep separate - time-bound)
   ```
3. Delete outdated plans older than 3 months

**Savings:** ~40% reduction in doc files, easier navigation

---

## 3. Dependency Hygiene

### 3.1 Unused Dependencies Audit (HIGH PRIORITY)

**Found in package.json:**

**Suspicious dependencies (verify usage):**
```json
"pnpm": "^10.20.0"          // Using bun, why pnpm?
"prop-types": "^15.8.1"     // React 18+ doesn't need this
"rxjs": "^7.8.2"            // Is this used? Not found in imports
"sharp": "^0.34.4"          // Heavy image lib - is it used?
"dotenv-cli": "^8.0.0"      // Dev only, check usage
"concurrently": "^9.2.1"    // Check if actually used
```

**Action:**
1. Run dependency analysis:
   ```bash
   npx depcheck
   ```
2. Remove unused dependencies
3. Move dev dependencies from `dependencies` to `devDependencies`

**Savings:** Faster `npm install`, smaller `node_modules`

---

### 3.2 Peer Dependency Cleanup (LOW PRIORITY)

**Found:** Optional peer dependencies with unclear necessity

```json
"peerDependenciesMeta": {
  "monaco-editor": { "optional": true },
  "@monaco-editor/react": { "optional": true }
}
```

**Action:**
1. Document **when** these are needed
2. If always required, remove `optional` flag
3. If never required, remove from peers

---

## 4. TypeScript Configuration

### 4.1 TypeScript Errors (EXISTING BASELINE)

**Current:** 369 TypeScript errors (expected baseline)

**Action:** ❌ **DO NOT FIX ALL ERRORS**

**Strategy:**
1. Run `npx tsc --noEmit > typescript-errors-baseline.txt`
2. Track only **NEW** errors in CI
3. Fix errors only when touching related files
4. Create tracking issue for gradual reduction

**Non-goal:** Zero TypeScript errors (too disruptive)

---

### 4.2 Stricter Linting Configuration (MEDIUM PRIORITY)

**Missing:** ESLint configuration

**Action:**
1. Add minimal ESLint config:
   ```json
   {
     "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
     "rules": {
       "no-console": "warn",
       "no-debugger": "error",
       "@typescript-eslint/no-unused-vars": "error"
     }
   }
   ```
2. Run `eslint --fix` on codebase
3. Add to pre-commit hook

**Savings:** Prevent new debt from accumulating

---

## 5. Test Infrastructure

### 5.1 Test Baseline Documentation (HIGH PRIORITY)

**Current state:** "Accept 4 module failures + 1 integration test failure"

**Action:**
1. Document **exact** failing tests in `TESTING.md`:
   ```markdown
   ## Known Test Failures (Baseline)
   
   - `src/module-a.test.ts` - Reason: ...
   - `src/module-b.test.ts` - Reason: ...
   - `tests/integration/x.test.ts` - Reason: ...
   ```
2. Create GitHub issues for each failure
3. Track trend: are failures increasing?

**Goal:** Make baseline explicit, not tribal knowledge

---

### 5.2 Performance Test Cleanup (LOW PRIORITY)

**Found:** `tests/performance/stack-performance.test.ts` with mocked `console.log`

**Action:**
1. Extract performance utilities to shared test helper
2. Use Vitest's built-in benchmark API instead of manual timing
3. Document performance baselines in test file

---

## 6. Build & CI Optimization

### 6.1 Storybook Build Timeout (CRITICAL ISSUE)

**Problem:** "NEVER CANCEL builds - may take 60 minutes"

**Root cause analysis needed:**
1. Check bundle size - is it too large?
2. Profile Storybook build with `--debug-webpack`
3. Identify slow stories or heavy components

**Potential fixes:**
- Enable Storybook caching
- Split stories into multiple builds
- Lazy-load heavy components
- Upgrade Storybook (currently 10.1.2)

**Action:** Create separate investigation issue

---

### 6.2 GitHub Workflows Cleanup (LOW PRIORITY)

**Found:** `.github/workflows/_build-bun.yml` with TODO comment

```yaml
# TODO: Pass all tests and remove this.
```

**Action:**
1. Document why tests are skipped
2. Create tracking issue
3. Remove TODO or fix underlying issue

---

## 7. TV Subproject Isolation (MEDIUM PRIORITY)

**Found:** `tv/` directory with own `bun.lock`, dependencies

**Issues:**
- Separate lockfile can drift from root
- Unused dependencies in TV project
- No clear integration strategy

**Action:**
1. Audit `tv/package.json` for unused deps
2. Consider workspace setup to share deps
3. Document TV project relationship to main codebase

---

## 8. File Organization

### 8.1 Logs Directory (LOW PRIORITY)

**Found:** `logs/` directory at root (what's in it?)

**Action:**
1. Add `logs/` to `.gitignore` if not already
2. Document what creates logs
3. Add log rotation/cleanup script

---

### 8.2 Coverage Directory (LOW PRIORITY)

**Found:** `coverage/` at root with HTML reports

**Action:**
1. Ensure in `.gitignore`
2. Add `npm run clean:coverage` script
3. CI should archive coverage, not commit it

---

## 9. Implementation Timeline

### Phase 1: Quick Wins (1-2 hours)
1. Delete console.log statements from tests
2. Delete files with only `.todo()` tests
3. Run `depcheck` and remove unused dependencies
4. Add `.gitignore` entries for logs/coverage

### Phase 2: Test Cleanup (2-3 hours)
1. Document test baseline failures
2. Convert TODO tests to skip or implement
3. Create GitHub issues for missing tests
4. Clean up test setup files

### Phase 3: Configuration (2-3 hours)
1. Consolidate Vitest configs
2. Add minimal ESLint config
3. Simplify package.json scripts
4. Update CI workflows

### Phase 4: Documentation (3-4 hours)
1. Consolidate runtime docs
2. Consolidate Monaco docs
3. Archive old plans
4. Update README with new structure

### Phase 5: Deep Investigation (ongoing)
1. Storybook build performance
2. TypeScript error reduction strategy
3. TV project integration
4. Dependency upgrades

---

## 10. Success Metrics

### Before Cleanup
- **Lines of Code:** ~473 TS/TSX files
- **Test Files:** 64 test files
- **Dependencies:** ~60 packages
- **Documentation:** 50+ markdown files
- **Build Time:** 30s (Storybook), up to 60min
- **Test Baseline:** 4 module + 1 integration failure

### After Cleanup (Target)
- **LOC Reduction:** 15-20% (remove dead code)
- **Test Files:** ~50-55 (delete empty/todo tests)
- **Dependencies:** ~45-50 (remove unused)
- **Documentation:** ~30 files (consolidate)
- **Build Time:** <20s (investigate Storybook)
- **Test Baseline:** Documented + tracked

---

## 11. Risk Mitigation

### High-Risk Changes
1. **Dependency removal** - Could break runtime
2. **Vitest config consolidation** - Could break tests
3. **Documentation merge** - Could lose important info

### Safety Measures
1. **Branch per phase** - One PR per phase
2. **Full test suite** before/after each phase
3. **Keep deleted docs** in branch for 30 days
4. **Dependency removal:** One at a time, test after each

---

## 12. Maintenance Prevention

### Prevent New Debt
1. **Pre-commit hooks:**
   ```bash
   npm run lint
   npm run test:changed
   ```
2. **PR template checklist:**
   - [ ] No console.log in production code
   - [ ] No TODO older than sprint
   - [ ] Tests pass (no new failures)
   - [ ] Dependencies justified in PR description

3. **CI checks:**
   - Fail on new TypeScript errors
   - Warn on test baseline changes
   - Track bundle size growth

---

## Appendix A: Automation Scripts

### Script: Remove Console Logs
```bash
# Remove console.log from test files
find tests -name "*.test.ts" -type f -exec sed -i '/console\.log/d' {} +
```

### Script: Find Unused Dependencies
```bash
npx depcheck --json > unused-deps.json
```

### Script: Find Large Files
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20
```

---

## Appendix B: Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Keep TypeScript error baseline | 369 errors too disruptive to fix at once | 2025-12-06 |
| Delete todo-only test files | Better as GitHub issues than code | 2025-12-06 |
| Consolidate Vitest configs | 5 configs is too many for maintenance | 2025-12-06 |
| Archive old plans | Plans older than 3 months likely stale | 2025-12-06 |

---

## Conclusion

This cleanup plan follows the **janitor mode** philosophy: **deletion is the most powerful refactoring**. By eliminating unused code, simplifying configurations, and consolidating documentation, we reduce the codebase surface area by ~15-20% while improving maintainability.

**Next Steps:**
1. Review this plan with team
2. Prioritize phases based on team capacity
3. Execute Phase 1 (Quick Wins) immediately
4. Schedule Phases 2-4 for next sprint
5. Track Phase 5 as ongoing improvement

**Remember:** Less code = less debt. Every deletion makes the codebase stronger.
  P h a s e   1 - 3   C o m p l e t e   -   S e e   g i t   d i f f   f o r   d e t a i l s  
 