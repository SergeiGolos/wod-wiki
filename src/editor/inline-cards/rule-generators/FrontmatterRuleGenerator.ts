/**
 * FrontmatterRuleGenerator - Generates rules for YAML front matter blocks
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Preview mode (cursor outside): 
 *   - "---" lines styled to be visually hidden (collapsed)
 *   - ViewZone header shows "Document Properties"
 *   - Property lines styled with card borders
 *   - ViewZone footer at end
 * 
 * - Edit mode (cursor inside):
 *   - All lines visible including "---" delimiters
 *   - Subtle card styling maintained
 * 
 * Note: We don't use setHiddenAreas because it breaks ViewZone positioning.
 * Instead, we use CSS to visually collapse delimiter lines while keeping them
 * in the DOM for proper ViewZone afterLineNumber references.
 */

import { Range } from 'monaco-editor';
import { 
  CardRuleGenerator, 
  FrontMatterContent, 
  RowRule, 
  StyledRowRule,
  ViewZoneRule,
} from '../row-types';

export class FrontmatterRuleGenerator implements CardRuleGenerator<FrontMatterContent> {
  cardType = 'frontmatter' as const;

  generateRules(
    content: FrontMatterContent,
    sourceRange: Range,
    isEditing: boolean
  ): RowRule[] {
    const rules: RowRule[] = [];
    const startLine = sourceRange.startLineNumber;
    const endLine = sourceRange.endLineNumber;
    const propertyLineCount = endLine - startLine - 1; // Lines between --- markers

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

    // Preview mode: Style --- lines to be nearly invisible, show ViewZone header/footer
    // NOTE: We don't use setHiddenAreas because it breaks ViewZone positioning.
    // Instead, we style the delimiter lines to be visually hidden (collapsed height, opacity 0)

    // 1. Style opening --- line to be visually hidden
    const openingHiddenRule: StyledRowRule = {
      lineNumber: startLine,
      overrideType: 'styled',
      className: 'frontmatter-delimiter-hidden',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'frontmatter-delimiter-text-hidden',
      },
    };
    rules.push(openingHiddenRule);

    // 2. ViewZone header (appears before the delimiter line)
    const headerZoneRule: ViewZoneRule = {
      lineNumber: startLine,
      overrideType: 'view-zone',
      cardType: 'frontmatter',
      zonePosition: 'header',
      heightInPx: 32,
      title: 'Document Properties',
      icon: 'file-text',
      className: 'frontmatter-card-header',
    };
    rules.push(headerZoneRule);

    // 3. Style property lines with borders
    for (let lineNum = startLine + 1; lineNum < endLine; lineNum++) {
      const isFirst = lineNum === startLine + 1;
      const isLast = lineNum === endLine - 1;
      
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

    // 4. Style closing --- line to be visually hidden
    const closingHiddenRule: StyledRowRule = {
      lineNumber: endLine,
      overrideType: 'styled',
      className: 'frontmatter-delimiter-hidden',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'frontmatter-delimiter-text-hidden',
      },
    };
    rules.push(closingHiddenRule);

    // 5. ViewZone footer (appears after the delimiter line)
    const footerZoneRule: ViewZoneRule = {
      lineNumber: endLine,
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
