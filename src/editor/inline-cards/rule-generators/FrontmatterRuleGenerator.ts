/**
 * FrontmatterRuleGenerator - Generates rules for YAML front matter blocks
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Preview mode (cursor outside): 
 *   - "---" lines HIDDEN via setHiddenAreas
 *   - ViewZone header shows "Document Properties" (positioned before first content line)
 *   - Property lines styled with card borders
 *   - ViewZone footer at end (positioned after last content line)
 * 
 * - Edit mode (cursor inside):
 *   - All lines visible including "---" delimiters
 *   - Subtle card styling maintained
 * 
 * Key insight: ViewZones are positioned relative to CONTENT lines, not hidden delimiter lines.
 * This allows setHiddenAreas to work correctly.
 */

import { Range } from 'monaco-editor';
import { 
  CardRuleGenerator, 
  FrontMatterContent, 
  RowRule, 
  StyledRowRule,
  HiddenAreaRule,
  ViewZoneRule,
  RuleGenerationContext,
} from '../row-types';

export class FrontmatterRuleGenerator implements CardRuleGenerator<FrontMatterContent> {
  cardType = 'frontmatter' as const;

  generateRules(
    _content: FrontMatterContent,
    sourceRange: Range,
    context: RuleGenerationContext
  ): RowRule[] {
    const { isEditing } = context;
    const rules: RowRule[] = [];
    const startLine = sourceRange.startLineNumber;
    const endLine = sourceRange.endLineNumber;

    if (isEditing) {
      // Edit mode: Show all lines including --- delimiters with subtle styling
      
      // Style opening ---
      const openingStyledRule: StyledRowRule = {
        lineNumber: startLine,
        overrideType: 'styled',
        className: 'frontmatter-delimiter-line frontmatter-editing',
        decoration: {
          isWholeLine: true,
          inlineClassName: 'frontmatter-delimiter',
        },
      };
      rules.push(openingStyledRule);

      // Style property lines
      for (let lineNum = startLine + 1; lineNum < endLine; lineNum++) {
        const styledRule: StyledRowRule = {
          lineNumber: lineNum,
          overrideType: 'styled',
          className: 'frontmatter-property-line frontmatter-editing',
          decoration: {
            isWholeLine: true,
            inlineClassName: 'frontmatter-property',
          },
        };
        rules.push(styledRule);
      }

      // Style closing ---
      const closingStyledRule: StyledRowRule = {
        lineNumber: endLine,
        overrideType: 'styled',
        className: 'frontmatter-delimiter-line frontmatter-editing',
        decoration: {
          isWholeLine: true,
          inlineClassName: 'frontmatter-delimiter',
        },
      };
      rules.push(closingStyledRule);

      return rules;
    }

    // Preview mode: Hide --- delimiter lines, show ViewZone header/footer
    // Key insight: When lines are hidden via setHiddenAreas, ViewZones CANNOT reference 
    // the hidden line numbers. We must use explicit afterLineNumber to avoid this.
    // 
    // For frontmatter at lines 1-5 where lines 1 and 5 are "---":
    // - Hide lines 1 and 5
    // - Header must use afterLineNumber=0 (before everything, since line 1 is hidden)
    // - Footer uses afterLineNumber=4 (last visible content line)

    const firstContentLine = startLine + 1;
    const lastContentLine = endLine - 1;
    
    // Calculate the line number BEFORE the hidden opening delimiter
    // For frontmatter at start of file (startLine=1), this is 0
    const lineBeforeOpeningDelimiter = Math.max(0, startLine - 1);

    // 1. Hide opening --- line
    const hideOpeningRule: HiddenAreaRule = {
      lineNumber: startLine,
      overrideType: 'hidden-area',
    };
    rules.push(hideOpeningRule);

    // 2. ViewZone header (explicitly positioned BEFORE the hidden delimiter)
    // Since startLine is hidden, we MUST use explicit afterLineNumber
    const headerZoneRule: ViewZoneRule = {
      lineNumber: firstContentLine,
      overrideType: 'view-zone',
      cardType: 'frontmatter',
      zonePosition: 'header',
      heightInPx: 32,
      title: 'Document Properties',
      icon: 'file-text',
      className: 'frontmatter-card-header',
      afterLineNumber: lineBeforeOpeningDelimiter, // Explicit: before the hidden line
    };
    rules.push(headerZoneRule);

    // 3. Style property lines with borders
    for (let lineNum = firstContentLine; lineNum <= lastContentLine; lineNum++) {
      const isFirst = lineNum === firstContentLine;
      const isLast = lineNum === lastContentLine;
      
      const styledRule: StyledRowRule = {
        lineNumber: lineNum,
        overrideType: 'styled',
        className: `frontmatter-property-line ${isFirst ? 'frontmatter-property-first' : ''} ${isLast ? 'frontmatter-property-last' : ''}`,
        decoration: {
          isWholeLine: true,
          inlineClassName: 'frontmatter-property',
        },
      };
      rules.push(styledRule);
    }

    // 4. Hide closing --- line
    const hideClosingRule: HiddenAreaRule = {
      lineNumber: endLine,
      overrideType: 'hidden-area',
    };
    rules.push(hideClosingRule);

    // 5. ViewZone footer (positioned AFTER the last content line, not the hidden delimiter)
    const footerZoneRule: ViewZoneRule = {
      lineNumber: lastContentLine,
      overrideType: 'view-zone',
      cardType: 'frontmatter',
      zonePosition: 'footer',
      heightInPx: 8,
      className: 'frontmatter-card-footer',
    };
    rules.push(footerZoneRule);

    return rules;
  }
}
