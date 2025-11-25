# Inline Widget Card System - Implementation Specification

This document provides the technical specification for the simplified inline widget card system.

## Core Interface Definitions

### Card Types and Content Models

```typescript
// src/editor/inline-cards/types.ts

import { Range } from 'monaco-editor';
import { CodeStatement } from '@/parser/WodScript';

/** Supported card types */
export type CardType = 
  | 'heading' 
  | 'blockquote' 
  | 'image' 
  | 'youtube' 
  | 'frontmatter' 
  | 'wod-block';

/** Display modes for cards */
export type CardDisplayMode = 
  | 'full-preview'   // Preview widget takes full width
  | 'side-by-side'   // Edit panel + Preview panel
  | 'edit-only';     // No card UI, just Monaco text

/** Content model for headings */
export interface HeadingContent {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  prefixLength: number; // Length of "# " prefix
}

/** Content model for blockquotes */
export interface BlockquoteContent {
  type: 'blockquote';
  text: string;
  prefixLength: number; // Length of "> " prefix
}

/** Content model for images */
export interface ImageContent {
  type: 'image';
  url: string;
  alt: string;
  rawMarkdown: string;
}

/** Content model for YouTube embeds */
export interface YouTubeContent {
  type: 'youtube';
  videoId: string;
  embedUrl: string;
  rawUrl: string;
}

/** Content model for front matter */
export interface FrontMatterContent {
  type: 'frontmatter';
  properties: Record<string, string>;
  rawYaml: string;
}

/** Content model for WOD blocks */
export interface WodBlockContent {
  type: 'wod-block';
  statements: CodeStatement[];
  rawCode: string;
  parseState: 'parsed' | 'error' | 'pending';
}

/** Union of all content types */
export type CardContent = 
  | HeadingContent 
  | BlockquoteContent 
  | ImageContent 
  | YouTubeContent 
  | FrontMatterContent 
  | WodBlockContent;

/** The main card interface */
export interface InlineWidgetCard<T extends CardContent = CardContent> {
  /** Unique identifier (e.g., "heading-5" for heading on line 5) */
  id: string;
  
  /** Content type */
  cardType: CardType;
  
  /** Range of source text in editor (1-indexed Monaco lines) */
  sourceRange: Range;
  
  /** Parsed content */
  content: T;
  
  /** Current display mode */
  displayMode: CardDisplayMode;
  
  /** Mode to use when cursor enters the card */
  editBehavior: 'side-by-side' | 'edit-only';
  
  /** Calculated heights */
  heights: {
    /** Height of preview widget in pixels */
    previewPx: number;
    /** Height of source text in lines */
    sourceLines: number;
    /** Final card height in pixels */
    cardPx: number;
  };
}
```

### Card Configuration

```typescript
// src/editor/inline-cards/config.ts

import { CardType, CardDisplayMode } from './types';

/** Configuration for each card type */
export interface CardTypeConfig {
  /** Unique identifier for the card type */
  type: CardType;
  
  /** Human readable name */
  displayName: string;
  
  /** What happens when cursor enters */
  editBehavior: 'side-by-side' | 'edit-only';
  
  /** Whether to hide source lines when showing preview */
  hideSourceInPreview: boolean;
  
  /** Minimum height in pixels */
  minHeight: number;
  
  /** Default preview height when content-based calculation fails */
  defaultPreviewHeight: number;
}

/** Default configurations */
export const CARD_TYPE_CONFIGS: Record<CardType, CardTypeConfig> = {
  heading: {
    type: 'heading',
    displayName: 'Heading',
    editBehavior: 'edit-only',
    hideSourceInPreview: false, // Headings use inline decoration, not hidden areas
    minHeight: 32,
    defaultPreviewHeight: 40,
  },
  
  blockquote: {
    type: 'blockquote',
    displayName: 'Blockquote',
    editBehavior: 'edit-only',
    hideSourceInPreview: false, // Blockquotes use inline decoration
    minHeight: 32,
    defaultPreviewHeight: 40,
  },
  
  image: {
    type: 'image',
    displayName: 'Image',
    editBehavior: 'edit-only',
    hideSourceInPreview: true,
    minHeight: 100,
    defaultPreviewHeight: 200,
  },
  
  youtube: {
    type: 'youtube',
    displayName: 'YouTube Video',
    editBehavior: 'edit-only',
    hideSourceInPreview: true,
    minHeight: 200,
    defaultPreviewHeight: 315, // 16:9 aspect for 560px width
  },
  
  frontmatter: {
    type: 'frontmatter',
    displayName: 'Front Matter',
    editBehavior: 'side-by-side',
    hideSourceInPreview: true,
    minHeight: 60,
    defaultPreviewHeight: 100,
  },
  
  'wod-block': {
    type: 'wod-block',
    displayName: 'Workout Block',
    editBehavior: 'side-by-side',
    hideSourceInPreview: true,
    minHeight: 100,
    defaultPreviewHeight: 200,
  },
};
```

## Card Manager Architecture

```typescript
// src/editor/inline-cards/InlineWidgetCardManager.ts

import { editor, Range } from 'monaco-editor';
import ReactDOM from 'react-dom/client';
import { InlineWidgetCard, CardContent, CardDisplayMode } from './types';
import { CardTypeConfig, CARD_TYPE_CONFIGS } from './config';
import { CardParser } from './CardParser';
import { CardRenderer } from './CardRenderer';

interface ViewZoneInfo {
  zoneId: string;
  root: ReactDOM.Root;
  domNode: HTMLDivElement;
  card: InlineWidgetCard;
}

export class InlineWidgetCardManager {
  private editor: editor.IStandaloneCodeEditor;
  private cards: Map<string, InlineWidgetCard> = new Map();
  private viewZones: Map<string, ViewZoneInfo> = new Map();
  private decorations: string[] = [];
  private parser: CardParser;
  private renderer: CardRenderer;
  private disposables: { dispose(): void }[] = [];
  
  // State tracking for optimization
  private lastCursorLine: number = -1;
  private lastContentVersion: number = -1;
  
  constructor(editorInstance: editor.IStandaloneCodeEditor) {
    this.editor = editorInstance;
    this.parser = new CardParser();
    this.renderer = new CardRenderer();
    
    // Initialize event listeners
    this.setupEventListeners();
    
    // Initial parse
    this.parseContent();
  }
  
  private setupEventListeners(): void {
    // Cursor position changes - triggers display mode updates
    const cursorDisposable = this.editor.onDidChangeCursorPosition((e) => {
      const newLine = e.position.lineNumber;
      if (newLine !== this.lastCursorLine) {
        this.lastCursorLine = newLine;
        this.updateDisplayModes();
      }
    });
    this.disposables.push(cursorDisposable);
    
    // Content changes - triggers full reparse
    const contentDisposable = this.editor.onDidChangeModelContent(() => {
      // Debounce content parsing
      this.debouncedParseContent();
    });
    this.disposables.push(contentDisposable);
  }
  
  private parseDebounceTimer: number | null = null;
  
  private debouncedParseContent(): void {
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    this.parseDebounceTimer = window.setTimeout(() => {
      this.parseContent();
    }, 150);
  }
  
  private parseContent(): void {
    const model = this.editor.getModel();
    if (!model) return;
    
    const version = model.getVersionId();
    if (version === this.lastContentVersion) return;
    this.lastContentVersion = version;
    
    // Parse all cards from content
    const newCards = this.parser.parseAllCards(model);
    
    // Merge with existing cards (preserve display modes for cards that didn't change)
    const updatedCards = new Map<string, InlineWidgetCard>();
    for (const card of newCards) {
      const existing = this.cards.get(card.id);
      if (existing && this.cardContentEquals(existing.content, card.content)) {
        // Content unchanged - keep existing display mode
        card.displayMode = existing.displayMode;
      }
      updatedCards.set(card.id, card);
    }
    
    // Remove cards that no longer exist
    for (const [id] of this.cards) {
      if (!updatedCards.has(id)) {
        this.removeViewZone(id);
      }
    }
    
    this.cards = updatedCards;
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
    
    for (const card of this.cards.values()) {
      const config = CARD_TYPE_CONFIGS[card.cardType];
      
      if (card.displayMode === 'edit-only') {
        // Edit mode: remove view zone, show raw text
        this.removeViewZone(card.id);
        
        // May still apply decorations (e.g., for headings in edit mode)
        const cardDecorations = this.renderer.getEditModeDecorations(card);
        decorations.push(...cardDecorations);
        
      } else if (card.displayMode === 'full-preview') {
        // Preview mode: hide source, show view zone
        if (config.hideSourceInPreview) {
          hiddenAreas.push(card.sourceRange);
        }
        
        // Create or update view zone
        this.ensureViewZone(card);
        
        // Apply preview decorations (e.g., heading styles)
        const cardDecorations = this.renderer.getPreviewModeDecorations(card);
        decorations.push(...cardDecorations);
        
      } else if (card.displayMode === 'side-by-side') {
        // Side-by-side: hide source, show split view zone
        if (config.hideSourceInPreview) {
          hiddenAreas.push(card.sourceRange);
        }
        
        // Create or update view zone with side-by-side layout
        this.ensureViewZone(card);
      }
    }
    
    // Apply hidden areas
    this.applyHiddenAreas(hiddenAreas);
    
    // Apply decorations
    this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
  }
  
  private applyHiddenAreas(areas: Range[]): void {
    // Sort by line number
    areas.sort((a, b) => a.startLineNumber - b.startLineNumber);
    (this.editor as any).setHiddenAreas(areas);
  }
  
  private ensureViewZone(card: InlineWidgetCard): void {
    const existing = this.viewZones.get(card.id);
    
    if (existing) {
      // Update existing zone content
      this.renderer.renderCard(existing.root, card, {
        onEdit: () => this.focusCard(card),
        onAction: (action) => this.handleCardAction(card, action),
      });
    } else {
      // Create new zone
      this.createViewZone(card);
    }
  }
  
  private createViewZone(card: InlineWidgetCard): void {
    const domNode = document.createElement('div');
    domNode.className = `inline-widget-card-zone card-type-${card.cardType}`;
    domNode.dataset.mode = card.displayMode;
    
    const root = ReactDOM.createRoot(domNode);
    
    // Render initial content
    this.renderer.renderCard(root, card, {
      onEdit: () => this.focusCard(card),
      onAction: (action) => this.handleCardAction(card, action),
    });
    
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
    });
  }
  
  private calculateCardHeight(card: InlineWidgetCard): number {
    const config = CARD_TYPE_CONFIGS[card.cardType];
    const lineHeight = this.editor.getOption(editor.EditorOption.lineHeight);
    
    // Source height in pixels
    const sourceLines = card.sourceRange.endLineNumber - card.sourceRange.startLineNumber + 1;
    const sourceHeightPx = sourceLines * lineHeight;
    
    // Preview height (calculated by renderer or use default)
    const previewHeightPx = card.heights?.previewPx || config.defaultPreviewHeight;
    
    // Card height is max of source and preview, with minimum
    return Math.max(config.minHeight, sourceHeightPx, previewHeightPx);
  }
  
  private removeViewZone(id: string): void {
    const zone = this.viewZones.get(id);
    if (!zone) return;
    
    zone.root.unmount();
    
    this.editor.changeViewZones((accessor) => {
      accessor.removeZone(zone.zoneId);
    });
    
    this.viewZones.delete(id);
  }
  
  private focusCard(card: InlineWidgetCard): void {
    // Move cursor to start of card source
    this.editor.setPosition({
      lineNumber: card.sourceRange.startLineNumber,
      column: 1,
    });
    this.editor.revealLine(card.sourceRange.startLineNumber);
    this.editor.focus();
  }
  
  private handleCardAction(card: InlineWidgetCard, action: string): void {
    // Handle card-specific actions (e.g., "start-workout" for WOD blocks)
    console.log(`[CardManager] Action "${action}" on card ${card.id}`);
    // Emit event or call callback
  }
  
  public dispose(): void {
    // Clear debounce timer
    if (this.parseDebounceTimer) {
      clearTimeout(this.parseDebounceTimer);
    }
    
    // Remove all view zones
    for (const [id] of this.viewZones) {
      this.removeViewZone(id);
    }
    
    // Clear decorations
    this.decorations = this.editor.deltaDecorations(this.decorations, []);
    
    // Clear hidden areas
    (this.editor as any).setHiddenAreas([]);
    
    // Dispose event handlers
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    console.log('[InlineWidgetCardManager] Disposed');
  }
}
```

## Card Parser

```typescript
// src/editor/inline-cards/CardParser.ts

import { editor, Range } from 'monaco-editor';
import { InlineWidgetCard, CardContent, HeadingContent, /* ... */ } from './types';
import { CARD_TYPE_CONFIGS } from './config';

export class CardParser {
  /**
   * Parse all cards from the editor model
   */
  parseAllCards(model: editor.ITextModel): InlineWidgetCard[] {
    const cards: InlineWidgetCard[] = [];
    const lines = model.getLinesContent();
    
    // Parse each type
    cards.push(...this.parseHeadings(lines));
    cards.push(...this.parseBlockquotes(lines));
    cards.push(...this.parseMedia(lines));
    cards.push(...this.parseFrontMatter(lines));
    cards.push(...this.parseWodBlocks(lines));
    
    // Sort by start line
    cards.sort((a, b) => a.sourceRange.startLineNumber - b.sourceRange.startLineNumber);
    
    return cards;
  }
  
  private parseHeadings(lines: string[]): InlineWidgetCard<HeadingContent>[] {
    const cards: InlineWidgetCard<HeadingContent>[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (match) {
        const lineNum = i + 1;
        const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        const text = match[2];
        const prefixLength = match[1].length + 1; // "# " length
        
        cards.push({
          id: `heading-${lineNum}`,
          cardType: 'heading',
          sourceRange: new Range(lineNum, 1, lineNum, line.length + 1),
          content: {
            type: 'heading',
            level,
            text,
            prefixLength,
          },
          displayMode: 'full-preview',
          editBehavior: CARD_TYPE_CONFIGS.heading.editBehavior,
          heights: {
            previewPx: 24 + (level === 1 ? 16 : level === 2 ? 8 : 0), // Larger for H1/H2
            sourceLines: 1,
            cardPx: 0, // Calculated later
          },
        });
      }
    }
    
    return cards;
  }
  
  private parseBlockquotes(lines: string[]): InlineWidgetCard[] {
    // Similar pattern...
    return [];
  }
  
  private parseMedia(lines: string[]): InlineWidgetCard[] {
    const cards: InlineWidgetCard[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;
      
      // Image: ![alt](url)
      const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        cards.push({
          id: `image-${lineNum}`,
          cardType: 'image',
          sourceRange: new Range(lineNum, 1, lineNum, lines[i].length + 1),
          content: {
            type: 'image',
            alt: imageMatch[1],
            url: imageMatch[2],
            rawMarkdown: line,
          },
          displayMode: 'full-preview',
          editBehavior: 'edit-only',
          heights: {
            previewPx: 200, // Default, updated after image loads
            sourceLines: 1,
            cardPx: 0,
          },
        });
        continue;
      }
      
      // YouTube URL
      const youtubeMatch = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      if (youtubeMatch) {
        cards.push({
          id: `youtube-${lineNum}`,
          cardType: 'youtube',
          sourceRange: new Range(lineNum, 1, lineNum, lines[i].length + 1),
          content: {
            type: 'youtube',
            videoId: youtubeMatch[1],
            embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
            rawUrl: line,
          },
          displayMode: 'full-preview',
          editBehavior: 'edit-only',
          heights: {
            previewPx: 315,
            sourceLines: 1,
            cardPx: 0,
          },
        });
      }
    }
    
    return cards;
  }
  
  private parseFrontMatter(lines: string[]): InlineWidgetCard[] {
    // Use existing FrontMatterParser logic
    return [];
  }
  
  private parseWodBlocks(lines: string[]): InlineWidgetCard[] {
    // Use existing WOD block parsing logic
    return [];
  }
}
```

## Card Renderer Components

```tsx
// src/editor/inline-cards/components/CardContainer.tsx

import React from 'react';
import { InlineWidgetCard, CardDisplayMode } from '../types';
import { HeadingPreview } from './HeadingPreview';
import { ImagePreview } from './ImagePreview';
import { YouTubePreview } from './YouTubePreview';
import { FrontMatterCard } from './FrontMatterCard';
import { WodBlockCard } from './WodBlockCard';

interface CardContainerProps {
  card: InlineWidgetCard;
  onEdit: () => void;
  onAction: (action: string) => void;
}

export const CardContainer: React.FC<CardContainerProps> = ({
  card,
  onEdit,
  onAction,
}) => {
  const renderContent = () => {
    switch (card.cardType) {
      case 'heading':
        return <HeadingPreview content={card.content} />;
      
      case 'image':
        return <ImagePreview content={card.content} onEdit={onEdit} />;
      
      case 'youtube':
        return <YouTubePreview content={card.content} onEdit={onEdit} />;
      
      case 'frontmatter':
        return (
          <FrontMatterCard 
            content={card.content} 
            displayMode={card.displayMode}
            onEdit={onEdit}
          />
        );
      
      case 'wod-block':
        return (
          <WodBlockCard
            content={card.content}
            displayMode={card.displayMode}
            onEdit={onEdit}
            onStartWorkout={() => onAction('start-workout')}
          />
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div 
      className="inline-widget-card"
      data-mode={card.displayMode}
      data-type={card.cardType}
    >
      {renderContent()}
    </div>
  );
};
```

```tsx
// src/editor/inline-cards/components/WodBlockCard.tsx

import React from 'react';
import { WodBlockContent, CardDisplayMode } from '../types';
import { StatementDisplay } from '@/components/fragments/StatementDisplay';
import { Button } from '@/components/ui/button';
import { Play, Timer } from 'lucide-react';

interface WodBlockCardProps {
  content: WodBlockContent;
  displayMode: CardDisplayMode;
  onEdit: () => void;
  onStartWorkout: () => void;
}

export const WodBlockCard: React.FC<WodBlockCardProps> = ({
  content,
  displayMode,
  onEdit,
  onStartWorkout,
}) => {
  if (displayMode === 'side-by-side') {
    return (
      <div className="wod-card-split grid grid-cols-2 gap-2 h-full">
        {/* Left: Source code */}
        <div className="wod-card-source border-r border-border p-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Code (click to edit)
          </div>
          <pre 
            className="text-xs font-mono whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded"
            onClick={onEdit}
          >
            {content.rawCode}
          </pre>
        </div>
        
        {/* Right: Preview */}
        <div className="wod-card-preview p-2">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Preview</span>
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded-full
              ${content.parseState === 'parsed' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
            `}>
              {content.parseState}
            </span>
          </div>
          
          <div className="space-y-1">
            {content.statements.map((stmt, i) => (
              <StatementDisplay key={i} statement={stmt} compact />
            ))}
          </div>
          
          {content.parseState === 'parsed' && (
            <Button 
              className="w-full mt-2 gap-2" 
              size="sm"
              onClick={onStartWorkout}
            >
              <Play className="h-3 w-3" />
              Start Workout
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Full preview mode
  return (
    <div className="wod-card-preview p-3 cursor-pointer" onClick={onEdit}>
      <div className="flex items-center gap-2 mb-2">
        <Timer className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Workout</span>
        <span className={`
          text-[10px] px-1.5 py-0.5 rounded-full ml-auto
          ${content.parseState === 'parsed' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
        `}>
          {content.parseState}
        </span>
      </div>
      
      <div className="space-y-1">
        {content.statements.map((stmt, i) => (
          <StatementDisplay key={i} statement={stmt} compact />
        ))}
      </div>
      
      {content.parseState === 'parsed' && (
        <Button 
          className="w-full mt-3 gap-2" 
          onClick={(e) => {
            e.stopPropagation();
            onStartWorkout();
          }}
        >
          <Play className="h-4 w-4" />
          Start Workout
        </Button>
      )}
    </div>
  );
};
```

## CSS Styles

```css
/* src/editor/inline-cards/styles.css */

/* Base card container */
.inline-widget-card {
  display: flex;
  width: 100%;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.inline-widget-card:hover {
  border-color: var(--primary);
}

/* Display modes */
.inline-widget-card[data-mode="full-preview"] {
  align-items: center;
  justify-content: stretch;
}

.inline-widget-card[data-mode="side-by-side"] {
  /* Grid layout set by child component */
}

.inline-widget-card[data-mode="edit-only"] {
  display: none;
}

/* Card type specific styles */
.inline-widget-card[data-type="heading"] {
  background: transparent;
  border: none;
}

.inline-widget-card[data-type="image"] {
  justify-content: center;
  background: var(--muted);
}

.inline-widget-card[data-type="youtube"] {
  aspect-ratio: 16/9;
  max-width: 640px;
  margin: 0 auto;
}

.inline-widget-card[data-type="frontmatter"] {
  background: var(--muted);
}

.inline-widget-card[data-type="wod-block"] {
  background: linear-gradient(135deg, var(--card) 0%, var(--muted) 100%);
}

/* Height centering for mismatched preview/source heights */
.card-source-centered,
.card-preview-centered {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

/* Split view layout */
.wod-card-split,
.frontmatter-card-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  height: 100%;
}

.wod-card-source,
.frontmatter-card-source {
  border-right: 1px solid var(--border);
  overflow: auto;
}

.wod-card-preview,
.frontmatter-card-preview {
  overflow: auto;
}

/* Preview widgets */
.heading-preview {
  padding: 4px 8px;
}

.heading-preview[data-level="1"] {
  font-size: 1.5em;
  font-weight: bold;
}

.heading-preview[data-level="2"] {
  font-size: 1.3em;
  font-weight: bold;
}

.heading-preview[data-level="3"] {
  font-size: 1.1em;
  font-weight: bold;
}

.image-preview img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.youtube-preview iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* Transitions */
.inline-widget-card,
.card-source-centered,
.card-preview-centered {
  transition: all 0.2s ease;
}
```

## Migration Plan

### Step 1: Create New Infrastructure (Non-breaking)
- [ ] Create `src/editor/inline-cards/` directory
- [ ] Implement `types.ts`, `config.ts`
- [ ] Implement `InlineWidgetCardManager.ts`
- [ ] Implement `CardParser.ts` (reuse existing parser logic)
- [ ] Implement `CardRenderer.ts` and component files
- [ ] Add CSS styles

### Step 2: Parallel Operation
- [ ] Add `InlineWidgetCardManager` to `RichMarkdownManager.ts`
- [ ] Add feature flag to switch between old/new system
- [ ] Test new system in Storybook

### Step 3: Feature Migration
- [ ] Migrate `HeadingFeature` → `HeadingCardRenderer`
- [ ] Migrate `BlockquoteFeature` → `BlockquoteCardRenderer`
- [ ] Migrate `MediaFeature` → `MediaCardRenderer` (image + youtube)
- [ ] Migrate `FrontMatterFeature` → `FrontMatterCardRenderer`
- [ ] Consolidate WOD features → `WodBlockCardRenderer`

### Step 4: Cleanup
- [ ] Remove old feature files
- [ ] Remove feature flag
- [ ] Update documentation

---

## Testing Strategy

### Unit Tests
```typescript
// src/editor/inline-cards/__tests__/CardParser.test.ts

describe('CardParser', () => {
  describe('parseHeadings', () => {
    it('should parse H1 heading', () => {
      const lines = ['# Hello World'];
      const cards = parser.parseHeadings(lines);
      
      expect(cards).toHaveLength(1);
      expect(cards[0].content.level).toBe(1);
      expect(cards[0].content.text).toBe('Hello World');
    });
    
    it('should handle heading with trailing spaces', () => {
      const lines = ['## Heading Text   '];
      const cards = parser.parseHeadings(lines);
      
      expect(cards[0].content.text).toBe('Heading Text');
    });
  });
  
  describe('parseMedia', () => {
    it('should parse markdown image', () => {
      const lines = ['![Alt text](https://example.com/image.png)'];
      const cards = parser.parseMedia(lines);
      
      expect(cards).toHaveLength(1);
      expect(cards[0].cardType).toBe('image');
    });
    
    it('should parse YouTube URL', () => {
      const lines = ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'];
      const cards = parser.parseMedia(lines);
      
      expect(cards).toHaveLength(1);
      expect(cards[0].cardType).toBe('youtube');
      expect(cards[0].content.videoId).toBe('dQw4w9WgXcQ');
    });
  });
});
```

### Storybook Stories
```tsx
// stories/editor/InlineWidgetCards.stories.tsx

export default {
  title: 'Editor/Inline Widget Cards',
  component: CardContainer,
};

export const HeadingCard = () => (
  <CardContainer card={headingCard} />
);

export const ImageCard = () => (
  <CardContainer card={imageCard} />
);

export const WodBlockPreview = () => (
  <CardContainer card={{ ...wodCard, displayMode: 'full-preview' }} />
);

export const WodBlockSideBySide = () => (
  <CardContainer card={{ ...wodCard, displayMode: 'side-by-side' }} />
);
```
