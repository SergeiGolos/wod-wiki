/**
 * Inline Widget Card System - Card Renderer
 * 
 * Handles rendering cards into DOM nodes and generating Monaco decorations.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { editor, Range } from 'monaco-editor';
import { InlineWidgetCard, CardCallbacks, HeadingContent, BlockquoteContent, RenderInstruction } from './types';
import { CardContainer } from './components/CardContainer';
import { CARD_TYPE_CONFIGS } from './config';

export class CardRenderer {
  /**
   * Render a card into a React root
   */
  renderCard(
    root: Root, 
    card: InlineWidgetCard, 
    callbacks: CardCallbacks,
    monaco?: any
  ): void {
    root.render(
      React.createElement(CardContainer, { card, callbacks, monaco })
    );
  }

  /**
   * Create a new React root for a container element
   */
  createRoot(container: HTMLElement): Root {
    return createRoot(container);
  }

  /**
   * Get instructions for how to render a card
   */
  getRenderInstructions(card: InlineWidgetCard): RenderInstruction {
    const config = CARD_TYPE_CONFIGS[card.cardType];
    const instructions: RenderInstruction = {
      hiddenRanges: [],
      viewZones: [],
      decorations: []
    };

    // 1. Handle Edit Mode (usually just raw text, maybe some decorations)
    if (card.displayMode === 'edit-only') {
      instructions.decorations.push(...this.getEditModeDecorations(card));
      return instructions;
    }

    // 2. Handle Preview/Side-by-Side Modes
    
    // A. Hidden Areas (Folding)
    if (config.hideSourceInPreview) {
      // For WOD blocks, we hide the content but NOT the fences if we want to be fancy,
      // but the original logic hid the whole block.
      // Let's stick to hiding the whole source range for now.
      instructions.hiddenRanges.push(card.sourceRange);
    }

    // B. View Zones
    if (config.usesViewZone) {
      // Calculate height
      let heightInPx = card.heights.cardPx;
      
      // Add padding for side-by-side mode
      if (card.displayMode === 'side-by-side') {
        heightInPx += 20; // Extra padding
      }

      instructions.viewZones.push({
        id: card.id,
        afterLineNumber: card.sourceRange.startLineNumber - 1,
        heightInPx,
        component: null // Component rendering is handled by the manager via renderCard
      });
    }

    // C. Decorations (Inline styling)
    instructions.decorations.push(...this.getPreviewModeDecorations(card));

    return instructions;
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
