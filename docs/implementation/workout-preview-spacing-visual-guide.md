# Height Calculation Flow

## Visual Representation

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE REFACTOR                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────┬──────────────────────────────┐     │
│  │ ``` wod            │  Preview Panel Header (48px) │     │
│  ├────────────────────┼──────────────────────────────┤     │
│  │                    │                              │     │
│  │ Timer 10:00        │  Body (padding: 24px)        │     │
│  │ 10 x Pushups       │  - Statement (48px each)     │     │
│  │ 10 x Situps        │  - Gaps between              │     │
│  │ 10 x Squats        │  - Lots of padding           │     │
│  │                    │                              │     │
│  │ ```                ├──────────────────────────────┤     │
│  ├────────────────────┤  Footer (36px)               │     │
│  │                    └──────────────────────────────┘     │
│  │  EXTRA PADDING                                          │
│  │  (calculated to    ↑ Scrollable if too tall            │
│  │   fill space)      ↓ Wasted space if too short         │
│  │                                                         │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  Issues:                                                    │
│  - Hardcoded values (40, 48, 36, 24)                       │
│  - Lots of extra padding                                   │
│  - Preview could scroll or waste space                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    AFTER REFACTOR                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────┬──────────────────────────────┐     │
│  │ ``` wod            │  Header (40px) ←CSS var      │     │
│  ├────────────────────┼──────────────────────────────┤     │
│  │                    │                              │     │
│  │ Timer 10:00        │  Body (padding: 12px) ←CSS   │     │
│  │ 10 x Pushups       │  - Statement (40px) ←CSS     │     │
│  │ 10 x Situps        │  - Gap (4px) ←CSS            │     │
│  │ 10 x Squats        │  - Minimal padding           │     │
│  │                    │                              │     │
│  │ ```                ├──────────────────────────────┤     │
│  ├────────────────────┤  Footer (28px) ←CSS var      │     │
│  │ SMART PADDING      └──────────────────────────────┘     │
│  │ (calculated to                                          │
│  │  match preview     ↑ Always perfectly sized            │
│  │  height exactly)   ↓ No scrolling, no waste            │
│  │                                                         │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  Benefits:                                                  │
│  ✅ CSS variables (--wod-preview-header-height, etc.)      │
│  ✅ ~30% less vertical space                               │
│  ✅ Preview always fits perfectly                          │
│  ✅ Easy to customize                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Calculation Logic

### Before
```typescript
// Hardcoded magic numbers
const previewHeaderHeight = 48;
const previewFooterHeight = 36;
const statementItemHeight = 48;
const bodyPadding = 24;

// Unclear calculation
const footerZoneHeight = Math.max(8, 
  previewContentHeight - headerZoneHeight - visibleLinesHeight);
```

### After
```typescript
// CSS-driven design tokens
const previewHeaderHeight = getCachedCSSVariable('--wod-preview-header-height', 40);
const previewFooterHeight = getCachedCSSVariable('--wod-preview-footer-height', 28);
const statementItemHeight = getCachedCSSVariable('--wod-preview-statement-height', 40);
const statementGap = getCachedCSSVariable('--wod-preview-statement-gap', 4);
const bodyPadding = getCachedCSSVariable('--wod-preview-body-padding', 12);

// Clear, well-documented calculation
// Calculate footer zone height to ensure the code block area matches the preview panel height
// This prevents the preview panel from scrolling by expanding the editor area to accommodate it
const minFooterPadding = getCachedCSSVariable('--wod-card-footer-padding', 4);
const footerZoneHeight = Math.max(
  minFooterPadding,
  previewContentHeight - headerZoneHeight - visibleLinesHeight
);
```

## Space Savings Example

For a 5-statement workout:

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Header | 40px | 32px | -8px |
| Preview Header | 48px | 40px | -8px |
| Body Top Padding | 12px | 6px | -6px |
| Statement 1 | 48px | 40px | -8px |
| Gap | 0px | 4px | +4px |
| Statement 2 | 48px | 40px | -8px |
| Gap | 0px | 4px | +4px |
| Statement 3 | 48px | 40px | -8px |
| Gap | 0px | 4px | +4px |
| Statement 4 | 48px | 40px | -8px |
| Gap | 0px | 4px | +4px |
| Statement 5 | 48px | 40px | -8px |
| Body Bottom Padding | 12px | 6px | -6px |
| Preview Footer | 36px | 28px | -8px |
| **TOTAL** | **388px** | **312px** | **-76px** |

**Net Savings: 76px (~19.6% reduction)**

Note: Gaps between statements add explicit spacing that was previously implied in the statement height.

## Key Formula

The magic happens in this calculation:

```typescript
// previewContentHeight = measured or calculated total height of preview panel
// headerZoneHeight = height of header ViewZone (32px)
// visibleLinesHeight = height of all code lines (opening fence + content + closing fence)
// minFooterPadding = minimum footer padding (4px)

// Expand footer to make total area match preview
footerZoneHeight = Math.max(
  minFooterPadding,                                              // At least 4px
  previewContentHeight - headerZoneHeight - visibleLinesHeight   // Or enough to match preview
);

// Result: The ```wod block area expands to exactly match the preview panel height
// This ensures the preview displays without scrolling
```

## Design Token Architecture

```
wod-card-tokens.css
       ↓
   index.css (imported)
       ↓
CSS Custom Properties Available Globally
       ↓
   ┌───────────────────────────────┐
   │                               │
   ↓                               ↓
css-helpers.ts              Inline Styles
getCachedCSSVariable()      style={{ height: 'var(...)' }}
       ↓                               ↓
WodBlockRuleGenerator.ts    WodPreviewPanel Component
(TypeScript calculations)   (React inline styles)
```

**Single Source of Truth**: All values defined in `wod-card-tokens.css`
