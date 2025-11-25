/**
 * BlockquoteRuleGenerator - Generates rules for blockquote styling
 * 
 * Blockquotes get a styled card wrapper with left border accent.
 * Multi-line blockquotes use a spanning overlay.
 */

import { Range } from 'monaco-editor';
import React from 'react';
import { 
  CardRuleGenerator, 
  BlockquoteContent, 
  RowRule, 
  StyledRowRule,
  OverlayRowRule,
  GroupedContentRowRule,
  OverlayRenderProps,
} from '../row-types';

export class BlockquoteRuleGenerator implements CardRuleGenerator<BlockquoteContent> {
  cardType = 'blockquote' as const;

  generateRules(
    content: BlockquoteContent,
    sourceRange: Range,
    isEditing: boolean
  ): RowRule[] {
    const rules: RowRule[] = [];
    const startLine = sourceRange.startLineNumber;
    const endLine = sourceRange.endLineNumber;
    const lineCount = endLine - startLine + 1;

    if (lineCount === 1) {
      // Single line blockquote - just style it
      const styledRule: StyledRowRule = {
        lineNumber: startLine,
        overrideType: 'styled',
        className: 'blockquote-line',
        decoration: {
          isWholeLine: true,
          inlineClassName: 'blockquote-text italic text-muted-foreground',
          beforeContentClassName: 'blockquote-border-left',
        },
      };
      rules.push(styledRule);
    } else {
      // Multi-line blockquote - use spanning overlay for card effect
      const overlayId = `blockquote-${startLine}`;
      
      // First line gets the overlay rule
      const overlayRule: OverlayRowRule = {
        lineNumber: startLine,
        overrideType: 'overlay',
        position: 'right',
        overlayId,
        spanLines: { startLine, endLine },
        heightMode: 'match-lines',
        overlayWidth: '0px', // No actual overlay content, just styling
        renderOverlay: () => null, // Blockquotes don't need overlay content
      };
      rules.push(overlayRule);

      // Style each line
      for (let line = startLine; line <= endLine; line++) {
        const styledRule: StyledRowRule = {
          lineNumber: line,
          overrideType: 'styled',
          className: line === startLine 
            ? 'blockquote-line blockquote-first' 
            : line === endLine 
              ? 'blockquote-line blockquote-last'
              : 'blockquote-line',
          decoration: {
            isWholeLine: true,
            inlineClassName: 'blockquote-text italic text-muted-foreground',
            beforeContentClassName: line === startLine ? 'blockquote-border-left-start' : 'blockquote-border-left',
          },
        };
        rules.push(styledRule);

        // Mark subsequent lines as grouped content
        if (line > startLine) {
          const groupedRule: GroupedContentRowRule = {
            lineNumber: line,
            overrideType: 'grouped-content',
            parentOverlayId: overlayId,
          };
          rules.push(groupedRule);
        }
      }
    }

    return rules;
  }
}
