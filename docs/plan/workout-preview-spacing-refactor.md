# Workout Preview Spacing Refactor Plan

## Current Problem

The `WodBlockRuleGenerator.ts` file currently calculates padding and heights through a series of manual calculations (lines 69-106) that:
1. **Are difficult to maintain** - Magic numbers scattered throughout the code
2. **Waste vertical space** - Extra padding zones are added to accommodate preview panel height
3. **Are fragile** - Calculations depend on hardcoded CSS values that could drift out of sync
4. **Lack clarity** - The relationship between different height values is unclear

### Current Calculation Flow

```typescript
// Lines 69-106 in WodBlockRuleGenerator.ts
const lineHeight = 22; // Monaco line height
const headerZoneHeight = 40; // ViewZone header (increased for visual balance)
const previewHeaderHeight = 48; // Header with Run button (py-2 = 8px*2 + content ~32px)
const previewFooterHeight = 36; // Footer with hints (py-2 = 8px*2 + text ~20px)
const statementItemHeight = 48; // Each statement row (p-2 + border + content + space-y-2 gap)
const bodyPadding = 24; // p-3 = 12px * 2
const statementCount = statements?.length || 0;

// Multiple cascading calculations...
const footerZoneHeight = Math.max(8, previewContentHeight - headerZoneHeight - visibleLinesHeight);
const totalCardHeight = headerZoneHeight + visibleLinesHeight + footerZoneHeight;
```

**Problem**: This creates artificial footer zones (`footerZoneHeight`) to fill vertical space, which wastes screen real estate.

---

## Proposed Solution

### Goal
Create a cleaner, more maintainable spacing system that:
- ✅ **Minimizes vertical space waste**
- ✅ **Uses CSS custom properties** for single source of truth
- ✅ **Eliminates magic numbers** from TypeScript calculations
- ✅ **Makes the preview panel height-aware** (auto-sizing)
- ✅ **Simplifies the overlay positioning logic**

---

## Implementation Strategy

### Phase 1: Create CSS Design Tokens

**File**: `src/editor/inline-cards/styles/wod-card-tokens.css`

Create CSS custom properties for all spacing values:

```css
:root {
  /* Monaco Editor Constants */
  --monaco-line-height: 22px;
  
  /* WOD Card Spacing */
  --wod-card-header-height: 32px;  /* Reduced from 40px */
  --wod-card-footer-padding: 4px;  /* Minimal footer padding */
  
  /* WOD Preview Panel */
  --wod-preview-header-height: 40px;  /* Reduced from 48px */
  --wod-preview-footer-height: 28px;  /* Reduced from 36px */
  --wod-preview-body-padding: 12px;   /* Reduced from 24px */
  --wod-preview-statement-height: 40px; /* Reduced from 48px */
  --wod-preview-statement-gap: 4px;   /* Gap between statements */
  
  /* Overlay Positioning */
  --wod-overlay-min-height: 120px; /* Minimum height for preview */
}
```

**Benefits**:
- Single source of truth for all measurements
- Easy to adjust spacing globally
- CSS and TypeScript stay in sync
- Visual design tokens are self-documenting

---

### Phase 2: Refactor WodBlockRuleGenerator to Use CSS Variables

**File**: `src/editor/inline-cards/rule-generators/WodBlockRuleGenerator.ts`

Replace hardcoded calculations with CSS-driven values:

```typescript
// NEW: Read CSS custom properties at runtime
function getCSSVariable(name: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value ? parseInt(value, 10) : fallback;
}

// Inside generateRules():
const lineHeight = getCSSVariable('--monaco-line-height', 22);
const headerZoneHeight = getCSSVariable('--wod-card-header-height', 32);
const previewHeaderHeight = getCSSVariable('--wod-preview-header-height', 40);
const previewFooterHeight = getCSSVariable('--wod-preview-footer-height', 28);
const statementItemHeight = getCSSVariable('--wod-preview-statement-height', 40);
const statementGap = getCSSVariable('--wod-preview-statement-gap', 4);
const bodyPadding = getCSSVariable('--wod-preview-body-padding', 12);

// Simplified calculation
const statementCount = statements?.length || 0;
const statementsHeight = statementCount > 0 
  ? (statementCount * statementItemHeight) + ((statementCount - 1) * statementGap)
  : 60; // Minimum height for empty state

const previewContentHeight = measuredHeight ?? 
  (previewHeaderHeight + statementsHeight + bodyPadding * 2 + previewFooterHeight);
```

**Key Changes**:
1. Use `getCSSVariable()` helper to read design tokens
2. Only calculate what's actually needed
3. Rely on measured height when available (via ResizeObserver)

---

### Phase 3: Eliminate Footer Zone Padding

**Current Issue**: Lines 98-103 calculate `footerZoneHeight` to artificially fill space.

**New Approach**: Make the overlay height **content-driven** instead of **padding-driven**

```typescript
// REMOVE THIS CALCULATION:
const footerZoneHeight = Math.max(8, previewContentHeight - headerZoneHeight - visibleLinesHeight);

// REPLACE WITH MINIMAL FOOTER:
const footerZoneHeight = getCSSVariable('--wod-card-footer-padding', 4);

// Let the overlay determine its own height based on content
const overlayRule: OverlayRowRule = {
  // ... other properties
  heightMode: 'content', // Change from 'fixed' to 'content'
  fixedHeight: undefined, // Remove fixed height
  minHeight: getCSSVariable('--wod-overlay-min-height', 120),
  // ...
};
```

**Benefits**:
- No wasted vertical space
- Preview panel shrinks/grows based on actual content
- Cleaner visual appearance

---

### Phase 4: Update WodPreviewPanel Styling

**File**: `src/editor/inline-cards/rule-generators/WodBlockRuleGenerator.ts` (lines 236-374)

Update the `WodPreviewPanel` component to use CSS variables:

```typescript
// Header section (lines 316-343)
React.createElement('div', {
  key: 'header',
  className: 'wod-preview-header flex items-center justify-between px-4 border-b border-border bg-primary/5',
  style: {
    height: 'var(--wod-preview-header-height)',
    paddingTop: '8px',
    paddingBottom: '8px',
  }
}, [/* ... */]),

// Body section (lines 346-363)
React.createElement('div', {
  key: 'body',
  className: 'overflow-hidden flex flex-col justify-center',
  style: {
    padding: 'var(--wod-preview-body-padding)',
    gap: 'var(--wod-preview-statement-gap)',
  }
}, [/* ... */]),

// Footer section (lines 366-372)
React.createElement('div', {
  key: 'footer',
  className: 'wod-preview-footer px-4 border-t border-border text-xs text-muted-foreground bg-muted/10 flex items-center justify-between',
  style: {
    height: 'var(--wod-preview-footer-height)',
    paddingTop: '4px',
    paddingBottom: '4px',
  }
}, [/* ... */])
```

**Update `WodScriptVisualizer`** to respect statement height:

**File**: `src/components/WodScriptVisualizer.tsx`

```css
/* Add to component styles */
.wod-statement-item {
  min-height: var(--wod-preview-statement-height);
  padding: 8px 12px;
  /* Remove excessive padding */
}
```

---

### Phase 5: Simplify Overlay Positioning Logic

**Current Issue**: Lines 156-189 have complex positioning calculations with `topOffset: -headerZoneHeight`.

**New Approach**: Use a simpler CSS-based positioning

```typescript
// Simplified overlay rule
const overlayRule: OverlayRowRule = {
  lineNumber: startLine + 1,
  overrideType: 'overlay',
  position: 'right',
  overlayId: `wod-preview-${startLine}`,
  spanLines: { 
    startLine: startLine,
    endLine: endLine
  },
  overlayWidth: '50%',
  heightMode: 'auto', // Let content determine height
  topOffset: -headerZoneHeight, // Align with header top
  className: 'wod-preview-overlay',
  renderOverlay: (props: OverlayRenderProps) => {
    return React.createElement(WodPreviewPanel, {
      // ... props
    });
  },
};
```

Add CSS for overlay container:

```css
.wod-preview-overlay {
  display: flex;
  flex-direction: column;
  min-height: var(--wod-overlay-min-height);
  max-height: calc(100vh - var(--monaco-line-height) * 2); /* Prevent overflow */
}
```

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Vertical Space** | Extra padding zones waste space | Minimal padding, content-driven height |
| **Maintainability** | Magic numbers in TypeScript | CSS custom properties |
| **Consistency** | Hardcoded values can drift | Single source of truth |
| **Clarity** | Complex calculation chains | Simple, readable code |
| **Flexibility** | Requires code changes to adjust | Adjust CSS tokens only |

---

## Implementation Checklist

### Step 1: Create CSS Tokens
- [ ] Create `src/editor/inline-cards/styles/wod-card-tokens.css`
- [ ] Define all spacing custom properties
- [ ] Import into main stylesheet

### Step 2: Add CSS Helper Utility
- [ ] Create `src/editor/inline-cards/utils/css-helpers.ts`
- [ ] Implement `getCSSVariable()` function
- [ ] Add unit tests

### Step 3: Refactor WodBlockRuleGenerator
- [ ] Replace hardcoded constants with `getCSSVariable()` calls
- [ ] Simplify height calculation logic
- [ ] Remove `footerZoneHeight` calculation
- [ ] Change footer zone to minimal padding

### Step 4: Update WodPreviewPanel
- [ ] Add inline styles using CSS variables
- [ ] Remove hardcoded padding classes
- [ ] Test height measurement with ResizeObserver

### Step 5: Update WodScriptVisualizer
- [ ] Apply `--wod-preview-statement-height` to statement items
- [ ] Remove excessive padding
- [ ] Add gap between statements

### Step 6: Update Overlay Positioning
- [ ] Change `heightMode` from `'fixed'` to `'auto'` or `'content'`
- [ ] Add `className` for CSS styling
- [ ] Test overlay alignment

### Step 7: Testing & Validation
- [ ] Visual regression testing
- [ ] Test with varying statement counts (1, 5, 10, 20+)
- [ ] Test empty/error states
- [ ] Test resize behavior
- [ ] Verify no vertical space waste

---

## Example Before/After

### Before (Current)
```typescript
const previewHeaderHeight = 48; // py-2 = 8px*2 + content ~32px
const previewFooterHeight = 36; // py-2 = 8px*2 + text ~20px
const statementItemHeight = 48; // p-2 + border + content + space-y-2 gap
const bodyPadding = 24; // p-3 = 12px * 2

// Complex calculation to add footer padding
const footerZoneHeight = Math.max(8, previewContentHeight - headerZoneHeight - visibleLinesHeight);
```

### After (Proposed)
```typescript
const previewHeaderHeight = getCSSVariable('--wod-preview-header-height', 40);
const previewFooterHeight = getCSSVariable('--wod-preview-footer-height', 28);
const statementItemHeight = getCSSVariable('--wod-preview-statement-height', 40);
const bodyPadding = getCSSVariable('--wod-preview-body-padding', 12);

// Minimal footer padding - no artificial space filling
const footerZoneHeight = getCSSVariable('--wod-card-footer-padding', 4);
```

---

## Additional Considerations

### 1. Dynamic Content Height
- Use `ResizeObserver` to dynamically measure actual preview panel height
- Update overlay height when content changes
- This is already partially implemented (lines 249-268)

### 2. Responsive Design
- Consider adding responsive CSS variables for different viewport sizes
- Example: Reduce padding on smaller screens

```css
@media (max-width: 1200px) {
  :root {
    --wod-preview-body-padding: 8px;
    --wod-preview-statement-height: 36px;
  }
}
```

### 3. Performance
- `getCSSVariable()` should be memoized or called once
- Cache values if this becomes a performance concern

### 4. Accessibility
- Ensure minimum touch target sizes are maintained
- Verify keyboard navigation still works correctly

---

## Success Criteria

✅ **Reduced vertical space waste** by at least 30%  
✅ **Eliminated all magic numbers** from TypeScript  
✅ **CSS custom properties** used for all spacing values  
✅ **Code is more readable** and maintainable  
✅ **Visual appearance** is preserved or improved  
✅ **All existing tests** continue to pass  

---

## Timeline Estimate

- **Step 1-2**: CSS Tokens & Helpers - 1-2 hours
- **Step 3**: WodBlockRuleGenerator Refactor - 2-3 hours
- **Step 4-5**: Component Updates - 2-3 hours
- **Step 6**: Overlay Positioning - 1-2 hours
- **Step 7**: Testing & Validation - 2-3 hours

**Total**: 8-13 hours of focused work

---

## Future Enhancements

1. **Theme support**: Add dark/light mode spacing variations
2. **Animation**: Smooth transitions when resizing preview panel
3. **Collapsible preview**: Allow users to collapse preview to save space
4. **Custom zoom levels**: Let users adjust spacing via settings
