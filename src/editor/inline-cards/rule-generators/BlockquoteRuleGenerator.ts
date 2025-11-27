/**
 * BlockquoteRuleGenerator - Generates rules for blockquote styling
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Preview mode (cursor outside): Card with left border, ">" hidden, styled text
 * - Edit mode (cursor inside): Raw "> text" visible with subtle border styling
 * 
 * Multi-line blockquotes use header/footer decorations for card effect.
 */

import { Range } from 'monaco-editor';
import { 
  CardRuleGenerator, 
  BlockquoteContent, 
  RowRule, 
  StyledRowRule,
  HeaderRowRule,
  FooterRowRule,
  RuleGenerationContext,
} from '../row-types';

export class BlockquoteRuleGenerator implements CardRuleGenerator<BlockquoteContent> {
  cardType = 'blockquote' as const;

  generateRules(
    content: BlockquoteContent,
    sourceRange: Range,
    context: RuleGenerationContext
  ): RowRule[] {
    const { isEditing } = context;
    const rules: RowRule[] = [];
    const startLine = sourceRange.startLineNumber;
    const endLine = sourceRange.endLineNumber;
    const lineCount = endLine - startLine + 1;
    const prefixLength = content.prefixLength || 2; // "> " default

    if (isEditing) {
      // Edit mode: Show raw text with subtle styling
      for (let line = startLine; line <= endLine; line++) {
        const isFirst = line === startLine;
        const isLast = line === endLine;
        
        const styledRule: StyledRowRule = {
          lineNumber: line,
          overrideType: 'styled',
          className: `blockquote-line-editing ${isFirst ? 'blockquote-first-editing' : ''} ${isLast ? 'blockquote-last-editing' : ''}`,
          decoration: {
            isWholeLine: true,
            hidePrefix: false, // Show "> " in edit mode
            beforeContentClassName: 'blockquote-border-left-subtle',
          },
        };
        rules.push(styledRule);
      }
      return rules;
    }

    // Preview mode: Hide "> ", apply card styling
    if (lineCount === 1) {
      // Single line blockquote - just style with left border
      const styledRule: StyledRowRule = {
        lineNumber: startLine,
        overrideType: 'styled',
        className: 'blockquote-line blockquote-single',
        decoration: {
          isWholeLine: true,
          hidePrefix: true,
          prefixLength: prefixLength,
          inlineClassName: 'blockquote-text',
          beforeContentClassName: 'blockquote-left-border',
        },
      };
      rules.push(styledRule);
    } else {
      // Multi-line blockquote - use card wrapper
      
      // Header decoration (top border/rounding)
      const headerRule: HeaderRowRule = {
        lineNumber: startLine,
        overrideType: 'header',
        cardType: 'blockquote',
        className: 'blockquote-card-header',
      };
      rules.push(headerRule);

      // Style each content line
      for (let line = startLine; line <= endLine; line++) {
        const isFirst = line === startLine;
        const isLast = line === endLine;
        
        const styledRule: StyledRowRule = {
          lineNumber: line,
          overrideType: 'styled',
          className: `blockquote-card-line ${isFirst ? 'blockquote-first' : ''} ${isLast ? 'blockquote-last' : ''}`,
          decoration: {
            isWholeLine: true,
            hidePrefix: true,
            prefixLength: prefixLength,
            inlineClassName: 'blockquote-text',
            beforeContentClassName: 'blockquote-left-border',
          },
        };
        rules.push(styledRule);
      }

      // Footer decoration (bottom border/rounding)
      const footerRule: FooterRowRule = {
        lineNumber: endLine,
        overrideType: 'footer',
        cardType: 'blockquote',
        className: 'blockquote-card-footer',
        actions: [],
      };
      rules.push(footerRule);
    }

    return rules;
  }
}
