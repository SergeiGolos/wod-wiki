/**
 * WodBlockRuleGenerator - Generates rules for WOD code blocks
 * 
 * Structure:
 * - Line 1 (```wod): Header rule with parsed status
 * - Content lines: Styled rules with code block background
 * - Last line (```): Footer rule with action buttons
 * 
 * NOTE: We don't use overlay rules for WOD blocks because Monaco overlay widgets
 * position absolutely relative to the editor container, not relative to lines.
 * Instead, we use styled rules for visual feedback and header/footer for actions.
 */

import { Range } from 'monaco-editor';
import { 
  CardRuleGenerator, 
  WodBlockContent, 
  RowRule, 
  HeaderRowRule,
  FooterRowRule,
  StyledRowRule,
  FooterAction,
} from '../row-types';

export class WodBlockRuleGenerator implements CardRuleGenerator<WodBlockContent> {
  cardType = 'wod-block' as const;

  generateRules(
    content: WodBlockContent,
    sourceRange: Range,
    _isEditing: boolean
  ): RowRule[] {
    const rules: RowRule[] = [];
    const startLine = sourceRange.startLineNumber;
    const endLine = sourceRange.endLineNumber;
    
    // Determine title based on parse state
    const { parseState, statements } = content;
    let title = 'Workout';
    if (parseState === 'parsed') {
      title = statements.length > 0 
        ? `Workout (${statements.length} statement${statements.length !== 1 ? 's' : ''})`
        : 'Workout (empty)';
    } else if (parseState === 'error') {
      title = 'Workout (parse error)';
    }

    // 1. Header rule for ```wod line
    const headerRule: HeaderRowRule = {
      lineNumber: startLine,
      overrideType: 'header',
      cardType: 'wod-block',
      title,
      icon: 'timer',
      className: 'wod-block-header',
    };
    rules.push(headerRule);

    // 2. Style all lines with code block background
    for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
      const styledRule: StyledRowRule = {
        lineNumber: lineNum,
        overrideType: 'styled',
        className: 'wod-block-line',
        decoration: {
          isWholeLine: true,
          inlineClassName: lineNum === startLine || lineNum === endLine 
            ? 'wod-block-fence' 
            : 'wod-block-content',
        },
      };
      rules.push(styledRule);
    }

    // 3. Footer rule for closing ``` line
    const footerActions: FooterAction[] = [];
    
    if (parseState === 'parsed' && statements.length > 0) {
      footerActions.push({
        id: 'start-workout',
        label: 'Start',
        icon: 'play',
        variant: 'primary',
      });
    }

    const footerRule: FooterRowRule = {
      lineNumber: endLine,
      overrideType: 'footer',
      cardType: 'wod-block',
      actions: footerActions,
      className: 'wod-block-footer',
    };
    rules.push(footerRule);

    return rules;
  }
}
