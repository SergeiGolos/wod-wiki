/**
 * Inline Widget Card System - Main Manager
 * 
 * Coordinates parsing, rendering, and display mode management for all
 * inline widget cards in the Monaco editor.
 */

import { editor, Range } from 'monaco-editor';
import { createRoot, Root } from 'react-dom/client';
import { InlineWidgetCard, CardContent, CardCallbacks } from './types';
import { CARD_TYPE_CONFIGS, CARD_SYSTEM_CONFIG } from './config';
import { CardParser } from './CardParser';
import { CardRenderer } from './CardRenderer';
import { HiddenAreasCoordinator } from '../utils/HiddenAreasCoordinator';

interface ViewZoneInfo {
  zoneId: string;
  root: Root;
  domNode: HTMLDivElement;
  card: InlineWidgetCard;
}

export class InlineWidgetCardManager {
  private editor: editor.IStandaloneCodeEditor;
  private hiddenAreasCoordinator?: HiddenAreasCoordinator;
  private cards: Map<string, InlineWidgetCard> = new Map();
  private viewZones: Map<string, ViewZoneInfo> = new Map();
  private decorations: string[] = [];
  private monaco: any;
  private parser: CardParser;
  private renderer: CardRenderer;
  private disposables: { dispose(): void }[] = [];
  
  // State tracking for optimization
  private lastCursorLine: number = -1;
  private lastContentVersion: number = -1;
  private parseDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private displayModeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  // External callbacks
  private onCardAction?: (card: InlineWidgetCard, action: string, payload?: unknown) => void;
  
  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onCardAction?: (card: InlineWidgetCard, action: string, payload?: unknown) => void,
    hiddenAreasCoordinator?: HiddenAreasCoordinator
  ) {
    this.editor = editorInstance;
    this.hiddenAreasCoordinator = hiddenAreasCoordinator;
    this.monaco = (window as any).monaco;
    this.parser = new CardParser();
    this.renderer = new CardRenderer();
    this.onCardAction = onCardAction;
    
    // Initialize event listeners
    this.setupEventListeners();
    
    // Initial parse
    this.parseContent();
    
    if (CARD_SYSTEM_CONFIG.debug) {
      console.log('[InlineWidgetCardManager] Initialized');
    }
  }
  
  private setupEventListeners(): void {
    // Cursor position changes - triggers display mode updates
    // Debounced to avoid conflicting with other view zone managers
    const cursorDisposable = this.editor.onDidChangeCursorPosition((e) => {
      const newLine = e.position.lineNumber;
      if (newLine !== this.lastCursorLine) {
        this.lastCursorLine = newLine;
        this.debouncedUpdateDisplayModes();
      }
    });
    this.disposables.push(cursorDisposable);
    
    // Content changes - triggers full reparse
    const contentDisposable = this.editor.onDidChangeModelContent(() => {
      this.debouncedParseContent();
    });
    this.disposables.push(contentDisposable);
    
    // Model change - reparse when document changes
    const modelDisposable = this.editor.onDidChangeModel(() => {
      this.lastContentVersion = -1;
      this.parseContent();
    });
    this.disposables.push(modelDisposable);
  }
  
  private debouncedParseContent(): void {
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    this.parseDebounceTimer = setTimeout(() => {
      this.parseContent();
    }, CARD_SYSTEM_CONFIG.parseDebounceMs);
  }
  
  private debouncedUpdateDisplayModes(): void {
    if (this.displayModeDebounceTimer) {
      clearTimeout(this.displayModeDebounceTimer);
    }
    // Use a small delay to allow other view zone managers to settle
    // This prevents deltaDecorations from collapsing view zones created by WodBlockSplitViewFeature
    this.displayModeDebounceTimer = setTimeout(() => {
      this.updateDisplayModes();
    }, 50);
  }
  
  private parseContent(): void {
    const model = this.editor.getModel();
    if (!model) return;
    
    const version = model.getVersionId();
    if (version === this.lastContentVersion) return;
    this.lastContentVersion = version;
    
    if (CARD_SYSTEM_CONFIG.debug) {
      console.log('[InlineWidgetCardManager] Parsing content, version:', version);
    }
    
    // Parse all cards from content
    const newCards = this.parser.parseAllCards(model);
    
    // Convert to map and merge with existing cards
    const updatedCards = new Map<string, InlineWidgetCard>();
    for (const card of newCards) {
      const existing = this.cards.get(card.id);
      if (existing && this.cardContentEquals(existing.content, card.content)) {
        // Content unchanged - keep existing display mode
        card.displayMode = existing.displayMode;
      }
      updatedCards.set(card.id, card);
    }
    
    // Remove view zones for cards that no longer exist
    for (const [id] of this.cards) {
      if (!updatedCards.has(id)) {
        this.removeViewZone(id);
      }
    }
    
    this.cards = updatedCards;
    
    if (CARD_SYSTEM_CONFIG.debug) {
      console.log('[InlineWidgetCardManager] Parsed', this.cards.size, 'cards');
    }
    
    this.updateDisplayModes();
  }
  
  private cardContentEquals(a: CardContent, b: CardContent): boolean {
    // Simple JSON comparison - could be optimized per card type
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  private updateDisplayModes(): void {
    const cursorLine = this.lastCursorLine;
    
    for (const card of this.cards.values()) {
      const cursorInside = this.isCursorInRange(cursorLine, card.sourceRange);
      const config = CARD_TYPE_CONFIGS[card.cardType];
      
      if (cursorInside) {
        card.displayMode = config.editBehavior; // 'side-by-side' or 'edit-only'
      } else {
        card.displayMode = 'full-preview';
      }
    }
    
    this.renderAllCards();
  }
  
  private isCursorInRange(cursorLine: number, range: Range): boolean {
    return cursorLine >= range.startLineNumber && cursorLine <= range.endLineNumber;
  }
  
  private renderAllCards(): void {
    const hiddenAreas: Range[] = [];
    const decorations: editor.IModelDeltaDecoration[] = [];
    const cardsNeedingViewZones: InlineWidgetCard[] = [];
    const cardsToRemoveViewZones: string[] = [];
    
    // Step 1: Collect instructions from all cards
    for (const card of this.cards.values()) {
      const instructions = this.renderer.getRenderInstructions(card);
      
      // Accumulate hidden areas
      hiddenAreas.push(...instructions.hiddenRanges);
      
      // Accumulate decorations
      decorations.push(...instructions.decorations);
      
      // Accumulate view zones
      if (instructions.viewZones.length > 0) {
        cardsNeedingViewZones.push(card);
      } else {
        cardsToRemoveViewZones.push(card.id);
      }
    }
    
    // Step 2: Remove view zones that are no longer needed
    for (const id of cardsToRemoveViewZones) {
      this.removeViewZone(id);
    }
    
    // Step 3: Apply hidden areas FIRST (before creating view zones)
    this.applyHiddenAreas(hiddenAreas);
    
    // Step 4: Create/update view zones AFTER hidden areas are applied
    for (const card of cardsNeedingViewZones) {
      this.ensureViewZone(card);
    }
    
    // Step 5: Apply decorations
    this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
    
    if (CARD_SYSTEM_CONFIG.debug) {
      console.log('[InlineWidgetCardManager] Rendered', this.viewZones.size, 'view zones,', 
                  hiddenAreas.length, 'hidden areas,', decorations.length, 'decorations');
    }
  }
  
  private applyHiddenAreas(areas: Range[]): void {
    if (this.hiddenAreasCoordinator) {
      this.hiddenAreasCoordinator.updateHiddenAreas('inline-cards', areas);
    } else {
      // Sort by line number
      areas.sort((a, b) => a.startLineNumber - b.startLineNumber);
      (this.editor as any).setHiddenAreas(areas);
    }
  }
  
  private ensureViewZone(card: InlineWidgetCard): void {
    const existing = this.viewZones.get(card.id);
    const callbacks = this.createCallbacks(card);
    
    if (existing) {
      // Check if we need to recreate (display mode changed)
      if (existing.card.displayMode !== card.displayMode) {
        this.removeViewZone(card.id);
        this.createViewZone(card);
      } else {
        // Update existing zone content
        existing.card = card;
        this.renderer.renderCard(existing.root, card, callbacks);
      }
    } else {
      // Create new zone
      this.createViewZone(card);
    }
  }
  
  private createCallbacks(card: InlineWidgetCard): CardCallbacks {
    return {
      onEdit: () => this.focusCard(card),
      onAction: (action, payload) => {
        if (this.onCardAction) {
          this.onCardAction(card, action, payload);
        }
      },
      onContentChange: (newContent) => this.updateCardContent(card, newContent)
    };
  }
  
  private updateCardContent(card: InlineWidgetCard, newContent: string): void {
    const model = this.editor.getModel();
    if (!model) return;

    // For WOD blocks, the content is between fences.
    // We need to be careful about what range we are replacing.
    // The card.sourceRange covers the whole block including fences for WOD blocks.
    // But the WOD block parser might need to be smarter or we handle it here.
    
    // If it's a WOD block, we want to replace the content INSIDE the fences.
    if (card.cardType === 'wod-block') {
      // We need to find the content range.
      // Assuming standard ```wod \n content \n ``` format
      // The sourceRange includes the fences.
      const startLine = card.sourceRange.startLineNumber + 1; // Skip ```wod
      const endLine = card.sourceRange.endLineNumber - 1; // Skip ```
      
      if (startLine > endLine) {
        // Empty block or single line block, handle gracefully?
        // If it was empty, startLine might be > endLine.
        // We should probably replace the whole block if structure changes, 
        // but for simple content edits, we can try to replace the range.
      }
      
      const range = new Range(
        startLine,
        1,
        endLine,
        model.getLineMaxColumn(endLine)
      );
      
      // Use pushEditOperations to make it undoable
      model.pushEditOperations(
        [],
        [{ range, text: newContent }],
        () => null
      );
    } else {
      // For other cards, we might be replacing the whole source range?
      // Currently only WOD blocks support editing content via this callback.
      console.warn('[InlineWidgetCardManager] Content update not implemented for card type:', card.cardType);
    }
  }

  private createViewZone(card: InlineWidgetCard): void {
    const domNode = document.createElement('div');
    domNode.className = `inline-widget-card-zone card-type-${card.cardType}`;
    domNode.dataset.mode = card.displayMode;
    domNode.dataset.cardId = card.id;
    
    const root = createRoot(domNode);
    const callbacks = this.createCallbacks(card);
    
    // Render initial content
    this.renderer.renderCard(root, card, callbacks, this.monaco);
    
    // Calculate height
    const heightInPx = this.calculateCardHeight(card);
    
    this.editor.changeViewZones((accessor) => {
      const zoneId = accessor.addZone({
        afterLineNumber: card.sourceRange.startLineNumber - 1,
        heightInPx,
        domNode,
        suppressMouseDown: false,
      });
      
      this.viewZones.set(card.id, {
        zoneId,
        root,
        domNode,
        card,
      });
      
      if (CARD_SYSTEM_CONFIG.debug) {
        console.log('[InlineWidgetCardManager] Created view zone for', card.id, 
                    'at line', card.sourceRange.startLineNumber, 'height:', heightInPx);
      }
    });
  }
  
  private calculateCardHeight(card: InlineWidgetCard): number {
    const config = CARD_TYPE_CONFIGS[card.cardType];
    const lineHeight = this.editor.getOption(editor.EditorOption.lineHeight);
    
    // Source height in pixels
    const sourceLines = card.sourceRange.endLineNumber - card.sourceRange.startLineNumber + 1;
    const sourceHeightPx = sourceLines * lineHeight;
    
    // Preview height from card heights or default
    const previewHeightPx = card.heights?.previewPx || config.defaultPreviewHeight;
    
    // Card height is max of source and preview, with minimum
    const height = Math.max(config.minHeight, sourceHeightPx, previewHeightPx);
    
    // Add padding for side-by-side mode
    if (card.displayMode === 'side-by-side') {
      return height + 20; // Extra padding for split view
    }
    
    return height;
  }
  
  private removeViewZone(id: string): void {
    const zone = this.viewZones.get(id);
    if (!zone) return;
    
    zone.root.unmount();
    
    this.editor.changeViewZones((accessor) => {
      accessor.removeZone(zone.zoneId);
    });
    
    this.viewZones.delete(id);
    
    if (CARD_SYSTEM_CONFIG.debug) {
      console.log('[InlineWidgetCardManager] Removed view zone for', id);
    }
  }
  
  private focusCard(card: InlineWidgetCard): void {
    // Clear hidden areas first so cursor can move there
    if (this.hiddenAreasCoordinator) {
      this.hiddenAreasCoordinator.clearHiddenAreas('inline-cards');
    } else {
      (this.editor as any).setHiddenAreas([]);
    }
    
    // Move cursor to start of card source
    this.editor.setPosition({
      lineNumber: card.sourceRange.startLineNumber,
      column: 1,
    });
    this.editor.revealLine(card.sourceRange.startLineNumber);
    this.editor.focus();
    
    // Update will happen via cursor change event
  }
  
  /**
   * Get all current cards
   */
  public getCards(): InlineWidgetCard[] {
    return Array.from(this.cards.values());
  }
  
  /**
   * Force a reparse of content
   */
  public refresh(): void {
    this.lastContentVersion = -1;
    this.parseContent();
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clear debounce timers
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    if (this.displayModeDebounceTimer) {
      clearTimeout(this.displayModeDebounceTimer);
    }
    
    // Remove all view zones
    for (const [id] of this.viewZones) {
      this.removeViewZone(id);
    }
    
    // Clear decorations
    this.decorations = this.editor.deltaDecorations(this.decorations, []);
    
    // Clear hidden areas
    if (this.hiddenAreasCoordinator) {
      this.hiddenAreasCoordinator.clearHiddenAreas('inline-cards');
    } else {
      (this.editor as any).setHiddenAreas([]);
    }
    
    // Dispose event handlers
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    this.cards.clear();
    
    if (CARD_SYSTEM_CONFIG.debug) {
      console.log('[InlineWidgetCardManager] Disposed');
    }
  }
}
