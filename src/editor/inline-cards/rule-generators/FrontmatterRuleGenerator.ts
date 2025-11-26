/**
 * FrontmatterRuleGenerator - Generates rules for YAML front matter blocks
 * 
 * Structure:
 * - Line 1 (---): Header rule with styled row for frontmatter background
 * - Property lines: Styled rows (no overlays - they don't position well)
 * - Last line (---): Footer rule
 * 
 * NOTE: We intentionally do NOT use overlay rules for frontmatter properties
 * because Monaco overlay widgets use absolute positioning relative to the
 * editor container, not relative to specific lines.
 */

import { Range } from 'monaco-editor';
import { 
  CardRuleGenerator, 
  FrontMatterContent, 
  RowRule, 
  HeaderRowRule,
  FooterRowRule,
  StyledRowRule,
} from '../row-types';

export class FrontmatterRuleGenerator implements CardRuleGenerator<FrontMatterContent> {
  cardType = 'frontmatter' as const;

  generateRules(
    content: FrontMatterContent,
    sourceRange: Range,
    _isEditing: boolean
  ): RowRule[] {
    const rules: RowRule[] = [];
    const startLine = sourceRange.startLineNumber;
    const endLine = sourceRange.endLineNumber;

    // 1. Header rule for opening ---
    const headerRule: HeaderRowRule = {
      lineNumber: startLine,
      overrideType: 'header',
      cardType: 'frontmatter',
      title: 'Document Properties',
      icon: 'file-text',
      className: 'frontmatter-header',
    };
    rules.push(headerRule);

    // 2. Style all frontmatter lines with a background
    for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
      const styledRule: StyledRowRule = {
        lineNumber: lineNum,
        overrideType: 'styled',
        className: 'frontmatter-line',
        decoration: {
          isWholeLine: true,
          inlineClassName: lineNum === startLine || lineNum === endLine 
            ? 'frontmatter-delimiter' 
            : 'frontmatter-property',
        },
      };
      rules.push(styledRule);
    }

    // 3. Footer rule for closing ---
    const footerRule: FooterRowRule = {
      lineNumber: endLine,
      overrideType: 'footer',
      cardType: 'frontmatter',
      actions: [],
      className: 'frontmatter-footer',
    };
    rules.push(footerRule);

    return rules;
  }
}
