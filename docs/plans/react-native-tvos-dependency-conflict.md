# React Native TVOS Dependency Conflict Resolution

## Problem Summary

When running `npm install` or `npm run dev:all` in the wod-wiki project, npm fails with the following error:

```
While resolving: wod-wiki-tv@0.0.1
npm error Found: react@18.2.0
npm error node_modules/react
npm error   react@"18.2.0" from the root project
npm error
npm error Could not resolve dependency:
npm error peer react@"^19.1.1" from react-native@0.82.1-0
npm error node_modules/react-native
npm error   react-native@"npm:react-native-tvos@0.82.1-0" from the root project
```

## Root Cause Analysis

### The Conflict

| Package | Location | React Version Required |
|---------|----------|----------------------|
| `wod-wiki` (root) | `/package.json` | React 18.2.0 |
| `wod-wiki-tv` | `/tv/package.json` | React 18.2.0 (explicit) |
| `react-native-tvos@0.82.1-0` | `/tv/package.json` | **React 19.1.1** (peer dependency) |

The issue is that `react-native-tvos@0.82.1-0` (the latest version) requires **React 19**, while both the root wod-wiki project and the tv subproject are configured for **React 18.2.0**.

### Why This Happened

React Native 0.82+ (released November 2024) upgraded its React peer dependency from React 18 to React 19. This is part of React Native's alignment with the latest React version.

---

## Solution Options

### Option A: Downgrade react-native-tvos to 0.76.x (Recommended for Stability)

**Pros:**
- ✅ Maintains React 18.2.0 compatibility across the entire project
- ✅ No changes needed to the main wod-wiki project
- ✅ 0.76.x is a stable, production-ready release
- ✅ Minimal risk of breaking changes

**Cons:**
- ❌ Misses latest features in react-native-tvos 0.82

**Implementation:**

```json
// tv/package.json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "npm:react-native-tvos@0.76.9-0",
    // ... rest stays the same
  }
}
```

Then run:
```bash
cd tv
rm -rf node_modules package-lock.json
npm install
```

**Compatible versions that work with React 18.2:**
- `0.76.9-0` (latest 0.76 stable) - **Recommended**
- `0.75.4-0` (latest 0.75 stable)
- `0.74.5-0` (latest 0.74 stable)

---

### Option B: Upgrade Everything to React 19 (Most Modern)

**Pros:**
- ✅ Access to latest React 19 features
- ✅ Latest react-native-tvos features
- ✅ Future-proof setup

**Cons:**
- ❌ Requires upgrading React in the root wod-wiki project
- ❌ May break existing components relying on React 18 behavior
- ❌ Some dependencies may not yet support React 19
- ❌ Higher risk, more testing required

**Implementation:**

1. Update root project:
```json
// package.json (root)
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

2. Update TV project:
```json
// tv/package.json
{
  "dependencies": {
    "react": "19.1.0",
    "react-native": "npm:react-native-tvos@0.82.1-0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "react-test-renderer": "19.1.0"
  }
}
```

3. Clean install:
```bash
# Root
rm -rf node_modules package-lock.json
npm install

# TV
cd tv
rm -rf node_modules package-lock.json
npm install
```

4. **Critical**: Test all components thoroughly for React 19 compatibility.

---

### Option C: Use npm --legacy-peer-deps (Quick Fix, Not Recommended)

**Pros:**
- ✅ Fastest to implement
- ✅ No version changes needed

**Cons:**
- ❌ Ignores peer dependency requirements
- ❌ May cause runtime errors due to version mismatches
- ❌ Not a real solution, just masks the problem
- ❌ React Native may behave unpredictably with wrong React version

**Implementation:**
```bash
cd tv
npm install --legacy-peer-deps
```

Or add to `.npmrc`:
```
legacy-peer-deps=true
```

**Warning**: This is a band-aid solution. The TV app may crash or behave unexpectedly because react-native-tvos 0.82 expects React 19 APIs that don't exist in React 18.

---

### Option D: Separate Package Management (Isolated Install)

**Pros:**
- ✅ Each project manages its own dependencies independently
- ✅ Allows different React versions in different projects
- ✅ Reduces root project impact

**Cons:**
- ❌ Potential for version drift
- ❌ More complex CI/CD setup
- ❌ Harder to share code between projects

**Implementation:**

1. Add a `.npmrc` file in `/tv/`:
```
# tv/.npmrc
legacy-peer-deps=false
```

2. Update `scripts/dev-start.cjs` to install TV dependencies separately:
```javascript
// Before running TV app, ensure independent install
execSync('cd tv && npm install', { stdio: 'inherit' });
```

3. Consider using npm workspaces or Lerna for proper monorepo management.

---

## Recommendation

### For Immediate Stability: **Option A** (Downgrade to 0.76.x)

This is the safest path forward because:
1. The main wod-wiki project stays on React 18, which is well-tested
2. React Native TVOS 0.76 is stable and feature-complete for TV development
3. Minimal changes required, low risk

### For Long-term: **Option B** (Upgrade to React 19)

Plan for this in a future sprint when:
1. React 19 has broader ecosystem support
2. All your dependencies explicitly support React 19
3. You have time for comprehensive testing

---

## Version Compatibility Matrix

| react-native-tvos | React Version | Status |
|-------------------|---------------|--------|
| 0.82.x | 19.1.x | Latest |
| 0.81.x | 19.0.x | Stable |
| 0.80.x | 18.3.x | Transitional |
| **0.76.x** | **18.2.x** | **✅ Compatible with your setup** |
| 0.75.x | 18.2.x | ✅ Compatible |
| 0.74.x | 18.2.x | ✅ Compatible |
| 0.73.x | 18.2.x | ✅ Compatible |

---

## Quick Implementation Guide (Option A)

```bash
# 1. Navigate to TV directory
cd d:\Dev\wod-wiki\tv

# 2. Update package.json
# Change: "react-native": "npm:react-native-tvos@0.82.1-0"
# To:     "react-native": "npm:react-native-tvos@0.76.9-0"

# 3. Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# 4. Test the TV app
npm start
```

---

## Files to Modify

- [tv/package.json](../../tv/package.json) - Main file requiring changes
- Optionally: [scripts/dev-start.cjs](../../scripts/dev-start.cjs) - If changing build scripts

---

## References

- [react-native-tvos npm page](https://www.npmjs.com/package/react-native-tvos)
- [react-native-tvos GitHub releases](https://github.com/react-native-tvos/react-native-tvos/releases)
- [React 19 announcement](https://react.dev/blog/2024/04/25/react-19)
- [React Native 0.76 release notes](https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here)
