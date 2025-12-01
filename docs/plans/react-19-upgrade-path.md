# React 19 Upgrade Path for WOD Wiki

## Executive Summary

This document outlines the comprehensive upgrade path from React 18.2.0 to React 19.x for the WOD Wiki project. The upgrade is motivated by the need to use `react-native-tvos@0.82.x` in the TV subproject, which requires React 19.

**Risk Level: Medium-High**  
**Estimated Effort: 2-4 days**  
**Testing Coverage Required: High**

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [React 19 Breaking Changes](#react-19-breaking-changes)
3. [Dependency Compatibility Analysis](#dependency-compatibility-analysis)
4. [Code Patterns at Risk](#code-patterns-at-risk)
5. [Step-by-Step Upgrade Plan](#step-by-step-upgrade-plan)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### Root Project (`wod-wiki`)

| Package | Current Version | Notes |
|---------|-----------------|-------|
| `react` | ^18.0.0 | peerDependency & devDependency |
| `react-dom` | ^18.0.0 | peerDependency & devDependency |
| `@types/react` | Not specified | Implicit from dependencies |

### TV Subproject (`wod-wiki-tv`)

| Package | Current Version | Target Version | Notes |
|---------|-----------------|----------------|-------|
| `react` | 18.2.0 | 19.1.0 | Fixed version |
| `react-native` | npm:react-native-tvos@0.82.1-0 | Keep | Requires React 19 |
| `@types/react` | ^18.0.24 | ^19.0.0 | Must upgrade |
| `react-test-renderer` | 18.2.0 | 19.1.0 | Must upgrade |

---

## React 19 Breaking Changes

### High Risk for WOD Wiki

#### 1. **`propTypes` and `defaultProps` for Functions Removed**
React 19 removes `propTypes` validation and `defaultProps` for function components.

**Impact**: Search codebase for `*.propTypes` and `*.defaultProps` patterns.

**Migration**:
```typescript
// Before (React 18)
function Component({ value }) { ... }
Component.defaultProps = { value: 'default' };

// After (React 19)
function Component({ value = 'default' }) { ... }
```

#### 2. **`ref` Cleanup Functions**
Ref callbacks can now return cleanup functions. TypeScript will reject implicit returns.

**Impact**: Any ref callback using implicit arrow returns.

**Migration**:
```typescript
// Before (causes TypeScript error in React 19)
<div ref={current => (instance = current)} />

// After
<div ref={current => { instance = current }} />
```

#### 3. **`useRef` Requires Argument**
`useRef()` without argument now causes TypeScript error.

**Impact**: All `useRef<T>()` calls without initial value.

**Migration**:
```typescript
// Before
const ref = useRef<HTMLDivElement>();

// After
const ref = useRef<HTMLDivElement>(null);
```

#### 4. **`ReactDOM.render` Removed**
`ReactDOM.render()` is completely removed. Must use `createRoot()`.

**Impact**: Any legacy render calls in tests or entry points.

**Migration**:
```typescript
// Before
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// After
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<App />);
```

#### 5. **`react-test-renderer` Deprecated**
React 19 deprecates `react-test-renderer` with a warning.

**Impact**: TV project uses `react-test-renderer@18.2.0`.

**Migration**: Consider migrating to `@testing-library/react-native`.

#### 6. **`act()` Import Changed**
`act` must be imported from `'react'` instead of `'react-dom/test-utils'`.

**Impact**: Test files using `act` from `react-dom/test-utils`.

**Migration**:
```typescript
// Before
import { act } from 'react-dom/test-utils';

// After
import { act } from 'react';
```

### Medium Risk

#### 7. **Error Handling Changes**
Errors in render are no longer re-thrown. Custom error handlers can be added to `createRoot`.

**Impact**: Error boundary behavior may change; error logging patterns.

#### 8. **JSX Namespace Changes**
Global `JSX` namespace removed; must use `React.JSX`.

**Impact**: Any TypeScript code extending JSX namespace.

**Migration**:
```typescript
// Before
declare namespace JSX {
  interface IntrinsicElements { ... }
}

// After
declare module "react" {
  namespace JSX {
    interface IntrinsicElements { ... }
  }
}
```

#### 9. **`useReducer` Typing Changes**
`useReducer` no longer accepts full reducer type as type parameter.

**Impact**: Explicit `useReducer<Reducer<State, Action>>` calls.

**Migration**:
```typescript
// Before
useReducer<React.Reducer<State, Action>>(reducer)

// After - let TypeScript infer, or:
useReducer<State, [Action]>(reducer)
```

### Low Risk (Improvements)

- `ref` as a prop (no more `forwardRef` needed)
- `<Context>` as provider (no more `<Context.Provider>`)
- New hooks: `useActionState`, `useOptimistic`, `useFormStatus`
- New `use()` API for reading promises/context

---

## Dependency Compatibility Analysis

### ✅ Compatible (Confirmed or Highly Likely)

| Dependency | Version | React 19 Status |
|------------|---------|-----------------|
| `@monaco-editor/react` | ^4.6.0/^4.7.0 | ✅ Use `@next` tag (`npm install @monaco-editor/react@next`) |
| `@storybook/react-vite` | ^10.1.2 | ✅ Storybook 10 supports React 19 |
| `@testing-library/react` | ^16.3.0 | ✅ Supports React 19 |
| `recharts` | ^3.4.1 | ✅ Uses `react-is`, compatible |
| `@radix-ui/react-*` | ^1.1.x | ✅ Radix UI supports React 19 |
| `@headlessui/react` | ^2.2.9 | ✅ Headless UI supports React 19 |
| `lucide-react` | ^0.545.0 | ✅ Compatible |
| `cmdk` | ^1.1.1 | ✅ Compatible |
| `class-variance-authority` | ^0.7.1 | ✅ No React peer dependency |
| `tailwind-merge` | ^3.3.1 | ✅ No React peer dependency |
| `clsx` | ^2.1.1 | ✅ No React peer dependency |
| `chevrotain` | ^11.0.3 | ✅ No React dependency |
| `uuid` | ^13.0.0 | ✅ No React dependency |
| `rxjs` | ^7.8.2 | ✅ No React dependency |
| `react-markdown` | ^10.1.0 | ✅ Should support React 19 |
| `vitest` | ^3.2.4 | ✅ No React peer dependency |
| `playwright` | ^1.56.1 | ✅ No React dependency |

### ⚠️ Requires Verification

| Dependency | Version | Concern |
|------------|---------|---------|
| `prop-types` | ^15.8.1 | React 19 ignores propTypes; may cause console warnings |
| `@vitejs/plugin-react` | ^4.3.1 | Should work, but verify JSX transform |

### TV Project Dependencies

| Dependency | Version | React 19 Status |
|------------|---------|-----------------|
| `react-native-tvos` | 0.82.1-0 | ✅ Requires React 19 |
| `@react-navigation/*` | ^7.0.0 | ✅ Navigation 7 supports React 19 |
| `react-native-screens` | ^4.0.0 | ✅ Should be compatible |
| `react-native-safe-area-context` | ^5.0.0 | ✅ Should be compatible |
| `react-native-ble-plx` | ^3.1.0 | ⚠️ Verify compatibility |

---

## Code Patterns at Risk

### Automated Detection Commands

Run these commands to identify potential issues:

```powershell
# Find defaultProps usage
grep -r "\.defaultProps" --include="*.tsx" --include="*.ts" src/

# Find propTypes usage
grep -r "\.propTypes" --include="*.tsx" --include="*.ts" src/

# Find useRef without arguments
grep -r "useRef<" --include="*.tsx" --include="*.ts" src/ | grep -v "useRef<.*>(.*)"

# Find implicit ref callback returns
grep -r "ref={.*=>.*(" --include="*.tsx" src/

# Find ReactDOM.render
grep -r "ReactDOM\.render" --include="*.tsx" --include="*.ts" src/ tests/

# Find act imports from react-dom/test-utils
grep -r "from 'react-dom/test-utils'" --include="*.tsx" --include="*.ts" tests/

# Find string refs (rare, but check)
grep -r 'ref="' --include="*.tsx" src/
```

### Expected Issues in WOD Wiki

Based on project structure, likely issues:

1. **Storybook Stories**: May use patterns that need updating
2. **Test Files**: May import `act` from wrong location
3. **Monaco Editor Integration**: Custom widgets may use refs
4. **Runtime Blocks**: May have TypeScript ref typing issues

---

## Step-by-Step Upgrade Plan

### Phase 1: Preparation (Day 1 Morning)

#### 1.1 Create Upgrade Branch
```bash
git checkout -b feat/react-19-upgrade
git push -u origin feat/react-19-upgrade
```

#### 1.2 Run React 18.3 First (Recommended by React Team)
```json
// package.json - temporarily update to 18.3 first
"devDependencies": {
  "react": "^18.3.0",
  "react-dom": "^18.3.0"
}
```

```bash
npm install
npm run test
npm run storybook
```

React 18.3 adds deprecation warnings for APIs removed in React 19. Fix all warnings before proceeding.

#### 1.3 Run React Codemods
```bash
# From project root
npx codemod@latest react/19/migration-recipe

# TypeScript-specific codemods
npx types-react-codemod@latest preset-19 ./src
npx types-react-codemod@latest preset-19 ./tests
npx types-react-codemod@latest preset-19 ./stories
```

### Phase 2: Root Project Upgrade (Day 1 Afternoon)

#### 2.1 Update package.json
```json
{
  "peerDependencies": {
    "@monaco-editor/react": "^4.6.0 || ^4.7.0",
    "monaco-editor": "^0.44.0 || ^0.45.0 || ^0.46.0 || ^0.47.0 || ^0.48.0 || ^0.49.0 || ^0.50.0",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

#### 2.2 Update Monaco Editor
```bash
npm install @monaco-editor/react@next
```

#### 2.3 Clean Install
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

#### 2.4 Fix Compilation Errors
Address TypeScript errors one by one:
- `useRef` argument issues
- Ref callback implicit returns
- JSX namespace issues

### Phase 3: TV Project Upgrade (Day 2 Morning)

#### 3.1 Update tv/package.json
```json
{
  "dependencies": {
    "react": "19.1.0",
    "react-native": "npm:react-native-tvos@0.82.1-0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-test-renderer": "^19.0.0",
    "react-test-renderer": "19.1.0"
  }
}
```

#### 3.2 Clean Install TV Project
```bash
cd tv
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
cd ..
```

#### 3.3 Test TV Project
```bash
cd tv
npm run android  # Test Android TV build
npm start        # Test Metro bundler
```

### Phase 4: Validation (Day 2 Afternoon - Day 3)

#### 4.1 Run Full Test Suite
```bash
npm run test
npm run test:storybook
npm run test:e2e
```

#### 4.2 Storybook Validation
```bash
npm run storybook
# Manually test all critical stories:
# - Clock > Default
# - Runtime Test Bench
# - Monaco Editor stories
```

#### 4.3 Build Validation
```bash
npm run build-storybook
# Wait for full build completion (~30 seconds)
```

### Phase 5: Documentation and PR (Day 3-4)

#### 5.1 Update Documentation
- Update README if React version requirements change
- Update AGENTS.md if workflow changes
- Document any breaking changes for consumers

#### 5.2 Create PR
```bash
git add .
git commit -m "feat: upgrade to React 19 for react-native-tvos 0.82 support"
git push
```

---

## Testing Strategy

### Critical Test Areas

| Area | Test Type | Priority |
|------|-----------|----------|
| Monaco Editor | Manual | High |
| Runtime Stack | Unit | High |
| JIT Compiler | Unit | High |
| Clock Components | Unit + Visual | High |
| Exercise Typeahead | Manual | Medium |
| Fragment Components | Visual | Medium |
| TV App Launch | Manual | High |

### Automated Tests Baseline

Before upgrade:
```bash
npm run test
# Expected: ~45 passed, 1 failed, 4 module errors
```

After upgrade:
```bash
npm run test
# Goal: Same or better baseline
```

### Manual Test Checklist

- [ ] Storybook loads at http://localhost:6006
- [ ] Clock > Default story renders correctly
- [ ] Monaco editor accepts input
- [ ] Exercise typeahead shows suggestions
- [ ] Runtime Test Bench executes workouts
- [ ] F10 step debugging works
- [ ] No console errors/warnings about React 19

---

## Rollback Plan

### If Upgrade Fails

#### Immediate Rollback
```bash
git checkout main
git branch -D feat/react-19-upgrade
```

#### Partial Rollback (Keep TV on React 19)
If root project issues are severe but TV project works:

1. Keep TV project on React 19
2. Keep root project on React 18
3. Ensure projects don't share node_modules

Add to `tv/.npmrc`:
```
legacy-peer-deps=true
```

### Alternative: Downgrade react-native-tvos

If React 19 upgrade is too risky:
```json
// tv/package.json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "npm:react-native-tvos@0.76.9-0"
  }
}
```

See [react-native-tvos-dependency-conflict.md](./react-native-tvos-dependency-conflict.md) for details.

---

## Risk Summary Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TypeScript errors | High | Medium | Run codemods, fix incrementally |
| Dependency incompatibility | Low | High | Check each before upgrade |
| Test failures | Medium | Medium | Run 18.3 first for warnings |
| Storybook issues | Low | Medium | Storybook 10 supports R19 |
| Monaco editor issues | Medium | High | Use @next tag |
| TV app crashes | Medium | High | Test thoroughly on device |
| Runtime behavior changes | Low | High | Comprehensive testing |

---

## Resources

### Official Documentation
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [react-native-tvos Releases](https://github.com/react-native-tvos/react-native-tvos/releases)

### Codemods
- [react-codemod](https://github.com/reactjs/react-codemod)
- [types-react-codemod](https://github.com/eps1lon/types-react-codemod/)

### Community Resources
- [React 19 Migration Issues](https://github.com/facebook/react/issues?q=is%3Aissue+label%3A%22React+19%22)

---

## Decision Point

After reviewing this document, choose one of:

| Option | When to Choose | Action |
|--------|----------------|--------|
| **Proceed with React 19** | Need latest react-native-tvos features, have time for testing | Follow this upgrade path |
| **Stay on React 18** | Risk tolerance is low, TV features not critical | Use [react-native-tvos@0.76.9-0](./react-native-tvos-dependency-conflict.md#option-a) |
| **Hybrid approach** | Want to test React 19 in isolation | Upgrade TV only with `--legacy-peer-deps` |

**Recommended**: If you have 2-4 days available and comprehensive test coverage, proceed with React 19 upgrade following this guide.
