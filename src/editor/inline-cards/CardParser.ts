/**
 * Inline Widget Card System - Card Parser
 * 
 * Parses editor content to detect all card types (headings, images, 
 * YouTube embeds, front matter, WOD blocks, etc.)
 */

import { editor, Range } from 'monaco-editor';
import { 
  InlineWidgetCard, 
  HeadingContent, 
  BlockquoteContent,
  ImageContent, 
  YouTubeContent, 
  FrontMatterContent, 
  WodBlockContent,
} from './types';
import { CARD_TYPE_CONFIGS } from './config';
import { FrontMatterParser } from '../frontmatter/FrontMatterParser';
import { MediaParser } from '../media/MediaParser';
import { MdTimerRuntime } from '../../parser/md-timer';
import { ICodeStatement } from '../../core/types/core';

// Singleton parser instance for WOD blocks
const wodParser = new MdTimerRuntime();

export class CardParser {
  /**
   * Parse all cards from the editor model
   */
  parseAllCards(model: editor.ITextModel): InlineWidgetCard[] {
    const cards: InlineWidgetCard[] = [];
    const lines = model.getLinesContent();
    
    // Parse each type - order matters for overlapping detection
    cards.push(...this.parseFrontMatter(lines));
    cards.push(...this.parseWodBlocks(lines));
    cards.push(...this.parseHeadings(lines, cards));
    cards.push(...this.parseBlockquotes(lines, cards));
    cards.push(...this.parseMedia(lines, cards));
    
    // Sort by start line
    cards.sort((a, b) => a.sourceRange.startLineNumber - b.sourceRange.startLineNumber);
    
    return cards;
  }

  /**
   * Check if a line is inside any existing card range
   */
  private isLineInExistingCard(lineNum: number, existingCards: InlineWidgetCard[]): boolean {
    return existingCards.some(card => 
      lineNum >= card.sourceRange.startLineNumber && 
      lineNum <= card.sourceRange.endLineNumber
    );
  }

  /**
   * Parse heading lines (# Heading, ## Heading, etc.)
   */
  private parseHeadings(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard<HeadingContent>[] {
    const cards: InlineWidgetCard<HeadingContent>[] = [];
    const config = CARD_TYPE_CONFIGS.heading;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Skip if inside another card (like frontmatter or wod block)
      if (this.isLineInExistingCard(lineNum, existingCards)) continue;
      
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (match) {
        const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        const text = match[2].trim();
        const prefixLength = match[1].length + 1; // "# " length
        
        // Calculate preview height based on heading level
        const previewPx = level === 1 ? 40 : level === 2 ? 36 : 32;
        
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
          editBehavior: config.editBehavior,
          heights: {
            previewPx,
            sourceLines: 1,
            cardPx: previewPx,
          },
        });
      }
    }
    
    return cards;
  }

  /**
   * Parse blockquote lines (> Quote text)
   */
  private parseBlockquotes(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard<BlockquoteContent>[] {
    const cards: InlineWidgetCard<BlockquoteContent>[] = [];
    const config = CARD_TYPE_CONFIGS.blockquote;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Skip if inside another card
      if (this.isLineInExistingCard(lineNum, existingCards)) continue;
      
      const match = line.match(/^>\s+(.*)$/);
      
      if (match) {
        const text = match[1];
        const prefixLength = 2; // "> " length
        
        cards.push({
          id: `blockquote-${lineNum}`,
          cardType: 'blockquote',
          sourceRange: new Range(lineNum, 1, lineNum, line.length + 1),
          content: {
            type: 'blockquote',
            text,
            prefixLength,
          },
          displayMode: 'full-preview',
          editBehavior: config.editBehavior,
          heights: {
            previewPx: config.defaultPreviewHeight,
            sourceLines: 1,
            cardPx: config.defaultPreviewHeight,
          },
        });
      }
    }
    
    return cards;
  }

  /**
   * Parse media lines (images and YouTube embeds)
   * Reuses existing MediaParser logic
   */
  private parseMedia(lines: string[], existingCards: InlineWidgetCard[]): InlineWidgetCard<ImageContent | YouTubeContent>[] {
    const cards: InlineWidgetCard<ImageContent | YouTubeContent>[] = [];
    const mediaBlocks = MediaParser.parse(lines);
    
    for (const block of mediaBlocks) {
      // Skip if inside another card
      if (this.isLineInExistingCard(block.line, existingCards)) continue;
      
      // Only process whole-line media (standalone images/videos)
      if (!block.isWholeLine) continue;
      
      const lineContent = lines[block.line - 1];
      
      if (block.type === 'image') {
        const config = CARD_TYPE_CONFIGS.image;
        cards.push({
          id: `image-${block.line}`,
          cardType: 'image',
          sourceRange: new Range(block.line, 1, block.line, lineContent.length + 1),
          content: {
            type: 'image',
            url: block.url,
            alt: block.alt || '',
            rawMarkdown: lineContent,
          },
          displayMode: 'full-preview',
          editBehavior: config.editBehavior,
          heights: {
            previewPx: config.defaultPreviewHeight,
            sourceLines: 1,
            cardPx: config.defaultPreviewHeight,
          },
        });
      } else if (block.type === 'youtube') {
        const config = CARD_TYPE_CONFIGS.youtube;
        // Extract video ID from embed URL
        const videoIdMatch = block.url.match(/embed\/([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : '';
        
        cards.push({
          id: `youtube-${block.line}`,
          cardType: 'youtube',
          sourceRange: new Range(block.line, 1, block.line, lineContent.length + 1),
          content: {
            type: 'youtube',
            videoId,
            embedUrl: block.url,
            rawUrl: lineContent.trim(),
          },
          displayMode: 'full-preview',
          editBehavior: config.editBehavior,
          heights: {
            previewPx: config.defaultPreviewHeight,
            sourceLines: 1,
            cardPx: config.defaultPreviewHeight,
          },
        });
      }
    }
    
    return cards;
  }

  /**
   * Parse front matter blocks (YAML between --- delimiters)
   * Reuses existing FrontMatterParser logic
   */
  private parseFrontMatter(lines: string[]): InlineWidgetCard<FrontMatterContent>[] {
    const cards: InlineWidgetCard<FrontMatterContent>[] = [];
    const blocks = FrontMatterParser.parse(lines);
    const config = CARD_TYPE_CONFIGS.frontmatter;
    
    for (const block of blocks) {
      // Get raw YAML content
      const rawLines = lines.slice(block.startLine - 1, block.endLine);
      const rawYaml = rawLines.join('\n');
      
      // Calculate height based on number of properties
      const propertyCount = Object.keys(block.properties).length;
      const previewPx = Math.max(config.minHeight, (propertyCount + 1) * 28);
      
      cards.push({
        id: `frontmatter-${block.startLine}`,
        cardType: 'frontmatter',
        sourceRange: new Range(block.startLine, 1, block.endLine, 1),
        content: {
          type: 'frontmatter',
          properties: block.properties,
          rawYaml,
        },
        displayMode: 'full-preview',
        editBehavior: config.editBehavior,
        heights: {
          previewPx,
          sourceLines: block.endLine - block.startLine + 1,
          cardPx: previewPx,
        },
      });
    }
    
    return cards;
  }

  /**
   * Parse WOD code blocks (```wod ... ```)
   */
  private parseWodBlocks(lines: string[]): InlineWidgetCard<WodBlockContent>[] {
    const cards: InlineWidgetCard<WodBlockContent>[] = [];
    const config = CARD_TYPE_CONFIGS['wod-block'] || CARD_TYPE_CONFIGS.frontmatter; // fallback
    
    let inBlock = false;
    let blockStart = -1;
    let blockContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim().toLowerCase();
      const lineNum = i + 1;
      
      if (!inBlock && trimmedLine.startsWith('```wod')) {
        // Start of WOD block
        inBlock = true;
        blockStart = lineNum;
        blockContent = [];
      } else if (inBlock && line.trim().startsWith('```')) {
        // End of WOD block
        const blockEnd = lineNum;
        const rawContent = blockContent.join('\n');
        
        // Parse the WOD content
        let statements: ICodeStatement[] = [];
        let parseState: 'pending' | 'parsed' | 'error' = 'pending';
        
        try {
          const script = wodParser.read(rawContent);
          statements = script.statements;
          
          // Check for parser errors
          if (script.errors && script.errors.length > 0) {
            parseState = 'error';
          } else {
            parseState = 'parsed';
          }
        } catch (err) {
          parseState = 'error';
        }
        
        const previewPx = Math.max(100, (blockEnd - blockStart + 1) * 22);
        
        cards.push({
          id: `wod-block-${blockStart}`,
          cardType: 'wod-block',
          sourceRange: new Range(blockStart, 1, blockEnd, lines[blockEnd - 1].length + 1),
          content: {
            type: 'wod-block',
            rawCode: rawContent,
            statements,
            parseState,
          },
          displayMode: 'full-preview',
          editBehavior: config?.editBehavior || 'click-to-edit',
          heights: {
            previewPx,
            sourceLines: blockEnd - blockStart + 1,
            cardPx: previewPx,
          },
        });
        
        inBlock = false;
        blockStart = -1;
        blockContent = [];
      } else if (inBlock) {
        blockContent.push(line);
      }
    }
    
    return cards;
  }
}
