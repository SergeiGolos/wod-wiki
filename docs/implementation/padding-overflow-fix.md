# Padding Overflow Fix - Removing Extra Vertical Space

## Problem Identified

After compressing the CSS design tokens, the preview panel was still showing scrollbars. The user correctly identified that there was **padding above and below the fragments** causing the overflow.

## Root Cause

The `UnifiedItemList` component had **hardcoded Tailwind CSS classes** adding extra vertical spacing:

### 1. List Container Padding & Spacing
```typescript
// BEFORE - Lines 179-180
const listSpacing = size === 'compact' ? 'space-y-0.5' : size === 'focused' ? 'space-y-1.5' : 'space-y-1';
const listPadding = size === 'compact' ? 'py-1' : size === 'focused' ? 'py-3' : 'py-2';

// Applied to container div
<div className={cn(listSpacing, listPadding)}>
```

**What this was doing:**
- `space-y-1` = 4px gap between each child element (0.25rem = 4px)
- `py-2` = 8px top and bottom padding (0.5rem = 8px)
- **Total extra space**: 8px top + 8px bottom + 4px per gap between items

### 2. LinkedGroup Spacing
```typescript
// BEFORE - Line 60
const spacing = size === 'compact' ? 'space-y-0.5' : size === 'focused' ? 'space-y-1.5' : 'space-y-1';

<div className={cn("border-l-2 border-orange-400/50 ml-2 pl-1 my-1 rounded-r", spacing)}>
```

**What this was doing:**
- Additional `space-y-1` = 4px gap between grouped items
- This was **duplicating** the spacing from the parent container

## Solution Applied

### 1. Removed List Container Padding & Spacing
**File**: `src/components/unified/UnifiedItemList.tsx`

```typescript
// AFTER - Lines 179-190
// ❌ Removed: listSpacing and listPadding variables

return (
  <div 
    ref={scrollRef}
    className={cn('overflow-y-auto', className)}
    style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
  >
    <div>  {/* ← No more padding classes! */}
      {processedItems.map((entry, index) => {
        // ...
      })}
    </div>
  </div>
);
```

### 2. Removed LinkedGroup Spacing
**File**: `src/components/unified/UnifiedItemList.tsx`

```typescript
// AFTER - Lines 59-67
const LinkedGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="border-l-2 border-orange-400/50 ml-2 pl-1 my-1 rounded-r">
      {children}
    </div>
  );
};
```

**Changes:**
- ❌ Removed `spacing` variable
- ❌ Removed `size` parameter (no longer needed)

## Why This Works

The spacing is now **entirely controlled** by the `UnifiedItemRow` component using CSS custom properties:

```typescript
// UnifiedItemRow applies spacing via inline styles
style={{
  paddingLeft: `${paddingLeft + currentConfig.baseIndent}px`,
  minHeight: 'var(--wod-preview-statement-height)',      // 32px
  paddingTop: 'var(--wod-preview-statement-gap)',        // 2px
  paddingBottom: 'var(--wod-preview-statement-gap)',     // 2px
}}
```

### Spacing Flow (After Fix)

```
Preview Panel Body
  ↓
<div> (no padding)
  ↓
UnifiedItemRow (individual row)
  - minHeight: 32px (from CSS variable)
  - paddingTop: 2px (from CSS variable)
  - paddingBottom: 2px (from CSS variable)
  ↓
Result: Tight, controlled spacing with no extra overhead
```

## Space Eliminated

For a 4-statement workout:

| Source | Extra Space | 
|--------|-------------|
| List container `py-2` (top) | -8px |
| List container `py-2` (bottom) | -8px |
| `space-y-1` gaps (3 gaps × 4px) | -12px |
| LinkedGroup spacing (if any) | -varies |
| **Total Removed** | **~28px+** |

## Files Modified

1. **`src/components/unified/UnifiedItemList.tsx`**
   - Removed `listSpacing` and `listPadding` variables
   - Removed their application to container div
   - Removed `spacing` from `LinkedGroup` component  
   - Removed unused `size` prop from `LinkedGroup`

## Expected Results

After hard refresh (Ctrl+Shift+R):
- ✅ **No scrollbar** on preview panel
- ✅ **Tighter layout** - no wasted vertical space
- ✅ **Consistent spacing** - controlled only by CSS variables
- ✅ **Preview fits perfectly** within the code block area

## Architecture Benefit

This change reinforces the **single source of truth** pattern:
- ❌ Before: Spacing controlled by multiple hardcoded Tailwind classes
- ✅ After: Spacing controlled only by CSS custom properties
- Makes it easy to adjust spacing globally by changing CSS variables only

## Testing Checkpoints

- [ ] No scrollbar in preview panel
- [ ] Statements are evenly spaced with 2px gaps
- [ ] No extra padding above first statement
- [ ] No extra padding below last statement
- [ ] Row height is consistently 32px
- [ ] Preview panel height matches code block area exactly
