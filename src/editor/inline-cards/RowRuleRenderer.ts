/**
 * RowRuleRenderer - Applies row rules to Monaco editor
 * 
 * This renderer takes row rules from cards and applies them to Monaco using:
 * - Hidden Areas for folding delimiter lines (---, ```, etc.)
 * - View zones for headers/footers/full-cards
 * - Decorations for styled rows
 * - Overlay widgets for inline overlays (50/50 split previews)
 */

import { editor, Range } from 'monaco-editor';
import ReactDOM from 'react-dom/client';
import React from 'react';
import { 
  RowRule, 
  HeaderRowRule, 
  FooterRowRule, 
  StyledRowRule, 
  OverlayRowRule,
  FullCardRowRule,
  HiddenAreaRule,
  ViewZoneRule,
  InlineCard,
  OverlayRenderProps,
  CardRenderProps,
} from './row-types';
import { CardHeader } from './components/CardHeader';
import { CardFooter } from './components/CardFooter';
import { HiddenAreasCoordinator } from '../utils/HiddenAreasCoordinator';

interface ViewZoneInfo {
  zoneId: string;
  root: ReactDOM.Root;
  domNode: HTMLDivElement;
  lineNumber: number;
  ruleType: string;
  heightInPx: number; // Track height for dynamic updates
  afterLineNumber: number; // Track position for recreation
}

interface OverlayInfo {
  widgetId: string;
  root: ReactDOM.Root;
  domNode: HTMLDivElement;
  overlayId: string;
  spanLines: { startLine: number; endLine: number };
  rule: OverlayRowRule;
  scrollListener?: () => void;
}

// Unique source ID for hidden areas from this renderer
const HIDDEN_AREAS_SOURCE_ID = 'row-rule-renderer';

/**
 * Safely unmount React roots by deferring to the next microtask.
 * This prevents "Attempted to synchronously unmount a root while React was already rendering" warnings.
 */
function safeUnmountRoots(roots: ReactDOM.Root[]): void {
  if (roots.length === 0) return;
  queueMicrotask(() => {
    for (const root of roots) {
      root.unmount();
    }
  });
}

export class RowRuleRenderer {
  private editor: editor.IStandaloneCodeEditor;
  private viewZones: Map<string, ViewZoneInfo> = new Map();
  private overlays: Map<string, OverlayInfo> = new Map();
  private decorationsCollection: editor.IEditorDecorationsCollection;
  private hiddenAreas: Range[] = [];
  private hiddenAreasCoordinator?: HiddenAreasCoordinator;
  private onAction?: (cardId: string, action: string, payload?: unknown) => void;
  
  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onAction?: (cardId: string, action: string, payload?: unknown) => void,
    hiddenAreasCoordinator?: HiddenAreasCoordinator
  ) {
    this.editor = editorInstance;
    this.onAction = onAction;
    this.hiddenAreasCoordinator = hiddenAreasCoordinator;
    this.decorationsCollection = editorInstance.createDecorationsCollection();
  }

  /**
   * Render all rules from cards
   */
  renderCards(cards: InlineCard[]): void {
    // Collect all rules
    const allRules: Array<{ rule: RowRule; card: InlineCard }> = [];
    for (const card of cards) {
      for (const rule of card.rules) {
        allRules.push({ rule, card });
      }
    }

    // Debug logging
    console.log('[RowRuleRenderer] Rendering', cards.length, 'cards with', allRules.length, 'total rules');

    // Group rules by type for efficient processing
    const headerFooterRules: Array<{ rule: HeaderRowRule | FooterRowRule; card: InlineCard }> = [];
    const styledRules: Array<{ rule: StyledRowRule; card: InlineCard }> = [];
    const overlayRules: Array<{ rule: OverlayRowRule; card: InlineCard }> = [];
    const fullCardRules: Array<{ rule: FullCardRowRule; card: InlineCard }> = [];
    const hiddenAreaRules: Array<{ rule: HiddenAreaRule; card: InlineCard }> = [];
    const viewZoneRules: Array<{ rule: ViewZoneRule; card: InlineCard }> = [];

    for (const { rule, card } of allRules) {
      switch (rule.overrideType) {
        case 'header':
        case 'footer':
          headerFooterRules.push({ rule: rule as HeaderRowRule | FooterRowRule, card });
          break;
        case 'styled':
          styledRules.push({ rule: rule as StyledRowRule, card });
          break;
        case 'overlay':
          overlayRules.push({ rule: rule as OverlayRowRule, card });
          break;
        case 'full-card':
          fullCardRules.push({ rule: rule as FullCardRowRule, card });
          break;
        case 'hidden-area':
          hiddenAreaRules.push({ rule: rule as HiddenAreaRule, card });
          break;
        case 'view-zone':
          viewZoneRules.push({ rule: rule as ViewZoneRule, card });
          break;
        case 'grouped-content':
          // Grouped content doesn't create UI directly - it's handled by parent overlay
          break;
      }
    }

    // Apply each type in correct order:
    // 1. Hidden areas first (affects line numbers)
    this.applyHiddenAreaRules(hiddenAreaRules);
    // 2. ALL view zones in a single transaction (Monaco best practice)
    this.applyAllViewZones(viewZoneRules, headerFooterRules, fullCardRules);
    // 3. Decorations for styling
    this.applyStyledRules(styledRules);
    // 4. Overlays for side-by-side views
    this.applyOverlayRules(overlayRules);
  }

  /**
   * Apply hidden area rules using HiddenAreasCoordinator (if available) or direct setHiddenAreas
   * Using the coordinator prevents conflicts with other features that may hide areas.
   */
  private applyHiddenAreaRules(
    rules: Array<{ rule: HiddenAreaRule; card: InlineCard }>
  ): void {
    const newHiddenAreas: Range[] = [];

    for (const { rule } of rules) {
      const startLine = rule.lineNumber;
      const endLine = rule.endLineNumber || rule.lineNumber;
      
      // Create range for hidden area
      newHiddenAreas.push(new Range(startLine, 1, endLine, 1));
    }

    // Only update if changed
    const hasChanged = this.hiddenAreasChanged(newHiddenAreas);
    if (hasChanged) {
      this.hiddenAreas = newHiddenAreas;
      
      // Use coordinator if available (prevents conflicts with other features)
      if (this.hiddenAreasCoordinator) {
        this.hiddenAreasCoordinator.updateHiddenAreas(HIDDEN_AREAS_SOURCE_ID, newHiddenAreas);
      } else {
        // Fallback to direct call (not recommended but maintains backwards compatibility)
        (this.editor as any).setHiddenAreas(newHiddenAreas);
      }
    }
  }

  /**
   * Check if hidden areas have changed
   */
  private hiddenAreasChanged(newAreas: Range[]): boolean {
    if (newAreas.length !== this.hiddenAreas.length) return true;
    
    for (let i = 0; i < newAreas.length; i++) {
      const oldRange = this.hiddenAreas[i];
      const newRange = newAreas[i];
      if (!oldRange.equalsRange(newRange)) return true;
    }
    
    return false;
  }

  /**
   * Apply view zone rules for custom header/footer content
   * CONSOLIDATED: All view zone operations in a single transaction (Monaco best practice)
   */
  private applyAllViewZones(
    viewZoneRules: Array<{ rule: ViewZoneRule; card: InlineCard }>,
    headerFooterRules: Array<{ rule: HeaderRowRule | FooterRowRule; card: InlineCard }>,
    fullCardRules: Array<{ rule: FullCardRowRule; card: InlineCard }>
  ): void {
    const currentZoneKeys = new Set<string>();
    // Collect roots to unmount after changeViewZones completes
    const rootsToUnmount: ReactDOM.Root[] = [];

    console.log('[RowRuleRenderer] Applying view zones in single transaction:', {
      viewZoneRules: viewZoneRules.length,
      headerFooterRules: headerFooterRules.length,
      fullCardRules: fullCardRules.length,
    });
    
    // Log all incoming rules for debugging
    for (const { rule, card } of viewZoneRules) {
      console.log('[RowRuleRenderer] ViewZone rule:', {
        key: `viewzone-${rule.zonePosition}-${rule.lineNumber}`,
        cardId: card.id,
        heightInPx: rule.heightInPx,
        zonePosition: rule.zonePosition,
      });
    }
    
    // Log current state of view zones
    console.log('[RowRuleRenderer] Current zones before update:', 
      Array.from(this.viewZones.entries()).map(([key, info]) => ({
        key,
        heightInPx: info.heightInPx,
        afterLineNumber: info.afterLineNumber,
      }))
    );

    // Sort view zone rules to ensure consistent ordering:
    // 1. Sort by afterLineNumber (ascending)
    // 2. For same afterLineNumber: footers before headers (footers of previous cards before headers of next cards)
    const sortedViewZoneRules = [...viewZoneRules].sort((a, b) => {
      const aAfterLine = a.rule.afterLineNumber !== undefined
        ? a.rule.afterLineNumber
        : (a.rule.zonePosition === 'header' ? Math.max(0, a.rule.lineNumber - 1) : a.rule.lineNumber);
      const bAfterLine = b.rule.afterLineNumber !== undefined
        ? b.rule.afterLineNumber
        : (b.rule.zonePosition === 'header' ? Math.max(0, b.rule.lineNumber - 1) : b.rule.lineNumber);
      
      if (aAfterLine !== bAfterLine) {
        return aAfterLine - bAfterLine;
      }
      // Same afterLineNumber: footers before headers
      // This ensures heading padding (footer) comes before wod-block header
      if (a.rule.zonePosition === 'footer' && b.rule.zonePosition === 'header') return -1;
      if (a.rule.zonePosition === 'header' && b.rule.zonePosition === 'footer') return 1;
      return 0;
    });

    this.editor.changeViewZones((accessor) => {
      // IMPORTANT: First remove ALL old zones, then add new ones in sorted order
      // This ensures consistent zone ordering regardless of when zones were originally created
      const zonesToKeep = new Map<string, { rule: ViewZoneRule; card: InlineCard; afterLineNumber: number }>();
      
      // 1. Identify which zones we need
      for (const { rule, card } of sortedViewZoneRules) {
        const key = `viewzone-${rule.zonePosition}-${rule.lineNumber}`;
        currentZoneKeys.add(key);
        
        const afterLineNumber = rule.afterLineNumber !== undefined
          ? rule.afterLineNumber
          : (rule.zonePosition === 'header' 
            ? Math.max(0, rule.lineNumber - 1) 
            : rule.lineNumber);
        
        zonesToKeep.set(key, { rule, card, afterLineNumber });
      }
      
      // 2. Remove ALL existing view zones (we'll re-add them in correct order)
      const existingZonesToReuse = new Map<string, ViewZoneInfo>();
      for (const [key, zone] of this.viewZones) {
        const keepInfo = zonesToKeep.get(key);
        if (keepInfo) {
          // Check if we can reuse this zone (same height and position)
          const heightSame = Math.abs(zone.heightInPx - keepInfo.rule.heightInPx) <= 1;
          const positionSame = zone.afterLineNumber === keepInfo.afterLineNumber;
          
          if (heightSame && positionSame) {
            // Keep existing zone - don't remove
            existingZonesToReuse.set(key, zone);
            continue;
          }
        }
        // Remove this zone (either not needed or needs recreation)
        accessor.removeZone(zone.zoneId);
        if (!zonesToKeep.has(key)) {
          rootsToUnmount.push(zone.root);
          this.viewZones.delete(key);
        }
      }
      
      // 3. Add/update zones in sorted order
      for (const { rule, card } of sortedViewZoneRules) {
        const key = `viewzone-${rule.zonePosition}-${rule.lineNumber}`;
        const keepInfo = zonesToKeep.get(key)!;
        const existing = existingZonesToReuse.get(key);
        
        if (existing) {
          // Zone already exists with correct height/position - skip
          continue;
        }
        
        // Need to create or recreate this zone
        const oldZone = this.viewZones.get(key);
        
        if (oldZone) {
          // Recreate with existing DOM node
          console.log('[RowRuleRenderer] Recreating view zone:', {
            key,
            afterLineNumber: keepInfo.afterLineNumber,
            heightInPx: rule.heightInPx,
          });
          
          const zoneId = accessor.addZone({
            afterLineNumber: keepInfo.afterLineNumber,
            heightInPx: rule.heightInPx,
            domNode: oldZone.domNode,
            suppressMouseDown: false,
          });
          
          oldZone.zoneId = zoneId;
          oldZone.heightInPx = rule.heightInPx;
          oldZone.afterLineNumber = keepInfo.afterLineNumber;
        } else {
          // Create brand new zone
          const domNode = document.createElement('div');
          domNode.className = `row-rule-zone ${rule.zonePosition}-zone ${rule.className || ''} card-type-${rule.cardType}`;
          
          const root = ReactDOM.createRoot(domNode);
          
          // Render header or footer component, or custom content
          if (rule.renderContent) {
            root.render(rule.renderContent({
              cardType: rule.cardType,
              lineNumber: rule.lineNumber,
              title: rule.title,
              icon: rule.icon,
              actions: rule.actions,
              onAction: (actionId) => this.onAction?.(card.id, actionId),
            }));
          } else if (rule.zonePosition === 'header') {
            root.render(
              React.createElement(CardHeader, {
                cardType: rule.cardType,
                title: rule.title,
                icon: rule.icon,
              })
            );
          } else {
            root.render(
              React.createElement(CardFooter, {
                cardType: rule.cardType,
                actions: rule.actions || [],
                onAction: (action) => {
                  this.onAction?.(card.id, action);
                },
              })
            );
          }

          console.log('[RowRuleRenderer] Creating new view zone:', {
            key,
            position: rule.zonePosition,
            afterLineNumber: keepInfo.afterLineNumber,
            heightInPx: rule.heightInPx,
            cardType: rule.cardType,
            title: rule.title,
          });

          const zoneId = accessor.addZone({
            afterLineNumber: keepInfo.afterLineNumber,
            heightInPx: rule.heightInPx,
            domNode,
            suppressMouseDown: false,
          });

          this.viewZones.set(key, {
            zoneId,
            root,
            domNode,
            lineNumber: rule.lineNumber,
            ruleType: `view-zone-${rule.zonePosition}`,
            heightInPx: rule.heightInPx,
            afterLineNumber: keepInfo.afterLineNumber,
          });
        }
      }

      // 2. Process HeaderRowRule/FooterRowRule types
      for (const { rule, card } of headerFooterRules) {
        const key = `${rule.overrideType}-${rule.lineNumber}`;
        currentZoneKeys.add(key);
        
        const existing = this.viewZones.get(key);
        const heightInPx = 32; // Compact header/footer height (fixed)
        const afterLineNumber = rule.lineNumber - 1;
        
        if (!existing) {
          // Create new view zone
          const domNode = document.createElement('div');
          domNode.className = `row-rule-zone ${rule.overrideType}-zone ${rule.className || ''}`;
          
          const root = ReactDOM.createRoot(domNode);
          
          // Render header or footer component
          if (rule.overrideType === 'header') {
            root.render(
              React.createElement(CardHeader, {
                cardType: (rule as HeaderRowRule).cardType,
                title: (rule as HeaderRowRule).title,
                icon: (rule as HeaderRowRule).icon,
              })
            );
          } else {
            root.render(
              React.createElement(CardFooter, {
                cardType: (rule as FooterRowRule).cardType,
                actions: (rule as FooterRowRule).actions || [],
                onAction: (action) => {
                  this.onAction?.(card.id, action);
                },
              })
            );
          }

          const zoneId = accessor.addZone({
            afterLineNumber,
            heightInPx,
            domNode,
            suppressMouseDown: false,
          });

          this.viewZones.set(key, {
            zoneId,
            root,
            domNode,
            lineNumber: rule.lineNumber,
            ruleType: rule.overrideType,
            heightInPx,
            afterLineNumber,
          });
        }
      }

      // 3. Process FullCardRowRule types
      for (const { rule, card } of fullCardRules) {
        const key = `full-card-${rule.lineNumber}`;
        currentZoneKeys.add(key);
        
        const existing = this.viewZones.get(key);
        const model = this.editor.getModel();
        const afterLineNumber = rule.lineNumber - 1;
        
        const renderProps: CardRenderProps = {
          sourceRange: card.sourceRange,
          sourceText: model?.getLineContent(rule.lineNumber) || '',
          displayMode: card.isEditing ? 'half-screen' : 'beside',
          isEditing: card.isEditing,
          onEdit: () => this.focusLine(rule.lineNumber),
          onAction: (action, payload) => this.onAction?.(card.id, action, payload),
        };

        // Check if we need to update an existing zone (height changed)
        if (existing && existing.heightInPx !== rule.heightPx) {
          console.log('[RowRuleRenderer] Updating full-card view zone height:', {
            key,
            oldHeight: existing.heightInPx,
            newHeight: rule.heightPx,
          });
          
          // Remove old zone and create new one with updated height
          accessor.removeZone(existing.zoneId);
          
          const zoneId = accessor.addZone({
            afterLineNumber,
            heightInPx: rule.heightPx,
            domNode: existing.domNode,
            suppressMouseDown: false,
          });
          
          // Update the stored info with new zone ID and height
          existing.zoneId = zoneId;
          existing.heightInPx = rule.heightPx;
          existing.afterLineNumber = afterLineNumber;
          
          // Also update content
          existing.root.render(rule.renderCard(renderProps));
          continue;
        }

        if (!existing) {
          const domNode = document.createElement('div');
          domNode.className = `full-card-zone card-type-${rule.cardType}`;
          
          const root = ReactDOM.createRoot(domNode);
          root.render(rule.renderCard(renderProps));

          const zoneId = accessor.addZone({
            afterLineNumber,
            heightInPx: rule.heightPx,
            domNode,
            suppressMouseDown: false,
          });

          this.viewZones.set(key, {
            zoneId,
            root,
            domNode,
            lineNumber: rule.lineNumber,
            ruleType: 'full-card',
            heightInPx: rule.heightPx,
            afterLineNumber,
          });
        } else {
          // Update existing content (height unchanged)
          existing.root.render(rule.renderCard(renderProps));
        }
      }

      // 4. Remove all old view zones in single pass
      for (const [key, zone] of this.viewZones) {
        if (!currentZoneKeys.has(key)) {
          accessor.removeZone(zone.zoneId);
          rootsToUnmount.push(zone.root);
          this.viewZones.delete(key);
        }
      }
    });

    // Defer React root unmounts to avoid race condition during React rendering
    safeUnmountRoots(rootsToUnmount);
  }

  /**
   * Apply styled rules using decorations
   */
  private applyStyledRules(
    rules: Array<{ rule: StyledRowRule; card: InlineCard }>
  ): void {
    const decorations: editor.IModelDeltaDecoration[] = [];
    const model = this.editor.getModel();
    if (!model) return;

    for (const { rule } of rules) {
      const lineLength = model.getLineLength(rule.lineNumber);
      const { decoration } = rule;

      // Whole line decoration
      if (decoration?.isWholeLine) {
        decorations.push({
          range: new Range(rule.lineNumber, 1, rule.lineNumber, lineLength + 1),
          options: {
            isWholeLine: true,
            className: rule.className,
            inlineClassName: decoration.inlineClassName,
            beforeContentClassName: decoration.beforeContentClassName,
            afterContentClassName: decoration.afterContentClassName,
            stickiness: editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }

      // Hide prefix (e.g., "# " for headings, "> " for blockquotes)
      if (decoration?.hidePrefix && decoration.prefixLength) {
        decorations.push({
          range: new Range(rule.lineNumber, 1, rule.lineNumber, decoration.prefixLength + 1),
          options: {
            inlineClassName: 'hidden-prefix opacity-30 text-xs',
            stickiness: editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }
    }

    // Apply all decorations using the collection
    this.decorationsCollection.set(decorations);
  }

  /**
   * Apply overlay rules using manually positioned DOM elements
   * 
   * Monaco overlay widgets don't support line-relative positioning well.
   * Content widgets move with text but can't handle horizontal splits.
   * 
   * Solution: Create DOM elements in a dedicated overlay container and
   * manually position them based on line coordinates, updating on scroll.
   */
  private applyOverlayRules(
    rules: Array<{ rule: OverlayRowRule; card: InlineCard }>
  ): void {
    const currentOverlayIds = new Set<string>();
    const model = this.editor.getModel();
    if (!model) return;

    // Get or create overlay container
    const editorDomNode = this.editor.getDomNode();
    if (!editorDomNode) return;
    
    let overlayContainer = editorDomNode.querySelector('.row-overlay-container') as HTMLElement;
    if (!overlayContainer) {
      overlayContainer = document.createElement('div');
      overlayContainer.className = 'row-overlay-container';
      overlayContainer.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; z-index: 100;';
      editorDomNode.appendChild(overlayContainer);
    }
    
    // Update CSS custom property for scrollbar/minimap offset (used by mobile CSS)
    const layout = this.editor.getLayoutInfo();
    const editorRightOffset = layout.verticalScrollbarWidth + layout.minimap.minimapWidth;
    overlayContainer.style.setProperty('--editor-right-offset', `${editorRightOffset}px`);

    for (const { rule, card } of rules) {
      const overlayId = rule.overlayId || `overlay-${rule.lineNumber}`;
      currentOverlayIds.add(overlayId);

      const existing = this.overlays.get(overlayId);
      
      // Gather source lines
      const spanLines = rule.spanLines || { startLine: rule.lineNumber, endLine: rule.lineNumber };
      const sourceLines: string[] = [];
      for (let line = spanLines.startLine; line <= spanLines.endLine; line++) {
        if (line <= model.getLineCount()) {
          sourceLines.push(model.getLineContent(line));
        }
      }

      const renderProps: OverlayRenderProps = {
        lineNumber: rule.lineNumber,
        sourceText: sourceLines.join('\n'),
        sourceLines,
        lineRange: spanLines,
        isEditing: card.isEditing,
        cursorLine: card.isEditing ? this.editor.getPosition()?.lineNumber : undefined,
        onEdit: (lineNum) => this.focusLine(lineNum || rule.lineNumber),
        onAction: (action, payload) => this.onAction?.(card.id, action, payload),
      };

      if (!existing) {
        // Create new overlay DOM element
        const domNode = document.createElement('div');
        domNode.className = `row-overlay ${rule.position}-overlay overlay-${card.cardType}`;
        domNode.style.cssText = 'position: absolute; pointer-events: auto;';
        
        // Set width
        if (typeof rule.overlayWidth === 'number') {
          domNode.style.width = `${rule.overlayWidth}px`;
        } else {
          domNode.style.width = rule.overlayWidth || '300px';
        }
        
        const root = ReactDOM.createRoot(domNode);
        root.render(rule.renderOverlay(renderProps));

        // Add to container
        overlayContainer.appendChild(domNode);

        // Create scroll listener for position updates
        const updatePosition = () => {
          this.positionOverlayElement(domNode, rule, spanLines);
        };

        // Initial position
        updatePosition();

        // Listen for scroll changes
        const scrollDisposable = this.editor.onDidScrollChange(updatePosition);
        const layoutDisposable = this.editor.onDidLayoutChange(updatePosition);

        this.overlays.set(overlayId, { 
          widgetId: overlayId,
          root, 
          domNode, 
          overlayId,
          spanLines,
          rule,
          scrollListener: () => {
            scrollDisposable.dispose();
            layoutDisposable.dispose();
          },
        });
      } else {
        // Update existing overlay
        existing.root.render(rule.renderOverlay(renderProps));
        this.positionOverlayElement(existing.domNode, rule, spanLines);
      }
    }

    // Remove old overlays
    const overlayRootsToUnmount: ReactDOM.Root[] = [];
    for (const [id, overlay] of this.overlays) {
      if (!currentOverlayIds.has(id)) {
        overlay.scrollListener?.();
        overlay.domNode.remove();
        overlayRootsToUnmount.push(overlay.root);
        this.overlays.delete(id);
      }
    }
    // Defer React root unmounts to avoid race condition during React rendering
    safeUnmountRoots(overlayRootsToUnmount);
  }

  /**
   * Position an overlay element relative to its spanning lines
   */
  private positionOverlayElement(
    domNode: HTMLElement,
    rule: OverlayRowRule,
    spanLines: { startLine: number; endLine: number }
  ): void {
    const layout = this.editor.getLayoutInfo();
    const scrollTop = this.editor.getScrollTop();
    const lineHeight = this.editor.getOption(editor.EditorOption.lineHeight);
    
    // Get the top position of the start line
    const startLineTop = this.editor.getTopForLineNumber(spanLines.startLine);
    const lineCount = spanLines.endLine - spanLines.startLine + 1;
    const lineBasedHeight = lineCount * lineHeight;
    
    // Calculate position relative to viewport, with optional offset
    const topOffset = rule.topOffset || 0;
    const top = startLineTop - scrollTop + topOffset;
    
    console.log('[RowRuleRenderer] Positioning overlay:', {
      overlayId: rule.overlayId,
      spanLines,
      startLineTop,
      scrollTop,
      topOffset,
      calculatedTop: top,
      fixedHeight: rule.fixedHeight,
    });
    
    // Position the overlay
    domNode.style.top = `${top}px`;
    
    // Determine height based on mode
    if (rule.heightMode === 'fixed' && rule.fixedHeight) {
      domNode.style.height = `${rule.fixedHeight}px`;
    } else if (rule.heightMode === 'match-lines') {
      domNode.style.height = `${lineBasedHeight}px`;
    } else {
      domNode.style.height = 'auto';
    }
    
    if (rule.position === 'right') {
      // Position on the right 50% of the editor, accounting for scrollbar and minimap
      // Use calc() to properly compute width minus the scrollbar area
      const rightOffset = layout.verticalScrollbarWidth + layout.minimap.minimapWidth;
      domNode.style.left = '50%';
      domNode.style.right = 'auto';
      // Adjust width to account for the scrollbar/minimap, subtract half their width from the 50%
      domNode.style.width = `calc(50% - ${rightOffset}px)`;
    } else {
      domNode.style.left = `${layout.contentLeft}px`;
      domNode.style.right = 'auto';
    }
  }

  /**
   * Focus the editor on a specific line
   */
  private focusLine(lineNumber: number): void {
    this.editor.setPosition({ lineNumber, column: 1 });
    this.editor.revealLine(lineNumber);
    this.editor.focus();
  }

  /**
   * Clear all rendered elements
   */
  clear(): void {
    // Clear hidden areas first (use coordinator if available)
    this.hiddenAreas = [];
    if (this.hiddenAreasCoordinator) {
      this.hiddenAreasCoordinator.clearHiddenAreas(HIDDEN_AREAS_SOURCE_ID);
    } else {
      (this.editor as any).setHiddenAreas([]);
    }

    // Collect React roots to unmount after synchronous cleanup
    // This prevents "Attempted to synchronously unmount a root while React was already rendering" warnings
    const rootsToUnmount: ReactDOM.Root[] = [];

    // Remove view zones
    this.editor.changeViewZones((accessor) => {
      for (const zone of this.viewZones.values()) {
        accessor.removeZone(zone.zoneId);
        rootsToUnmount.push(zone.root);
      }
    });
    this.viewZones.clear();

    // Remove overlays (manually positioned DOM elements)
    for (const overlay of this.overlays.values()) {
      overlay.scrollListener?.();
      overlay.domNode.remove();
      rootsToUnmount.push(overlay.root);
    }
    this.overlays.clear();
    
    // Remove overlay container
    const editorDomNode = this.editor.getDomNode();
    if (editorDomNode) {
      const overlayContainer = editorDomNode.querySelector('.row-overlay-container');
      if (overlayContainer) {
        overlayContainer.remove();
      }
    }

    // Clear decorations
    this.decorationsCollection.clear();

    // Defer React root unmounts to avoid race condition during React rendering
    safeUnmountRoots(rootsToUnmount);
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
  }
}
