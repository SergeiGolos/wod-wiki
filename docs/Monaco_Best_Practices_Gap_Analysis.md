# Monaco Editor Best Practices Gap Analysis

This document analyzes the WOD Wiki codebase against the best practices outlined in [Monaco Editor Line Manipulation APIs.md](Monaco%20Editor%20Line%20Manipulation%20APIs.md) and [Monaco Editor Syntax Highlighting Integration.md](Monaco%20Editor%20Syntax%20Highlighting%20Integration.md).

> **⚠️ UPDATE (December 2024):** Most issues identified in this document have been resolved. See [Refactoring Summary](#refactoring-summary) at the end.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Decoration Management Issues](#decoration-management-issues)
3. [View Zone Implementation Issues](#view-zone-implementation-issues)
4. [Widget Layer Issues](#widget-layer-issues)
5. [Stickiness Configuration Missing](#stickiness-configuration-missing)
6. [Hidden Areas Concerns](#hidden-areas-concerns)
7. [Performance Considerations](#performance-considerations)
8. [Recommended Fixes](#recommended-fixes)

---

## Executive Summary

The WOD Wiki codebase has **multiple Monaco editor integrations** that handle decorations, view zones, and overlays. While the implementation is functional, several areas deviate from Monaco best practices documented in the architecture guides.

### Critical Issues (High Priority)

| Issue | Severity | Files Affected |
|-------|----------|----------------|
| Mixed decoration management APIs | 🔴 High | Multiple managers |
| Missing `stickiness` on decorations | 🔴 High | All decoration usage |
| View Zone interactivity without Zone-Widget pattern | 🟡 Medium | Some implementations |
| No `layoutZone()` for dynamic height updates | 🟡 Medium | [FeatureRegistry.ts](../src/editor/features/FeatureRegistry.ts) |
| Multiple simultaneous `setHiddenAreas` calls | 🟡 Medium | Multiple managers |

### Good Practices Already Followed

- ✅ Using `changeViewZones` transaction accessor
- ✅ Proper React root cleanup on view zone removal
- ✅ `suppressMouseDown: false` for interactive zones
- ✅ `HiddenAreasCoordinator` for coordinating hidden areas
- ✅ `ResizeObserver` usage for dynamic content

---

## Decoration Management Issues

### Issue 1: Inconsistent API Usage

**Best Practice (from docs):**
> For robust application development, particularly within Single Page Applications (SPAs), `createDecorationsCollection` should be the default choice. It reduces boilerplate code and minimizes memory leaks associated with untracked decoration IDs.

**Current Implementation:**

The codebase uses **both** APIs inconsistently:

| File | API Used | Status |
|------|----------|--------|
| [RowBasedCardManager.ts](../src/editor/inline-cards/RowBasedCardManager.ts#L75) | `createDecorationsCollection()` | ✅ Modern |
| [InlineWidgetCardManager.ts](../src/editor/inline-cards/InlineWidgetCardManager.ts#L218) | `deltaDecorations()` | ⚠️ Legacy |
| [RowRuleRenderer.ts](../src/editor/inline-cards/RowRuleRenderer.ts#L389) | `deltaDecorations()` | ⚠️ Legacy |
| [FeatureRegistry.ts](../src/editor/features/FeatureRegistry.ts#L209) | `deltaDecorations()` | ⚠️ Legacy |

**Problem:**

```typescript
// InlineWidgetCardManager.ts - Manual ID tracking required
private decorations: string[] = [];
// ...
this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
```

If the component unmounts unexpectedly or IDs are lost, decorations become "orphaned."

**Recommended Fix:**

Migrate all decoration management to `createDecorationsCollection()`:

```typescript
// RECOMMENDED
private decorationsCollection: editor.IEditorDecorationsCollection;

constructor(editor: editor.IStandaloneCodeEditor) {
  this.decorationsCollection = editor.createDecorationsCollection();
}

private updateDecorations(newDecorations: editor.IModelDeltaDecoration[]): void {
  this.decorationsCollection.set(newDecorations);
}

dispose(): void {
  this.decorationsCollection.clear();
}
```

---

## View Zone Implementation Issues

### Issue 2: Missing `layoutZone()` for Dynamic Content

**Best Practice (from docs):**
> When the content size changes, the callback triggers `editor.changeViewZones`, updates the zone's height definition, and calls `layoutZone(id)`. This triggers the editor to re-calculate the scroll height.

**Current Implementation:**

[FeatureRegistry.ts](../src/editor/features/FeatureRegistry.ts#L186-L192) uses `ResizeObserver` but only calls `layoutZone()`:

```typescript
// FeatureRegistry.ts - Line 186-192
const observer = new ResizeObserver(() => {
    this.editor.changeViewZones(accessor => {
        accessor.layoutZone(viewZoneId);
    });
});
```

**Problem:**

`layoutZone()` only triggers a re-layout with the *existing* height. If the content height actually changed, you need to:
1. Remove the old zone
2. Add a new zone with updated `heightInPx`

Or update the zone's height property (which requires tracking and re-adding).

**Recommended Fix:**

```typescript
// Track zone heights and update properly
private updateViewZoneHeight(zoneId: string, newHeightPx: number): void {
  const zoneInfo = this.viewZones.get(zoneId);
  if (!zoneInfo || zoneInfo.heightInPx === newHeightPx) return;
  
  this.editor.changeViewZones(accessor => {
    // Remove old zone
    accessor.removeZone(zoneInfo.id);
    
    // Add new zone with updated height
    const newId = accessor.addZone({
      afterLineNumber: zoneInfo.afterLineNumber,
      heightInPx: newHeightPx,
      domNode: zoneInfo.domNode,
    });
    
    zoneInfo.id = newId;
    zoneInfo.heightInPx = newHeightPx;
  });
}
```

### Issue 3: View Zone Drift on Text Changes

**Best Practice (from docs):**
> A significant challenge arises when the text above the View Zone changes. If a user inserts 10 lines *above* the zone, the zone's `afterLineNumber` must theoretically shift down by 10.

**Current Implementation:**

View zones are created with static `afterLineNumber` values. When content changes, zones are often completely rebuilt:

```typescript
// InlineWidgetCardManager.ts - Recreates zones on content change
private parseContent(): void {
  // ...
  for (const [id] of this.cards) {
    if (!updatedCards.has(id)) {
      this.removeViewZone(id);  // Full removal
    }
  }
}
```

**Problem:**

This is actually a **reasonable approach** for handling drift, but it's inefficient. Full rebuild on every content change causes:
- Unnecessary DOM operations
- Visual flickering
- Performance overhead

**Recommendation:**

The current approach is acceptable but could be optimized by:
1. Checking if zone positions actually changed
2. Only rebuilding affected zones

---

## Widget Layer Issues

### Issue 4: Interactive Content Without Zone-Widget Pattern

**Best Practice (from docs):**
> To create a fully interactive region (like a VS Code "Peek" window), one must not rely solely on the View Zone's DOM node for interaction. Instead, a composite pattern is used:
> 1. Create a View Zone with an empty `domNode` (spacer)
> 2. Create an `IContentWidget` anchored to the zone position
> 3. Position the Content Widget exactly over the empty space

**Current Implementation:**

[RowRuleRenderer.ts](../src/editor/inline-cards/RowRuleRenderer.ts#L254) uses `suppressMouseDown: false` to make View Zones interactive:

```typescript
const zoneId = accessor.addZone({
  afterLineNumber,
  heightInPx: rule.heightInPx,
  domNode,
  suppressMouseDown: false,  // Enable interaction
});
```

**Problem:**

While `suppressMouseDown: false` helps, it doesn't fully solve the layering issue mentioned in the docs:
> The View Zone layer is rendered *below* the mouse target layer. This layering blocks pointer events for opaque zones.

**Mitigating Factor:**

The [RowRuleRenderer.ts](../src/editor/inline-cards/RowRuleRenderer.ts#L416) overlay implementation **correctly** uses a separate overlay container:

```typescript
// RowRuleRenderer.ts - Line 416
overlayContainer.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; z-index: 100;';
// ...
domNode.style.cssText = 'position: absolute; pointer-events: auto;';
```

This is effectively implementing the Zone-Widget pattern by:
1. Using View Zones for spacing (implicitly, through line positioning)
2. Using absolutely positioned DOM elements for interaction

**Status:** ✅ **Partially compliant** - The overlay pattern works but doesn't use Monaco's official Widget APIs (`IContentWidget`, `IOverlayWidget`).

---

## Stickiness Configuration Missing

### Issue 5: No `TrackedRangeStickiness` on Decorations

**Best Practice (from docs):**
> The `stickiness` property dictates how a decoration behaves when a user types at its boundaries. Failing to set `stickiness` correctly leads to "visual leaks," where a bolded keyword style erroneously bleeds into the subsequent operators.

**Current Implementation:**

**None of the decoration usages specify `stickiness`:**

```typescript
// CardRenderer.ts - No stickiness specified
return [
  {
    range: new Range(line, 1, line, prefixLength + 1),
    options: { 
      inlineClassName: 'inline-card-hidden' 
    }
  },
  {
    range: new Range(line, prefixLength + 1, line, card.sourceRange.endColumn),
    options: { 
      inlineClassName: `inline-card-heading-${level}` 
    }
  }
];
```

```typescript
// RowRuleRenderer.ts - No stickiness specified
decorations.push({
  range: new Range(rule.lineNumber, 1, rule.lineNumber, lineLength + 1),
  options: {
    isWholeLine: true,
    className: rule.className,
    // Missing: stickiness property
  },
});
```

**Problem:**

When users type at the boundaries of heading decorations or blockquote decorations:
- The decoration may incorrectly expand to include new text
- The decoration may incorrectly shrink and lose characters

**Recommended Fix:**

Add explicit stickiness to all decorations:

```typescript
import { TrackedRangeStickiness } from 'monaco-editor';

// For semantic highlighting (should NOT expand)
{
  range: new Range(line, prefixLength + 1, line, card.sourceRange.endColumn),
  options: { 
    inlineClassName: `inline-card-heading-${level}`,
    stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
  }
}

// For snippet placeholders (SHOULD expand as user types)
{
  range: snippetRange,
  options: {
    className: 'snippet-placeholder',
    stickiness: TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
  }
}
```

**Impact:** This is a **high-priority fix** as it affects the editing experience for headings, blockquotes, and WOD block styling.

---

## Hidden Areas Concerns

### Issue 6: Multiple Sources Calling `setHiddenAreas`

**Best Practice (from docs):**
> Using `setHiddenAreas` in a generic DiffEditor is fraught with peril.

**Current Implementation:**

Multiple managers can call `setHiddenAreas`:

1. [HiddenAreasCoordinator.ts](../src/editor/utils/HiddenAreasCoordinator.ts) - Centralized coordinator ✅
2. [InlineWidgetCardManager.ts](../src/editor/inline-cards/InlineWidgetCardManager.ts#L226) - Uses coordinator OR direct call
3. [RowRuleRenderer.ts](../src/editor/inline-cards/RowRuleRenderer.ts#L163) - Direct call
4. [FeatureRegistry.ts](../src/editor/features/FeatureRegistry.ts#L201) - Direct call

```typescript
// InlineWidgetCardManager.ts - Conditional usage
private applyHiddenAreas(areas: Range[]): void {
  if (this.hiddenAreasCoordinator) {
    this.hiddenAreasCoordinator.updateHiddenAreas('inline-cards', areas);
  } else {
    (this.editor as any).setHiddenAreas(areas);  // Direct call!
  }
}
```

**Problem:**

When multiple managers directly call `setHiddenAreas`, they overwrite each other's hidden areas.

**Status:**

- `HiddenAreasCoordinator` exists and is the right solution ✅
- Not all managers use it consistently ⚠️
- `RowRuleRenderer` and `FeatureRegistry` call `setHiddenAreas` directly ❌

**Recommended Fix:**

1. Make `HiddenAreasCoordinator` required (not optional)
2. Remove all direct `setHiddenAreas` calls
3. Update all managers to use the coordinator

---

## Performance Considerations

### Issue 7: CSS Class Proliferation

**Best Practice (from docs):**
> Adding thousands of unique CSS classes via `inlineClassName` can cause layout thrashing.
> **Best Practice**: Reuse CSS class names. Instead of generating `error-id-123`, use a generic `lint-error` class.

**Current Implementation:**

The codebase generally follows this practice well:

```css
/* row-cards.css - Reusable classes */
.heading-level-1 { ... }
.heading-level-2 { ... }
.blockquote-line { ... }
.wod-fence-line { ... }
```

**Status:** ✅ **Good** - Classes are reused, not generated dynamically.

### Issue 8: Batching Decoration Updates

**Best Practice (from docs):**
> Always update decorations in a single transaction. Incremental updates (adding one error at a time in a loop) will trigger repeated layout invalidations.

**Current Implementation:**

```typescript
// InlineWidgetCardManager.ts - Batched correctly ✅
this.decorations = this.editor.deltaDecorations(this.decorations, decorations);

// RowRuleRenderer.ts - Batched correctly ✅
this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
```

**Status:** ✅ **Good** - All decoration updates are batched.

### Issue 9: Multiple `changeViewZones` Calls

**Current Implementation:**

[RowRuleRenderer.ts](../src/editor/inline-cards/RowRuleRenderer.ts) calls `changeViewZones` multiple times per render cycle:

```typescript
// Line 189 - First call for view zones
this.editor.changeViewZones((accessor) => { ... });

// Line 286 - Second call for header/footer
this.editor.changeViewZones((accessor) => { ... });

// Line 585 - Third call for full cards
this.editor.changeViewZones((accessor) => { ... });
```

**Problem:**

Each `changeViewZones` call triggers a layout recalculation. Multiple calls should be consolidated.

**Recommended Fix:**

Consolidate all view zone operations into a single `changeViewZones` call:

```typescript
renderCards(cards: InlineCard[]): void {
  // ... collect all rules ...
  
  // Single changeViewZones call for ALL zone operations
  this.editor.changeViewZones((accessor) => {
    // 1. Remove all obsolete zones
    // 2. Add/update view zone rules
    // 3. Add/update header/footer rules
    // 4. Add/update full card rules
  });
}
```

---

## Recommended Fixes

### Priority 1: High Impact, Low Effort

| Fix                                      | Effort | Impact | Files                                          |
| ---------------------------------------- | ------ | ------ | ---------------------------------------------- |
| Add `stickiness` to all decorations      | Low    | High   | CardRenderer.ts, RowRuleRenderer.ts            |
| Migrate to `createDecorationsCollection` | Medium | High   | InlineWidgetCardManager.ts, FeatureRegistry.ts |

### Priority 2: Medium Impact, Medium Effort

| Fix | Effort | Impact | Files |
|-----|--------|--------|-------|
| Consolidate `changeViewZones` calls | Medium | Medium | RowRuleRenderer.ts |
| Enforce `HiddenAreasCoordinator` usage | Medium | Medium | RowRuleRenderer.ts, FeatureRegistry.ts |

### Priority 3: Low Impact, Higher Effort

| Fix | Effort | Impact | Files |
|-----|--------|--------|-------|
| Implement proper Zone-Widget pattern | High | Low | RowRuleRenderer.ts |
| Optimize view zone drift handling | High | Low | All managers |

---

## Code Examples for Fixes

### Fix 1: Adding Stickiness

```typescript
// src/editor/inline-cards/CardRenderer.ts

import { TrackedRangeStickiness } from 'monaco-editor';

private getHeadingDecorations(card: InlineWidgetCard): editor.IModelDeltaDecoration[] {
  const content = card.content as HeadingContent;
  const { level, prefixLength } = content;
  const line = card.sourceRange.startLineNumber;
  
  return [
    {
      range: new Range(line, 1, line, prefixLength + 1),
      options: { 
        inlineClassName: 'inline-card-hidden',
        stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    },
    {
      range: new Range(line, prefixLength + 1, line, card.sourceRange.endColumn),
      options: { 
        inlineClassName: `inline-card-heading-${level}`,
        stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }
  ];
}
```

### Fix 2: Migration to createDecorationsCollection

```typescript
// src/editor/inline-cards/InlineWidgetCardManager.ts

export class InlineWidgetCardManager {
  // BEFORE
  // private decorations: string[] = [];
  
  // AFTER
  private decorationsCollection: editor.IEditorDecorationsCollection;
  
  constructor(editorInstance: editor.IStandaloneCodeEditor, ...) {
    // ...
    this.decorationsCollection = editorInstance.createDecorationsCollection();
  }
  
  private renderAllCards(): void {
    // ...
    
    // BEFORE
    // this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
    
    // AFTER
    this.decorationsCollection.set(decorations);
  }
  
  public dispose(): void {
    // BEFORE
    // this.decorations = this.editor.deltaDecorations(this.decorations, []);
    
    // AFTER
    this.decorationsCollection.clear();
  }
}
```

---

## Summary

The WOD Wiki Monaco integration is **functional and reasonably well-architected**, with proper use of:
- View zone transactions
- React root cleanup
- CSS class reuse
- Debounced updates

However, there are key gaps:
1. **Missing stickiness** on decorations (causes visual glitches during typing)
2. **Inconsistent decoration API usage** (memory leak risk)
3. **Multiple `changeViewZones` calls** (performance impact)
4. **Incomplete `HiddenAreasCoordinator` adoption** (conflict risk)

Addressing these issues will improve:
- **User experience** during editing
- **Performance** during content changes
- **Maintainability** of the codebase
- **Reliability** of visual features
---

## Refactoring Summary

**Date:** December 2024

### Issues Resolved

| Issue | What Was Done |
|-------|---------------|
| **Mixed decoration APIs** | Removed legacy code, migrated `RowRuleRenderer` to `createDecorationsCollection()` |
| **Missing stickiness** | Added `editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges` to all decorations |
| **Multiple changeViewZones calls** | Consolidated 3 separate calls into single `applyAllViewZones()` transaction |
| **HiddenAreasCoordinator not wired** | Now passed through entire chain: `MarkdownEditor` → `RichMarkdownManager` → `RowBasedCardManager` → `RowRuleRenderer` |
| **Legacy feature code** | Deleted 11 unused files from `src/editor/features/` and `src/editor/inline-cards/` |

### Files Modified

- `src/editor/inline-cards/RowRuleRenderer.ts` - Major refactoring
- `src/editor/inline-cards/RowBasedCardManager.ts` - Added coordinator pass-through
- `src/editor/RichMarkdownManager.ts` - Added coordinator pass-through
- `src/editor/inline-cards/index.ts` - Removed legacy exports

### Files Deleted

**Legacy feature files:**
- `src/editor/features/FeatureRegistry.ts`
- `src/editor/features/BlockquoteFeature.ts`
- `src/editor/features/FoldedSectionWidgetFeature.tsx`
- `src/editor/features/FrontMatterFeature.ts`
- `src/editor/features/HeadingFeature.ts`
- `src/editor/features/MediaFeature.ts`
- `src/editor/features/RichFeature.ts`
- `src/editor/features/WodBlockFeature.ts`
- `src/editor/features/WodBlockOverlayFeature.tsx`

**Legacy inline-cards files:**
- `src/editor/inline-cards/InlineWidgetCardManager.ts`
- `src/editor/inline-cards/CardRenderer.ts`

### Remaining Low-Priority Items

1. **`layoutZone()` for dynamic heights** - Not currently needed (fixed heights used)
2. **Zone-Widget pattern** - Current implementation sufficient for current interactivity level