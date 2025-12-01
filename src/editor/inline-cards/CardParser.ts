/**
 * Inline Widget Card System - Card Parser
 * 
 * Parses editor content to detect all card types (headings, images, 
 * YouTube embeds, front matter, WOD blocks, etc.)
 */

import { editor } from 'monaco-editor';
import { InlineWidgetCard } from './types';
import { ICardParserStrategy } from '../parsers/ICardParserStrategy';
import { FrontMatterCardParser } from '../parsers/FrontMatterCardParser';
import { WodBlockParser } from '../parsers/WodBlockParser';
import { HeadingParser } from '../parsers/HeadingParser';
import { BlockquoteParser } from '../parsers/BlockquoteParser';
import { MediaCardParser } from '../parsers/MediaCardParser';

export class CardParser {
  private parsers: ICardParserStrategy[];

  constructor() {
    // Initialize parsers in order of precedence
    this.parsers = [
      new FrontMatterCardParser(),
      new WodBlockParser(),
      new HeadingParser(),
      new BlockquoteParser(),
      new MediaCardParser()
    ];
  }

  /**
   * Parse all cards from the editor model
   */
  parseAllCards(model: editor.ITextModel): InlineWidgetCard[] {
    const cards: InlineWidgetCard[] = [];
    const lines = model.getLinesContent();
    
    // Iterate through parsers
    for (const parser of this.parsers) {
      const newCards = parser.parse(lines, cards);
      cards.push(...newCards);
    }
    
    // Sort by start line
    cards.sort((a, b) => a.sourceRange.startLineNumber - b.sourceRange.startLineNumber);
    
    return cards;
  }
}
