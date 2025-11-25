/**
 * Inline Widget Card System - Card Renderer
 * 
 * Handles rendering cards into DOM nodes and generating Monaco decorations.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { editor, Range } from 'monaco-editor';
import { InlineWidgetCard, CardCallbacks, HeadingContent, BlockquoteContent } from './types';
import { CardContainer } from './components';

export class CardRenderer {
  /**
   * Render a card into a React root
   */
  renderCard(
    root: Root, 
    card: InlineWidgetCard, 
    callbacks: CardCallbacks
  ): void {
    root.render(
      React.createElement(CardContainer, { card, callbacks })
    );
  }

  /**
   * Create a new React root for a container element
   */
  createRoot(container: HTMLElement): Root {
    return createRoot(container);
  }
  
  /**
   * Get Monaco decorations for a card in preview mode
   * These are used for inline styling (headings, blockquotes)
   */
  getPreviewModeDecorations(card: InlineWidgetCard): editor.IModelDeltaDecoration[] {
    const decorations: editor.IModelDeltaDecoration[] = [];
    
    switch (card.cardType) {
      case 'heading':
        decorations.push(...this.getHeadingDecorations(card));
        break;
      
      case 'blockquote':
        decorations.push(...this.getBlockquoteDecorations(card));
        break;
    }
    
    return decorations;
  }
  
  /**
   * Get Monaco decorations for a card in edit mode
   * Usually returns empty (raw text shown), but can apply subtle hints
   */
  getEditModeDecorations(_card: InlineWidgetCard): editor.IModelDeltaDecoration[] {
    // In edit mode, we don't apply any decorations - show raw text
    return [];
  }
  
  /**
   * Get decorations for heading cards
   * Hides the # prefix and applies heading styles
   */
  private getHeadingDecorations(card: InlineWidgetCard): editor.IModelDeltaDecoration[] {
    const content = card.content as HeadingContent;
    const { level, prefixLength } = content;
    const line = card.sourceRange.startLineNumber;
    
    return [
      // Hide the # prefix
      {
        range: new Range(line, 1, line, prefixLength + 1),
        options: { 
          inlineClassName: 'inline-card-hidden' 
        }
      },
      // Apply heading style to the rest of the line
      {
        range: new Range(line, prefixLength + 1, line, card.sourceRange.endColumn),
        options: { 
          inlineClassName: `inline-card-heading-${level}` 
        }
      }
    ];
  }
  
  /**
   * Get decorations for blockquote cards
   * Hides the > prefix and applies blockquote styles
   */
  private getBlockquoteDecorations(card: InlineWidgetCard): editor.IModelDeltaDecoration[] {
    const content = card.content as BlockquoteContent;
    const { prefixLength } = content;
    const line = card.sourceRange.startLineNumber;
    
    return [
      // Hide the > prefix
      {
        range: new Range(line, 1, line, prefixLength + 1),
        options: { 
          inlineClassName: 'inline-card-hidden' 
        }
      },
      // Apply blockquote style to the whole line
      {
        range: new Range(line, 1, line, card.sourceRange.endColumn),
        options: { 
          isWholeLine: true,
          className: 'inline-card-blockquote'
        }
      }
    ];
  }
}
