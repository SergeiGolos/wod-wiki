/**
 * RowRuleRenderer - Applies row rules to Monaco editor
 * 
 * This renderer takes row rules from cards and applies them to Monaco using:
 * - View zones for headers/footers/full-cards
 * - Decorations for styled rows
 * - Overlay widgets for inline overlays
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
  widget: editor.IOverlayWidget;
  root: ReactDOM.Root;
  domNode: HTMLDivElement;
  overlayId: string;
}

export class RowRuleRenderer {
  private editor: editor.IStandaloneCodeEditor;
  private viewZones: Map<string, ViewZoneInfo> = new Map();
  private overlays: Map<string, OverlayInfo> = new Map();
  private decorations: string[] = [];
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

    // Group rules by type for efficient processing
    const headerFooterRules: Array<{ rule: HeaderRowRule | FooterRowRule; card: InlineCard }> = [];
    const styledRules: Array<{ rule: StyledRowRule; card: InlineCard }> = [];
    const overlayRules: Array<{ rule: OverlayRowRule; card: InlineCard }> = [];
    const fullCardRules: Array<{ rule: FullCardRowRule; card: InlineCard }> = [];

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
        case 'grouped-content':
          // Grouped content doesn't create UI directly - it's handled by parent overlay
          break;
      }
    }

    // Apply each type
    this.applyHeaderFooterRules(headerFooterRules);
    this.applyStyledRules(styledRules);
    this.applyOverlayRules(overlayRules);
    this.applyFullCardRules(fullCardRules);
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
   * Apply overlay rules using overlay widgets
   */
  private applyOverlayRules(
    rules: Array<{ rule: OverlayRowRule; card: InlineCard }>
  ): void {
    const currentOverlayIds = new Set<string>();
    const model = this.editor.getModel();
    if (!model) return;

    for (const { rule, card } of rules) {
      const overlayId = rule.overlayId || `overlay-${rule.lineNumber}`;
      currentOverlayIds.add(overlayId);

      const existing = this.overlays.get(overlayId);
      
      // Gather source lines
      const spanLines = rule.spanLines || { startLine: rule.lineNumber, endLine: rule.lineNumber };
      const sourceLines: string[] = [];
      for (let line = spanLines.startLine; line <= spanLines.endLine; line++) {
        sourceLines.push(model.getLineContent(line));
      }

      const renderProps: OverlayRenderProps = {
        lineNumber: rule.lineNumber,
        sourceText: sourceLines.join('\n'),
        sourceLines,
        lineRange: spanLines,
        isEditing: card.isEditing,
        cursorLine: card.isEditing ? this.editor.getPosition()?.lineNumber : undefined,
        onEdit: (lineNum) => this.focusLine(lineNum || rule.lineNumber),
      };

      if (!existing) {
        // Create new overlay
        const domNode = document.createElement('div');
        domNode.className = `row-overlay ${rule.position}-overlay overlay-${card.cardType}`;
        domNode.style.width = typeof rule.overlayWidth === 'number' 
          ? `${rule.overlayWidth}px` 
          : rule.overlayWidth || '300px';
        
        const root = ReactDOM.createRoot(domNode);
        root.render(rule.renderOverlay(renderProps));

        const widget: editor.IOverlayWidget = {
          getId: () => overlayId,
          getDomNode: () => domNode,
          getPosition: () => {
            return this.calculateOverlayPosition(rule, spanLines);
          },
        };

        this.editor.addOverlayWidget(widget);
        this.overlays.set(overlayId, { widget, root, domNode, overlayId });
      } else {
        // Update existing overlay
        existing.root.render(rule.renderOverlay(renderProps));
      }
    }

    // Remove old overlays
    for (const [id, overlay] of this.overlays) {
      if (!currentOverlayIds.has(id)) {
        this.editor.removeOverlayWidget(overlay.widget);
        overlay.root.unmount();
        this.overlays.delete(id);
      }
    }
  }

  /**
   * Calculate overlay position based on rule and line range
   * Note: Monaco overlay widgets don't support line-relative positioning directly.
   * We use content widgets for better positioning, or manually position overlays.
   */
  private calculateOverlayPosition(
    rule: OverlayRowRule, 
    spanLines: { startLine: number; endLine: number }
  ): editor.IOverlayWidgetPosition | null {
    // Overlay widgets in Monaco use absolute positioning
    // For line-relative overlays, we need to use a different approach
    // or handle positioning manually in the DOM
    return null; // Let the overlay position itself based on line coordinates
  }

  /**
   * Position an overlay element relative to a line
   */
  private positionOverlayAtLine(
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
    const totalHeight = lineCount * lineHeight;
    
    // Calculate position
    const top = startLineTop - scrollTop;
    const editorWidth = layout.width;
    const contentLeft = layout.contentLeft;
    
    // Position the overlay
    domNode.style.position = 'absolute';
    domNode.style.top = `${top}px`;
    domNode.style.height = rule.heightMode === 'match-lines' ? `${totalHeight}px` : 'auto';
    
    if (rule.position === 'right') {
      // Position on the right side
      const overlayWidth = typeof rule.overlayWidth === 'number' 
        ? rule.overlayWidth 
        : parseInt(rule.overlayWidth || '300', 10);
      domNode.style.right = '0';
      domNode.style.left = 'auto';
    } else {
      domNode.style.left = `${contentLeft}px`;
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
    // Remove view zones
    this.editor.changeViewZones((accessor) => {
      for (const zone of this.viewZones.values()) {
        accessor.removeZone(zone.zoneId);
        zone.root.unmount();
      }
    });
    this.viewZones.clear();

    // Remove overlays
    for (const overlay of this.overlays.values()) {
      this.editor.removeOverlayWidget(overlay.widget);
      overlay.root.unmount();
    }
    this.overlays.clear();

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
