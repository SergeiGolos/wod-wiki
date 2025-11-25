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
  
  // External callbacks
  private onCardAction?: (cardId: string, action: string, payload?: unknown) => void;

  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onCardAction?: (cardId: string, action: string, payload?: unknown) => void
  ) {
    this.editor = editorInstance;
    this.parser = new CardParser();
    this.renderer = new RowRuleRenderer(editorInstance, (cardId, action, payload) => {
      this.onCardAction?.(cardId, action, payload);
    });
    this.onCardAction = onCardAction;
    
    // Register rule generators
    this.registerRuleGenerators();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initial parse
    this.parseContent();
    
    if (CONFIG.debug) {
      console.log('[RowBasedCardManager] Initialized');
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
        isEditing
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

    for (const card of this.cards.values()) {
      const wasEditing = card.isEditing;
      const isEditing = this.isCursorInRange(this.lastCursorLine, card.sourceRange);
      
      if (wasEditing !== isEditing) {
        card.isEditing = isEditing;
        
        // Regenerate rules with new editing state
        const generator = this.ruleGenerators.get(card.cardType);
        if (generator) {
          card.rules = generator.generateRules(
            card.content,
            card.sourceRange,
            isEditing
          );
        }
        
        changed = true;
      }
    }

    if (changed) {
      this.render();
    }
  }

  /**
   * Check if cursor is in range
   */
  private isCursorInRange(cursorLine: number, range: Range): boolean {
    return cursorLine >= range.startLineNumber && cursorLine <= range.endLineNumber;
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

    if (CONFIG.debug) {
      console.log('[RowBasedCardManager] Disposed');
    }
  }
}
