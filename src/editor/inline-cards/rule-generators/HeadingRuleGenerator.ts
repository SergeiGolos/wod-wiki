/**
 * HeadingRuleGenerator - Generates styled row rules for headings
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Preview mode (cursor outside): Hide # prefix, apply heading styling, add padding via ViewZone
 * - Edit mode (cursor on line): Show raw "# Heading" text with no styling
 * 
 * Note: Monaco controls line heights, so we use ViewZones to add vertical padding
 * after headings to give them more visual weight.
 */

import { Range } from 'monaco-editor';
import { 
  CardRuleGenerator, 
  HeadingContent, 
  RowRule, 
  StyledRowRule,
  ViewZoneRule, 
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

/** Padding heights (in px) after each heading level */
const HEADING_PADDING: Record<number, number> = {
  1: 12, // H1 gets most padding
  2: 10,
  3: 8,
  4: 6,
  5: 4,
  6: 4,
};

export class HeadingRuleGenerator implements CardRuleGenerator<HeadingContent> {
  cardType = 'heading' as const;

  generateRules(
    content: HeadingContent,
    sourceRange: Range,
    isEditing: boolean
  ): RowRule[] {
    const { level, prefixLength } = content;
    const rules: RowRule[] = [];
    
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
    rules.push(styledRule);

    // Add ViewZone padding after heading
    // This creates visual space below the heading since Monaco line heights can't be changed via CSS
    const paddingHeight = HEADING_PADDING[level] || HEADING_PADDING[6];
    const paddingRule: ViewZoneRule = {
      lineNumber: sourceRange.startLineNumber,
      overrideType: 'view-zone',
      cardType: 'heading',
      zonePosition: 'footer', // Positioned after the heading line
      heightInPx: paddingHeight,
      className: `heading-padding heading-${level}-padding`,
      afterLineNumber: sourceRange.startLineNumber, // Position after the heading
    };
    rules.push(paddingRule);

    return rules;
  }
}
