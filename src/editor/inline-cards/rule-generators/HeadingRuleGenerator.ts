/**
 * HeadingRuleGenerator - Generates styled row rules for headings
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Preview mode (cursor outside): Hide # prefix, apply heading styling
 * - Edit mode (cursor on line): Show raw "# Heading" text with no styling
 */

import { Range } from 'monaco-editor';
import { 
  CardRuleGenerator, 
  HeadingContent, 
  RowRule, 
  StyledRowRule 
} from '../row-types';

/** CSS classes for each heading level */
const HEADING_STYLES: Record<number, string> = {
  1: 'heading-level-1',
  2: 'heading-level-2',
  3: 'heading-level-3',
  4: 'heading-level-4',
  5: 'heading-level-5',
  6: 'heading-level-6',
};

export class HeadingRuleGenerator implements CardRuleGenerator<HeadingContent> {
  cardType = 'heading' as const;

  generateRules(
    content: HeadingContent,
    sourceRange: Range,
    isEditing: boolean
  ): RowRule[] {
    const { level, prefixLength } = content;
    
    // Edit mode: No rules - show raw Monaco text
    if (isEditing) {
      return [];
    }
    
    // Preview mode: Hide prefix and apply heading styling
    const styledRule: StyledRowRule = {
      lineNumber: sourceRange.startLineNumber,
      overrideType: 'styled',
      className: HEADING_STYLES[level] || HEADING_STYLES[1],
      decoration: {
        hidePrefix: true,
        prefixLength: prefixLength,
        isWholeLine: true,
        inlineClassName: `heading-text ${HEADING_STYLES[level] || HEADING_STYLES[1]}`,
      },
    };

    return [styledRule];
  }
}
