/**
 * HeadingRuleGenerator - Generates styled row rules for headings
 * 
 * Headings don't use cards - they just apply CSS styling to Monaco lines.
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
  1: 'heading-level-1 text-2xl font-bold',
  2: 'heading-level-2 text-xl font-bold',
  3: 'heading-level-3 text-lg font-semibold',
  4: 'heading-level-4 text-base font-semibold',
  5: 'heading-level-5 text-sm font-semibold',
  6: 'heading-level-6 text-sm font-medium',
};

export class HeadingRuleGenerator implements CardRuleGenerator<HeadingContent> {
  cardType = 'heading' as const;

  generateRules(
    content: HeadingContent,
    sourceRange: Range,
    _isEditing: boolean
  ): RowRule[] {
    const { level, prefixLength } = content;
    
    const styledRule: StyledRowRule = {
      lineNumber: sourceRange.startLineNumber,
      overrideType: 'styled',
      className: HEADING_STYLES[level] || HEADING_STYLES[1],
      decoration: {
        hidePrefix: true,
        prefixLength: prefixLength,
        isWholeLine: true,
        inlineClassName: `heading-text heading-level-${level}`,
      },
    };

    return [styledRule];
  }
}
