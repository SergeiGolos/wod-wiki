# Cursor-Aware Line Formatting Proposal

## Problem Statement

WOD Wiki needs to implement a pattern where:
1. **When cursor is ON a line**: Show raw/editable text with minimal formatting
2. **When cursor is OFF a line**: Show rich formatted content with potentially different line heights

This "edit-mode vs display-mode" pattern requires careful coordination between Monaco's View Zones, Decorations, Hidden Areas, and Widgets to avoid visual glitches during transitions.

### Current Bug
When the header section is resized during edit and the cursor leaves, the Workout header doesn't correctly resize back to its updated/calculated size.

---

## Monaco Architecture Constraints

Understanding Monaco's fundamental architecture is critical for a robust solution:

### View Zone Limitations
| API Call | What It Updates | What It Doesn't Update |
|----------|-----------------|------------------------|
| `layoutZone(id)` | Height (re-renders DOM) | Position (afterLineNumber) |
| `changeViewZones` | Full recreation | N/A (full control) |

**Key Insight**: To change both height AND position, the zone must be **removed and re-added**.

### Z-Order Rendering
```
Top (captures clicks)
├── Overlay Widgets (IOverlayWidget)
├── Content Widgets (IContentWidget)
├── Mouse Target Layer
├── View Zones (IViewZone domNodes)
└── Text Layer
Bottom
```

**Key Insight**: View Zones render BELOW the mouse target layer. For interactive content, use the **Zone-Widget Pattern**.

### The Zone-Widget Pattern
Monaco's recommended approach for interactive inline content:

```typescript
// 1. Create View Zone as spacer (reserves vertical space)
const zoneId = accessor.addZone({
  afterLineNumber: lineNumber,
  heightInPx: calculatedHeight,
  domNode: createEmptyDiv(), // Invisible spacer
});

// 2. Overlay Content Widget for interactivity
const widget: IContentWidget = {
  getId: () => `widget-${lineNumber}`,
  getDomNode: () => richContentElement,
  getPosition: () => ({
    position: { lineNumber: lineNumber + 1, column: 1 },
    preference: [ContentWidgetPositionPreference.EXACT]
  })
};
editor.addContentWidget(widget);
```

---

## Proposed Architecture: State Machine Pattern

### Core Concept
Each "formattable block" (e.g., workout header) exists in one of three states:

```
┌─────────────────┐
│    COLLAPSED    │  ← Default state: Rich preview, minimal height
│  (Display Mode) │
└────────┬────────┘
         │ Cursor enters block range
         ▼
┌─────────────────┐
│    EXPANDING    │  ← Transition: Animating to edit height
│  (Transition)   │
└────────┬────────┘
         │ Animation complete
         ▼
┌─────────────────┐
│    EXPANDED     │  ← Edit mode: Full height, raw text visible
│   (Edit Mode)   │
└────────┬────────┘
         │ Cursor leaves block range
         ▼
┌─────────────────┐
│   COLLAPSING    │  ← Transition: Measuring new content, animating
│  (Transition)   │
└────────┬────────┘
         │ Animation complete
         ▼
┌─────────────────┐
│    COLLAPSED    │
│  (Display Mode) │
└─────────────────┘
```

### State Definitions

```typescript
interface BlockState {
  state: 'collapsed' | 'expanding' | 'expanded' | 'collapsing';
  lineRange: IRange;
  
  // Display mode measurements
  collapsedHeight: number;
  collapsedContent: HTMLElement;
  
  // Edit mode measurements
  expandedHeight: number;
  
  // Active resources
  viewZoneId?: string;
  contentWidgetId?: string;
  hiddenRanges?: IRange[];
}
```

---

## Implementation Strategy

### Strategy 1: Hidden Area + View Zone (Recommended)

This is the cleanest pattern for "replacing" lines with rich content:

```
COLLAPSED (Display Mode):
┌──────────────────────────────────────┐
│ Line 1: Visible (before block)       │
├──────────────────────────────────────┤
│ [View Zone: Rich Preview Widget]     │ ← afterLineNumber: 1
│ Height: measuredPreviewHeight        │
├──────────────────────────────────────┤
│ Lines 2-5: HIDDEN                    │ ← setHiddenAreas
├──────────────────────────────────────┤
│ Line 6: Visible (after block)        │
└──────────────────────────────────────┘

EXPANDED (Edit Mode):
┌──────────────────────────────────────┐
│ Line 1: Visible                      │
│ Line 2: Visible (editable)           │
│ Line 3: Visible (editable)           │
│ Line 4: Visible (editable)           │
│ Line 5: Visible (editable)           │
│ Line 6: Visible                      │
└──────────────────────────────────────┘
```

**Transition Logic**:
```typescript
async function expandBlock(block: BlockState): Promise<void> {
  block.state = 'expanding';
  
  // 1. Calculate final expanded height
  const lineCount = block.lineRange.endLineNumber - block.lineRange.startLineNumber + 1;
  block.expandedHeight = lineCount * editor.getOption(EditorOption.lineHeight);
  
  // 2. Remove view zone and widget
  editor.changeViewZones(accessor => {
    if (block.viewZoneId) accessor.removeZone(block.viewZoneId);
  });
  if (block.contentWidgetId) {
    editor.removeContentWidget(/* widget reference */);
  }
  
  // 3. Unhide lines (reveal for editing)
  updateHiddenAreas(excluding: block.lineRange);
  
  block.state = 'expanded';
}

async function collapseBlock(block: BlockState): Promise<void> {
  block.state = 'collapsing';
  
  // 1. Measure new content (may have changed during edit)
  block.collapsedHeight = await measureRichPreview(block);
  
  // 2. Hide lines
  updateHiddenAreas(including: block.lineRange);
  
  // 3. Create view zone with NEW measured height
  editor.changeViewZones(accessor => {
    block.viewZoneId = accessor.addZone({
      afterLineNumber: block.lineRange.startLineNumber - 1,
      heightInPx: block.collapsedHeight, // Fresh measurement!
      domNode: createSpacerDiv(),
    });
  });
  
  // 4. Add content widget
  const widget = createContentWidget(block);
  editor.addContentWidget(widget);
  block.contentWidgetId = widget.getId();
  
  block.state = 'collapsed';
}
```

### Strategy 2: Pure View Zone with layoutZone

For simpler cases where lines aren't hidden, just styled differently:

```typescript
class DynamicViewZoneManager {
  private resizeObserver: ResizeObserver;
  private zoneInfo: Map<string, { id: string; domNode: HTMLElement }>;
  
  constructor(private editor: IStandaloneCodeEditor) {
    this.resizeObserver = new ResizeObserver(entries => {
      editor.changeViewZones(accessor => {
        for (const entry of entries) {
          const info = this.findZoneByDomNode(entry.target);
          if (info) {
            // layoutZone updates height in-place
            accessor.layoutZone(info.id);
          }
        }
      });
    });
  }
  
  observe(zoneId: string, domNode: HTMLElement): void {
    this.zoneInfo.set(zoneId, { id: zoneId, domNode });
    this.resizeObserver.observe(domNode);
  }
}
```

**Limitation**: This only works if height changes. If `afterLineNumber` needs to change (e.g., lines inserted above), you must remove/re-add.

---

## Height Update Bug Analysis

### Root Cause Investigation

Based on the Monaco documentation and current implementation review:

**Hypothesis 1: Stale Height Cache**
The `measuredHeight` in `WodBlockRuleGenerator` may be cached and not re-measured when content changes.

**Hypothesis 2: Zone Recreation Timing**
When comparing heights in `applyAllViewZones`, we check:
```typescript
if (existingZone.heightInPx !== rule.heightInPx) {
  zonesToRemove.add(rule.afterLineNumber);
  zonesToAdd.push(rule);
}
```
But `rule.heightInPx` comes from the rule generator, which may still have the old height.

**Hypothesis 3: Missing Re-render Trigger**
After content changes, the rule generator needs to:
1. Re-measure the preview content
2. Generate new rules with updated heights
3. Trigger `applyRules()` with fresh measurements

### Recommended Fix

Add an explicit re-measurement flow:

```typescript
// In RowBasedCardManager or equivalent
async function onCursorLeaveBlock(blockRange: IRange): Promise<void> {
  // 1. Force re-measure the preview content
  const preview = await renderPreview(getBlockContent(blockRange));
  const newHeight = preview.getBoundingClientRect().height;
  
  // 2. Update rule generator with new measurement
  this.ruleGenerator.setMeasuredHeight(blockRange, newHeight);
  
  // 3. Re-generate and apply rules
  const rules = this.ruleGenerator.generateRules();
  await this.renderer.applyRules(rules);
}
```

---

## Cursor Tracking Implementation

### Debounced Cursor Position Watcher

```typescript
class CursorBlockTracker {
  private currentBlock: BlockState | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 150;
  
  constructor(
    private editor: IStandaloneCodeEditor,
    private blocks: Map<string, BlockState>,
    private onEnterBlock: (block: BlockState) => void,
    private onLeaveBlock: (block: BlockState) => void,
  ) {
    editor.onDidChangeCursorPosition(e => this.handleCursorChange(e));
  }
  
  private handleCursorChange(e: ICursorPositionChangedEvent): void {
    // Debounce to avoid rapid state changes during navigation
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(() => {
      const cursorLine = e.position.lineNumber;
      const newBlock = this.findBlockContaining(cursorLine);
      
      if (this.currentBlock !== newBlock) {
        if (this.currentBlock) {
          this.onLeaveBlock(this.currentBlock);
        }
        if (newBlock) {
          this.onEnterBlock(newBlock);
        }
        this.currentBlock = newBlock;
      }
    }, this.DEBOUNCE_MS);
  }
  
  private findBlockContaining(lineNumber: number): BlockState | null {
    for (const block of this.blocks.values()) {
      if (lineNumber >= block.lineRange.startLineNumber &&
          lineNumber <= block.lineRange.endLineNumber) {
        return block;
      }
    }
    return null;
  }
}
```

### Selection Awareness

Also track when selection spans multiple blocks:

```typescript
editor.onDidChangeCursorSelection(e => {
  const selection = e.selection;
  const affectedBlocks = this.findBlocksInRange(selection);
  
  // Expand all blocks that selection touches
  for (const block of affectedBlocks) {
    if (block.state === 'collapsed') {
      this.expandBlock(block);
    }
  }
});
```

---

## Decoration Stickiness Strategy

For decorations that mark editable regions, use appropriate stickiness:

```typescript
const decorationOptions: IModelDecorationOptions = {
  // For edit-mode markers (should NOT grow when typing at edges)
  stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
  
  // Visual styling
  className: 'block-edit-mode',
  isWholeLine: true,
  
  // Glyph margin indicator (optional)
  glyphMarginClassName: 'edit-mode-glyph',
};
```

**Stickiness Reference**:
| Value | Behavior | Use Case |
|-------|----------|----------|
| `AlwaysGrowsWhenTypingAtEdges` | Expands with typing | Growing text selections |
| `NeverGrowsWhenTypingAtEdges` | Fixed bounds | Block markers, error highlights |
| `GrowsOnlyWhenTypingBefore` | Expands only at start | List items |
| `GrowsOnlyWhenTypingAfter` | Expands only at end | Append-style content |

---

## Implementation Checklist

### Phase 1: Core State Machine
- [ ] Create `BlockStateManager` class
- [ ] Implement state transitions (collapsed ↔ expanded)
- [ ] Add cursor position tracking with debounce

### Phase 2: Height Measurement Pipeline
- [ ] Create `HeightMeasurementService` 
- [ ] Implement off-screen measurement container
- [ ] Add caching with invalidation on content change

### Phase 3: Zone Management
- [ ] Refactor `RowRuleRenderer` to use Zone-Widget pattern
- [ ] Implement explicit remove/re-add for height changes
- [ ] Add ResizeObserver for dynamic content

### Phase 4: Hidden Area Coordination
- [ ] Ensure `HiddenAreasCoordinator` tracks block states
- [ ] Implement atomic show/hide transitions
- [ ] Handle edge cases (overlapping blocks, nested content)

### Phase 5: Testing & Validation
- [ ] Add integration tests for state transitions
- [ ] Test with various block sizes
- [ ] Validate undo/redo behavior
- [ ] Performance profiling for rapid cursor movements

---

## Alternative Approaches Considered

### Approach A: Line Replacement via executeEdits
Replace original lines with "display" versions when cursor leaves.

**Pros**: No View Zones needed, simpler model
**Cons**: Destroys original content, complex undo handling, risky

**Verdict**: ❌ Rejected - Too destructive

### Approach B: CSS-Only Height Animation
Use CSS transitions on view zone domNodes.

**Pros**: Smooth animations, browser-native
**Cons**: Monaco may not track height changes, layout desync

**Verdict**: ⚠️ Partial - Can supplement but not replace proper zone management

### Approach C: Overlay Everything
Use only IOverlayWidget for all rich content, positioned absolutely.

**Pros**: Full click handling, no View Zone complexity
**Cons**: No vertical space reservation, content overlap issues

**Verdict**: ⚠️ Partial - Good for floating UI, not inline content

---

## Recommended Next Steps

1. **Immediate Bug Fix**: 
   - Add explicit height re-measurement when cursor leaves block
   - Ensure `WodBlockRuleGenerator` receives fresh `measuredHeight`
   - Force zone recreation (remove + add) instead of `layoutZone`

2. **Short-term Refactor**:
   - Implement `BlockStateManager` for explicit state tracking
   - Add debounced cursor tracking
   - Use Zone-Widget pattern for all interactive content

3. **Long-term Architecture**:
   - Consider event-driven architecture for state changes
   - Implement proper animation transitions
   - Add comprehensive integration test suite

---

## References

- [Monaco Editor Line Manipulation APIs](Monaco%20Editor%20Line%20Manipulation%20APIs.md) (internal documentation)
- [IViewZone API](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IViewZone.html)
- [IContentWidget API](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IContentWidget.html)
- [TrackedRangeStickiness](https://microsoft.github.io/monaco-editor/typedoc/enums/editor.TrackedRangeStickiness.html)
