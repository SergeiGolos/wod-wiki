/**
 * RowBasedCardManager - New card manager using row override rules
 * 
 * This manager uses the new row-based architecture where cards are
 * collections of rules for how to override individual rows.
 */

import { editor, Range } from 'monaco-editor';
import { 
  InlineCard, 
  CardContent, 
  RowRule, 
  CardRuleGenerator,
  HeadingContent,
  BlockquoteContent,
  ImageContent,
  YouTubeContent,
  FrontMatterContent,
  WodBlockContent,
} from './row-types';
import { RowRuleRenderer } from './RowRuleRenderer';
import { CardParser } from './CardParser';
import { 
  HeadingRuleGenerator,
  BlockquoteRuleGenerator,
  WodBlockRuleGenerator,
  FrontmatterRuleGenerator,
  MediaRuleGenerator,
} from './rule-generators';
import { HiddenAreasCoordinator } from '../utils/HiddenAreasCoordinator';

// System configuration
const CONFIG = {
  debug: true,
  parseDebounceMs: 150,
  cursorDebounceMs: 50,
};

export class RowBasedCardManager {
  private editor: editor.IStandaloneCodeEditor;
  private parser: CardParser;
  private renderer: RowRuleRenderer;
  private cards: Map<string, InlineCard> = new Map();
  private disposables: { dispose(): void }[] = [];
  
  // Rule generators for each card type
  private ruleGenerators: Map<string, CardRuleGenerator<any>> = new Map();
  
  // State tracking
  private lastCursorLine: number = -1;
  private lastContentVersion: number = -1;
  private parseDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Measured heights for dynamic sizing
  private cardHeights: Map<string, number> = new Map();

  // Decorations for hover highlighting
  private hoverDecorationsCollection: editor.IEditorDecorationsCollection;

  // External callbacks
  private onCardAction?: (cardId: string, action: string, payload?: unknown) => void;

  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onCardAction?: (cardId: string, action: string, payload?: unknown) => void,
    hiddenAreasCoordinator?: HiddenAreasCoordinator
  ) {
    this.editor = editorInstance;
    this.parser = new CardParser();
    this.renderer = new RowRuleRenderer(
      editorInstance, 
      (cardId, action, payload) => {
        this.handleInternalAction(cardId, action, payload);
        this.onCardAction?.(cardId, action, payload);
      },
      hiddenAreasCoordinator
    );
    this.onCardAction = onCardAction;
    
    this.hoverDecorationsCollection = this.editor.createDecorationsCollection();

    // Register rule generators
    this.registerRuleGenerators();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initial parse
    this.parseContent();
    
    if (CONFIG.debug) {
      console.log('[RowBasedCardManager] Initialized with HiddenAreasCoordinator:', !!hiddenAreasCoordinator);
    }
  }

  /**
   * Register all rule generators
   */
  private registerRuleGenerators(): void {
    this.ruleGenerators.set('heading', new HeadingRuleGenerator());
    this.ruleGenerators.set('blockquote', new BlockquoteRuleGenerator());
    this.ruleGenerators.set('wod-block', new WodBlockRuleGenerator());
    this.ruleGenerators.set('frontmatter', new FrontmatterRuleGenerator());
    this.ruleGenerators.set('image', new MediaRuleGenerator());
    this.ruleGenerators.set('youtube', new MediaRuleGenerator());
  }

  /**
   * Set up editor event listeners
   */
  private setupEventListeners(): void {
    // Cursor position changes
    const cursorDisposable = this.editor.onDidChangeCursorPosition((e) => {
      const newLine = e.position.lineNumber;
      if (newLine !== this.lastCursorLine) {
        this.lastCursorLine = newLine;
        this.debouncedUpdateEditingState();
      }
    });
    this.disposables.push(cursorDisposable);

    // Content changes
    const contentDisposable = this.editor.onDidChangeModelContent(() => {
      this.debouncedParseContent();
    });
    this.disposables.push(contentDisposable);

    // Model change
    const modelDisposable = this.editor.onDidChangeModel(() => {
      this.lastContentVersion = -1;
      this.parseContent();
    });
    this.disposables.push(modelDisposable);
  }

  /**
   * Debounced content parsing
   */
  private debouncedParseContent(): void {
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    this.parseDebounceTimer = setTimeout(() => {
      this.parseContent();
    }, CONFIG.parseDebounceMs);
  }

  /**
   * Debounced cursor update
   */
  private debouncedUpdateEditingState(): void {
    if (this.cursorDebounceTimer) {
      clearTimeout(this.cursorDebounceTimer);
    }
    this.cursorDebounceTimer = setTimeout(() => {
      this.updateEditingState();
    }, CONFIG.cursorDebounceMs);
  }

  /**
   * Parse content and build cards with rules
   */
  private parseContent(): void {
    const model = this.editor.getModel();
    if (!model) return;

    const version = model.getVersionId();
    if (version === this.lastContentVersion) return;
    this.lastContentVersion = version;

    if (CONFIG.debug) {
      console.log('[RowBasedCardManager] Parsing content, version:', version);
    }

    // Use existing parser to get raw cards
    const rawCards = this.parser.parseAllCards(model);
    
    // Convert to InlineCards with rules
    const newCards = new Map<string, InlineCard>();
    
    for (const rawCard of rawCards) {
      const generator = this.ruleGenerators.get(rawCard.cardType);
      if (!generator) continue;

      const isEditing = this.isCursorInRange(this.lastCursorLine, rawCard.sourceRange);
      
      // Generate rules for this card
      const rules = generator.generateRules(
        rawCard.content,
        rawCard.sourceRange,
        {
            isEditing,
            cursorLine: this.lastCursorLine,
            measuredHeight: this.cardHeights.get(rawCard.id)
        }
      );

      const card: InlineCard = {
        id: rawCard.id,
        cardType: rawCard.cardType,
        sourceRange: rawCard.sourceRange,
        rules,
        content: rawCard.content,
        isEditing,
      };

      newCards.set(card.id, card);
    }

    this.cards = newCards;

    if (CONFIG.debug) {
      console.log('[RowBasedCardManager] Parsed', this.cards.size, 'cards with', 
        Array.from(this.cards.values()).reduce((sum, c) => sum + c.rules.length, 0), 'rules');
    }

    // Render
    this.render();
  }

  /**
   * Update editing state based on cursor position
   */
  private updateEditingState(): void {
    let changed = false;
    const cardsToRemeasure: string[] = [];

    for (const card of this.cards.values()) {
      const wasEditing = card.isEditing;
      const isEditing = this.isCursorInRange(this.lastCursorLine, card.sourceRange);
      
      // Always regenerate rules if cursor moved inside an editing card (to update highlighting)
      // or if editing state changed
      if (wasEditing !== isEditing || (isEditing && changed === false)) { // Note: changed check is optimization but here we want to force update if cursor moves inside
        // Actually, if we are inside, we need to update active statement highlighting even if isEditing didn't change
        // So we check if isEditing is true OR changed
      }

      // Simplified logic: Check if we need to regenerate
      // 1. isEditing changed
      // 2. isEditing is true (cursor moved within card, update active line)
      if (wasEditing !== isEditing || isEditing) {
        card.isEditing = isEditing;
        
        // If cursor is LEAVING the card, we need to ensure height is re-measured
        // The preview panel will resize and we need fresh measurements
        if (wasEditing && !isEditing) {
          console.log('[RowBasedCardManager] Cursor left card, will re-measure:', card.id);
          cardsToRemeasure.push(card.id);
          // Clear cached height to force re-measurement on next resize event
          // This ensures we don't use stale values
          // NOTE: Don't delete - keep current value, let resize event update it
        }
        
        // Regenerate rules with new editing state and cursor line
        const generator = this.ruleGenerators.get(card.cardType);
        if (generator) {
          const measuredHeight = this.cardHeights.get(card.id);
          console.log('[RowBasedCardManager] Regenerating rules for card:', {
            cardId: card.id,
            isEditing,
            wasEditing,
            measuredHeight,
            cursorLine: this.lastCursorLine,
          });
          
          card.rules = generator.generateRules(
            card.content,
            card.sourceRange,
            {
                isEditing,
                cursorLine: this.lastCursorLine,
                measuredHeight
            }
          );
        }
        
        changed = true;
      }
    }

    if (changed) {
      this.render();
      
      // Schedule a follow-up render after a short delay to catch any resize events
      // that fire after the initial render when collapsing
      if (cardsToRemeasure.length > 0) {
        setTimeout(() => {
          console.log('[RowBasedCardManager] Follow-up render for re-measured cards');
          // Re-render to pick up any height changes from resize events
          for (const cardId of cardsToRemeasure) {
            const card = this.cards.get(cardId);
            if (card) {
              const generator = this.ruleGenerators.get(card.cardType);
              if (generator) {
                card.rules = generator.generateRules(
                  card.content,
                  card.sourceRange,
                  {
                    isEditing: card.isEditing,
                    cursorLine: this.lastCursorLine,
                    measuredHeight: this.cardHeights.get(cardId)
                  }
                );
              }
            }
          }
          this.render();
        }, 100); // Small delay to let ResizeObserver fire
      }
    }
  }

  /**
   * Check if cursor is in range
   */
  private isCursorInRange(cursorLine: number, range: Range): boolean {
    return cursorLine >= range.startLineNumber && cursorLine <= range.endLineNumber;
  }

  /**
   * Handle internal actions (resize, hover)
   */
  private handleInternalAction(cardId: string, action: string, payload?: any): void {
      if (action === 'resize' && typeof payload?.height === 'number') {
          const currentHeight = this.cardHeights.get(cardId);
          const heightDiff = currentHeight ? Math.abs(currentHeight - payload.height) : Infinity;
          
          console.log('[RowBasedCardManager] Resize action received:', {
              cardId,
              newHeight: payload.height,
              currentHeight,
              heightDiff,
              willUpdate: heightDiff > 2,
          });
          
          // Only update if height changed significantly to avoid loops
          if (heightDiff > 2) {
              this.cardHeights.set(cardId, payload.height);

              // Regenerate rules for this card immediately
              const card = this.cards.get(cardId);
              if (card) {
                  const generator = this.ruleGenerators.get(card.cardType);
                  if (generator) {
                      console.log('[RowBasedCardManager] Regenerating rules after resize:', {
                          cardId,
                          newHeight: payload.height,
                          isEditing: card.isEditing,
                      });
                      
                      card.rules = generator.generateRules(
                          card.content,
                          card.sourceRange,
                          {
                              isEditing: card.isEditing,
                              cursorLine: this.lastCursorLine,
                              measuredHeight: payload.height
                          }
                      );
                      this.render();
                  }
              }
          }
      } else if (action === 'hover-statement' && typeof payload?.line === 'number') {
          const line = payload.line;
          this.hoverDecorationsCollection.set([
              {
                  range: new Range(line, 1, line, 1),
                  options: {
                      isWholeLine: true,
                      className: 'wod-statement-hover-highlight',
                      zIndex: 10,
                      stickiness: editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                  }
              }
          ]);
      } else if (action === 'hover-statement' && !payload) {
            // clear if payload is null/undefined (optional, but good practice)
           this.hoverDecorationsCollection.clear();
      }
  }

  /**
   * Render all cards
   */
  private render(): void {
    const cards = Array.from(this.cards.values());
    this.renderer.renderCards(cards);
  }

  /**
   * Get all current cards
   */
  public getCards(): InlineCard[] {
    return Array.from(this.cards.values());
  }

  /**
   * Force refresh
   */
  public refresh(): void {
    this.lastContentVersion = -1;
    this.parseContent();
  }

  /**
   * Dispose
   */
  public dispose(): void {
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    if (this.cursorDebounceTimer) {
      clearTimeout(this.cursorDebounceTimer);
    }

    this.renderer.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.cards.clear();
    this.hoverDecorationsCollection.clear();

    if (CONFIG.debug) {
      console.log('[RowBasedCardManager] Disposed');
    }
  }
}
