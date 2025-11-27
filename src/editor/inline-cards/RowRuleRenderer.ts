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
  GroupedContentRowRule,
  FullCardRowRule,
  HiddenAreaRule,
  ViewZoneRule,
  InlineCard,
  OverlayRenderProps,
  CardRenderProps,
} from './row-types';
import { CardHeader } from './components/CardHeader';
import { CardFooter } from './components/CardFooter';

interface ViewZoneInfo {
  zoneId: string;
  root: ReactDOM.Root;
  domNode: HTMLDivElement;
  lineNumber: number;
  ruleType: string;
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

export class RowRuleRenderer {
  private editor: editor.IStandaloneCodeEditor;
  private viewZones: Map<string, ViewZoneInfo> = new Map();
  private overlays: Map<string, OverlayInfo> = new Map();
  private decorations: string[] = [];
  private hiddenAreas: Range[] = [];
  private onAction?: (cardId: string, action: string, payload?: unknown) => void;
  
  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onAction?: (cardId: string, action: string, payload?: unknown) => void
  ) {
    this.editor = editorInstance;
    this.onAction = onAction;
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

    // Debug logging for grouped rules
    console.log('[RowRuleRenderer] Rule breakdown:', {
      hiddenAreas: hiddenAreaRules.length,
      viewZones: viewZoneRules.length,
      headerFooter: headerFooterRules.length,
      styled: styledRules.length,
      overlays: overlayRules.length,
      fullCards: fullCardRules.length,
    });

    // Apply each type in correct order:
    // 1. Hidden areas first (affects line numbers)
    this.applyHiddenAreaRules(hiddenAreaRules);
    // 2. View zones for headers/footers (replace hidden lines)
    this.applyViewZoneRules(viewZoneRules);
    // 3. Legacy header/footer rules
    this.applyHeaderFooterRules(headerFooterRules);
    // 4. Decorations for styling
    this.applyStyledRules(styledRules);
    // 5. Overlays for side-by-side views
    this.applyOverlayRules(overlayRules);
    // 6. Full card replacements
    this.applyFullCardRules(fullCardRules);
  }

  /**
   * Apply hidden area rules using Monaco's setHiddenAreas
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
      (this.editor as any).setHiddenAreas(newHiddenAreas);
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
   */
  private applyViewZoneRules(
    rules: Array<{ rule: ViewZoneRule; card: InlineCard }>
  ): void {
    const currentZoneKeys = new Set<string>();

    console.log('[RowRuleRenderer] Applying', rules.length, 'view zone rules');

    this.editor.changeViewZones((accessor) => {
      for (const { rule, card } of rules) {
        const key = `viewzone-${rule.zonePosition}-${rule.lineNumber}`;
        currentZoneKeys.add(key);
        
        const existing = this.viewZones.get(key);
        
        if (!existing) {
          // Create new view zone
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

          // Position: header appears after previous line, footer appears after this line
          // For line 1, afterLineNumber would be 0 which Monaco handles correctly
          // Use explicit afterLineNumber if provided (for cases where auto-calculation would reference a hidden line)
          const afterLineNumber = rule.afterLineNumber !== undefined
            ? rule.afterLineNumber
            : (rule.zonePosition === 'header' 
              ? Math.max(0, rule.lineNumber - 1) 
              : rule.lineNumber);

          console.log('[RowRuleRenderer] Creating view zone:', {
            key,
            position: rule.zonePosition,
            afterLineNumber,
            heightInPx: rule.heightInPx,
            cardType: rule.cardType,
          });

          const zoneId = accessor.addZone({
            afterLineNumber,
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
          });
        }
      }

      // Remove old view zones
      for (const [key, zone] of this.viewZones) {
        if (!currentZoneKeys.has(key) && key.startsWith('viewzone-')) {
          accessor.removeZone(zone.zoneId);
          zone.root.unmount();
          this.viewZones.delete(key);
        }
      }
    });
  }

  /**
   * Apply header and footer rules using view zones
   */
  private applyHeaderFooterRules(
    rules: Array<{ rule: HeaderRowRule | FooterRowRule; card: InlineCard }>
  ): void {
    const currentZoneKeys = new Set<string>();

    this.editor.changeViewZones((accessor) => {
      for (const { rule, card } of rules) {
        const key = `${rule.overrideType}-${rule.lineNumber}`;
        currentZoneKeys.add(key);
        
        const existing = this.viewZones.get(key);
        
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
            afterLineNumber: rule.lineNumber - 1,
            heightInPx: 32, // Compact header/footer height
            domNode,
            suppressMouseDown: false,
          });

          this.viewZones.set(key, {
            zoneId,
            root,
            domNode,
            lineNumber: rule.lineNumber,
            ruleType: rule.overrideType,
          });
        }
      }

      // Remove old zones
      for (const [key, zone] of this.viewZones) {
        if (!currentZoneKeys.has(key) && (key.startsWith('header-') || key.startsWith('footer-'))) {
          accessor.removeZone(zone.zoneId);
          zone.root.unmount();
          this.viewZones.delete(key);
        }
      }
    });
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
          },
        });
      }

      // Hide prefix (e.g., "# " for headings, "> " for blockquotes)
      if (decoration?.hidePrefix && decoration.prefixLength) {
        decorations.push({
          range: new Range(rule.lineNumber, 1, rule.lineNumber, decoration.prefixLength + 1),
          options: {
            inlineClassName: 'hidden-prefix opacity-30 text-xs',
          },
        });
      }
    }

    // Apply all decorations
    this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
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
    for (const [id, overlay] of this.overlays) {
      if (!currentOverlayIds.has(id)) {
        overlay.scrollListener?.();
        overlay.domNode.remove();
        overlay.root.unmount();
        this.overlays.delete(id);
      }
    }
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
   * Update overlay height to match spanning lines or fixed height
   */
  private updateOverlayHeight(
    domNode: HTMLElement,
    rule: OverlayRowRule,
    spanLines: { startLine: number; endLine: number }
  ): void {
    if (rule.heightMode === 'fixed' && rule.fixedHeight) {
      domNode.style.height = `${rule.fixedHeight}px`;
    } else if (rule.heightMode === 'match-lines') {
      const lineHeight = this.editor.getOption(editor.EditorOption.lineHeight);
      const lineCount = spanLines.endLine - spanLines.startLine + 1;
      const totalHeight = lineCount * lineHeight;
      domNode.style.height = `${totalHeight}px`;
    }
  }

  /**
   * Apply full-card rules using view zones
   */
  private applyFullCardRules(
    rules: Array<{ rule: FullCardRowRule; card: InlineCard }>
  ): void {
    const currentKeys = new Set<string>();

    this.editor.changeViewZones((accessor) => {
      for (const { rule, card } of rules) {
        const key = `full-card-${rule.lineNumber}`;
        currentKeys.add(key);
        
        const existing = this.viewZones.get(key);
        const model = this.editor.getModel();
        
        const renderProps: CardRenderProps = {
          sourceRange: card.sourceRange,
          sourceText: model?.getLineContent(rule.lineNumber) || '',
          displayMode: card.isEditing ? 'half-screen' : 'beside',
          isEditing: card.isEditing,
          onEdit: () => this.focusLine(rule.lineNumber),
          onAction: (action, payload) => this.onAction?.(card.id, action, payload),
        };

        if (!existing) {
          const domNode = document.createElement('div');
          domNode.className = `full-card-zone card-type-${rule.cardType}`;
          
          const root = ReactDOM.createRoot(domNode);
          root.render(rule.renderCard(renderProps));

          const zoneId = accessor.addZone({
            afterLineNumber: rule.lineNumber - 1,
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
          });
        } else {
          // Update existing
          existing.root.render(rule.renderCard(renderProps));
        }
      }

      // Remove old full-card zones
      for (const [key, zone] of this.viewZones) {
        if (!currentKeys.has(key) && key.startsWith('full-card-')) {
          accessor.removeZone(zone.zoneId);
          zone.root.unmount();
          this.viewZones.delete(key);
        }
      }
    });
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
    // Clear hidden areas first
    this.hiddenAreas = [];
    (this.editor as any).setHiddenAreas([]);

    // Remove view zones
    this.editor.changeViewZones((accessor) => {
      for (const zone of this.viewZones.values()) {
        accessor.removeZone(zone.zoneId);
        zone.root.unmount();
      }
    });
    this.viewZones.clear();

    // Remove overlays (manually positioned DOM elements)
    for (const overlay of this.overlays.values()) {
      overlay.scrollListener?.();
      overlay.domNode.remove();
      overlay.root.unmount();
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
    this.decorations = this.editor.deltaDecorations(this.decorations, []);
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
  }
}
