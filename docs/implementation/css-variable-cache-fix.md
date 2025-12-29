# CSS Variable Cache Issue & Fix

## Problem

After updating the CSS design tokens to compress workout fragments, the changes weren't being reflected in the UI. Instead, scrollbars appeared but the spacing remained the same.

## Root Causes

### 1. CSS Variable Caching
The `getCachedCSSVariable()` function was caching the old values from the CSS. Once cached, these values weren't being refreshed when the CSS file was updated.

**Solution**: Switched from `getCachedCSSVariable()` to `getCSSVariable()` to ensure fresh values are always read from the DOM.

### 2. Hardcoded Tailwind Classes
The `UnifiedItemRow` component had hardcoded Tailwind padding classes that were overriding our CSS variable-based sizing:

```typescript
// BEFORE - Hardcoded padding
const config = {
  compact: {
    padding: 'px-1 py-0.5',  // ← Fixed Tailwind classes
    // ...
  },
  normal: {
    padding: 'px-2 py-1',    // ← Fixed Tailwind classes
    // ...
  }
};
```

**Solution**: Removed the hardcoded padding classes and used inline styles with CSS custom properties instead.

## Files Fixed

### 1. `WodBlockRuleGenerator.ts`
**Change**: Import `getCSSVariable` instead of `getCachedCSSVariable`

```typescript
// BEFORE
import { getCachedCSSVariable } from '../utils/css-helpers';

// AFTER
import { getCSSVariable } from '../utils/css-helpers';
```

**Impact**: All height calculations now read fresh values from CSS on every render.

### 2. `UnifiedItemRow.tsx`
**Change 1**: Removed hardcoded padding from config object

```typescript
// BEFORE
const config = {
  compact: {
    padding: 'px-1 py-0.5',
    indent: 12,
    // ...
  }
};

// AFTER
const config = {
  compact: {
    // Padding will be controlled by inline styles using CSS variables
    indent: 12,
    // ...
  }
};
```

**Change 2**: Updated the row div to use CSS variables for sizing

```typescript
// BEFORE
<div
  className={cn(
    'flex items-center gap-2 border-l-2 transition-all',
    currentConfig.padding,  // ← Hardcoded Tailwind
    // ...
  )}
  style={{ paddingLeft: `${paddingLeft + currentConfig.baseIndent}px` }}
>

// AFTER
<div
  className={cn(
    'flex items-center gap-2 border-l-2 transition-all px-2',
    // ...
  )}
  style={{
    paddingLeft: `${paddingLeft + currentConfig.baseIndent}px`,
    minHeight: 'var(--wod-preview-statement-height)',  // ← CSS variable
    paddingTop: 'var(--wod-preview-statement-gap)',    // ← CSS variable
    paddingBottom: 'var(--wod-preview-statement-gap)', // ← CSS variable
  }}
>
```

**Impact**: Row height and vertical padding now respect CSS custom properties.

## How It Works Now

```
CSS Design Tokens (wod-card-tokens.css)
  ↓
  --wod-preview-statement-height: 32px
  --wod-preview-statement-gap: 2px
  ↓
Inline Styles (no cache)
  ↓
getCSSVariable() reads fresh value
  ↓
Applied via style={{...}}
  ↓
✅ Compressed rows visible immediately
```

## Testing

After these changes, you should see:
- ✅ **Compressed rows** - 32px height instead of previous values
- ✅ **Tighter gaps** - 2px between statements
- ✅ **No scrollbars** (if the footer zone calculation is correct)
- ✅ **Immediate updates** when CSS variables change

## Browser Refresh

**Important**: You may still need to do a hard refresh in the browser (Ctrl+Shift+R or Cmd+Shift+R) to ensure:
1. The updated CSS file is loaded
2. Any browser-level caching is cleared
3. The new inline styles are applied

## Additional Notes

### Why Not Cache?

Caching CSS variables is generally a good performance optimization, but during development when values are changing frequently, it can cause stale data issues. 

**Options**:
1. **No cache** (current): Always reads fresh values - slower but always correct
2. **Manual cache clearing**: Add a dev tool to clear cache when CSS changes
3. **Time-based expiration**: Cache expires after X seconds
4. **Hot reload integration**: Clear cache when CSS files change

For now, we're using option #1 (no cache) to ensure correctness. If performance becomes an issue, we can add smarter caching later.

### Future Improvements

1. Add HMR (Hot Module Replacement) integration to clear CSS variable cache on CSS file changes
2. Add a development mode flag that disables caching
3. Create a utility to manually invalidate the cache when needed
4. Consider using CSS `calc()` for some measurements to keep logic in CSS
