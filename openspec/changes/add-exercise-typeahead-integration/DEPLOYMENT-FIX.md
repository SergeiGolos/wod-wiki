# Deployment Configuration Fix

## Issue Discovered

During production build validation, discovered that exercise index JSON files were **not being included** in the Storybook static build, which would cause the exercise typeahead feature to fail in production.

## Root Cause

1. **Index files in wrong location**: `exercise-path-index.json` and `exercise-name-index.json` were in the project root directory
2. **Storybook staticDirs not configured**: `.storybook/main.js` was missing `staticDirs` configuration to copy public assets
3. **Build scripts targeting wrong location**: Package.json scripts were generating index files to project root instead of `public/`

## Fixes Applied

### 1. Added Storybook staticDirs Configuration

**File**: `.storybook/main.js`

```javascript
const config = {
  "stories": [...],
  "addons": [...],
  "staticDirs": ["../public"],  // ← Added this line
  "framework": {...}
};
```

**Impact**: All files in `public/` directory are now copied to the root of the Storybook build output.

### 2. Moved Index Files to Public Directory

**Commands**:
```powershell
Move-Item -Path "exercise-path-index.json" -Destination "public/exercise-path-index.json"
Move-Item -Path "exercise-name-index.json" -Destination "public/exercise-name-index.json"
```

**Impact**: Index files are now in the correct location to be deployed with Storybook.

### 3. Updated Package.json Scripts

**File**: `package.json`

```json
{
  "scripts": {
    "generate-exercise-name-index": "node dist/buildExerciseNameIndex.js public/exercises public/exercise-name-index.json",
    "generate-exercise-path-index": "node dist/buildExercisePathIndex.js public/exercises public/exercise-path-index.json"
  }
}
```

**Impact**: Future index regeneration will place files in the correct `public/` directory.

## Verification

After fixes applied, production build verified to include:

```
storybook-static/
├── exercise-path-index.json (1.5 MB) ✅
├── exercise-name-index.json (3.3 MB) ✅
└── exercises/ (873 JSON files) ✅
```

### Build Command
```bash
npm run build-storybook
```

### Build Time
- **Duration**: 1m 27s
- **Status**: Success
- **Output**: `X:\wod-wiki\storybook-static`

### Asset Verification
```powershell
# Index files
✅ exercise-path-index.json: 1.5 MB
✅ exercise-name-index.json: 3.3 MB

# Exercise data
✅ exercises/ directory: 873 JSON files
```

## Impact on Deployment

### Before Fix
- ❌ Exercise typeahead would fail to load in production
- ❌ `GET /exercise-path-index.json` → 404 Not Found
- ❌ `GET /exercise-name-index.json` → 404 Not Found
- ❌ No exercise suggestions would appear in Monaco Editor

### After Fix
- ✅ All exercise data included in deployment
- ✅ Index files accessible at `/exercise-path-index.json` and `/exercise-name-index.json`
- ✅ Exercise suggestions will work in production
- ✅ Full 873 exercises available for search and suggestions

## Testing Recommendations

### Local Testing
1. Run `npm run build-storybook`
2. Serve static build: `npx serve storybook-static`
3. Open browser to http://localhost:3000
4. Navigate to Editor > Exercise Suggestions stories
5. Verify typeahead suggestions work

### Production Deployment
1. Verify exercise index files are accessible:
   - `https://your-domain.com/exercise-path-index.json`
   - `https://your-domain.com/exercise-name-index.json`
2. Verify exercises directory is accessible:
   - `https://your-domain.com/exercises/Barbell_Squat/exercise.json`
3. Test exercise typeahead in Monaco Editor

## Files Changed

1. `.storybook/main.js` - Added `staticDirs: ["../public"]`
2. `package.json` - Updated index generation scripts to output to `public/`
3. `public/exercise-path-index.json` - Moved from project root
4. `public/exercise-name-index.json` - Moved from project root

## Commit Message Suggestion

```
fix(deployment): include exercise data in Storybook build

- Add staticDirs configuration to copy public/ assets
- Move exercise index JSON files to public/ directory  
- Update package.json scripts to generate indexes in public/
- Verify all 873 exercises + 2 index files (4.8MB total) included in build

Fixes exercise typeahead feature in production deployment.
```

## Related Documentation

- **Implementation Guide**: `docs/exercise-typeahead-implementation-guide.md`
- **Progress Report**: `openspec/changes/add-exercise-typeahead-integration/PROGRESS.md`
- **Manual Testing**: `openspec/changes/add-exercise-typeahead-integration/MANUAL-TESTING-VALIDATION.md`
