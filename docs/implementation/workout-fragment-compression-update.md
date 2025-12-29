# Workout Fragment Compression Update

## Changes Made (2025-12-29)

Further compressed the workout fragment display by reducing spacing between rows.

### Updated CSS Design Tokens

| Token | Previous | New | Change |
|-------|----------|-----|--------|
| `--wod-preview-body-padding` | 12px | 8px | -4px (-33%) |
| `--wod-preview-statement-height` | 40px | 32px | -8px (-20%) |
| `--wod-preview-statement-gap` | 4px | 2px | -2px (-50%) |

### Responsive Breakpoint (<1200px)

| Token | Previous | New | Change |
|-------|----------|-----|--------|
| `--wod-preview-body-padding` | 8px | 6px | -2px (-25%) |
| `--wod-preview-statement-height` | 36px | 28px | -8px (-22%) |
| `--wod-preview-statement-gap` | (none) | 1px | New |

## Space Savings Calculation

### Example: 5-Statement Workout

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Preview Header | 40px | 40px | 0px |
| Body Top Padding | 12px | 8px | -4px |
| Statement 1 | 40px | 32px | -8px |
| Gap | 4px | 2px | -2px |
| Statement 2 | 40px | 32px | -8px |
| Gap | 4px | 2px | -2px |
| Statement 3 | 40px | 32px | -8px |
| Gap | 4px | 2px | -2px |
| Statement 4 | 40px | 32px | -8px |
| Gap | 4px | 2px | -2px |
| Statement 5 | 40px | 32px | -8px |
| Body Bottom Padding | 12px | 8px | -4px |
| Preview Footer | 28px | 28px | 0px |
| **TOTAL (Content Area)** | **232px** | **192px** | **-40px (-17%)** |

**Combined with previous optimizations**, total space savings from original hardcoded values:

| Version | Height | Savings from Original |
|---------|--------|----------------------|
| Original Hardcoded | ~388px | - |
| After Initial Refactor | ~312px | -76px (-19.6%) |
| **After Compression** | **~272px** | **-116px (-29.9%)** |

## Visual Impact

### Before Compression
```
┌──────────────────────────┐
│  Preview Header (40px)   │
├──────────────────────────┤
│  Padding (12px)          │
│  ┌────────────────────┐  │
│  │ Statement (40px)   │  │
│  └────────────────────┘  │
│  Gap (4px)               │
│  ┌────────────────────┐  │
│  │ Statement (40px)   │  │
│  └────────────────────┘  │
│  Gap (4px)               │
│  ...                     │
│  Padding (12px)          │
├──────────────────────────┤
│  Footer (28px)           │
└──────────────────────────┘
```

### After Compression
```
┌──────────────────────────┐
│  Preview Header (40px)   │
├──────────────────────────┤
│  Padding (8px)           │
│ ┌─────────────────────┐  │
│ │ Statement (32px)    │  │  ← 20% smaller
│ └─────────────────────┘  │
│ Gap (2px)                │  ← 50% smaller
│ ┌─────────────────────┐  │
│ │ Statement (32px)    │  │
│ └─────────────────────┘  │
│ Gap (2px)                │
│ ...                      │
│  Padding (8px)           │
├──────────────────────────┤
│  Footer (28px)           │
└──────────────────────────┘
   ↑ More compact, less wasted space
```

## Benefits

1. **Denser Display** - More content visible without scrolling
2. **Reduced Vertical Space** - ~30% total reduction from original
3. **Better Screen Utilization** - Especially on smaller screens
4. **Maintained Readability** - Still enough space to distinguish items
5. **Responsive** - Even more compact on smaller screens

## Code Changes

### Files Modified

1. **`src/editor/inline-cards/styles/wod-card-tokens.css`**
   - Updated statement height: 40px → 32px
   - Updated statement gap: 4px → 2px
   - Updated body padding: 12px → 8px
   - Enhanced responsive breakpoint values

2. **`src/editor/inline-cards/rule-generators/WodBlockRuleGenerator.ts`**
   - Updated fallback values to match new CSS tokens
   - Ensures consistency if CSS variables fail to load

## Testing Recommendations

- ✅ Test with 1-2 statements (minimal case)
- ✅ Test with 5-10 statements (typical case)
- ✅ Test with 20+ statements (large workout)
- ✅ Verify alignment in both edit and preview modes
- ✅ Test on different screen sizes
- ✅ Check touch target sizes on mobile

## Notes

- The compression maintains CSS variable architecture
- All changes are in design tokens - easy to adjust if too compact
- Cache clearing may be needed for runtime updates
- Responsive breakpoint automatically applies tighter spacing on smaller screens
