/**
 * FrontmatterRuleGenerator - Generates rules for YAML front matter blocks
 * 
 * Structure:
 * - Line 1 (---): Header rule
 * - Property lines: Individual overlay rules (each shows parsed property)
 * - Last line (---): Footer rule
 */

import { Range } from 'monaco-editor';
import React from 'react';
import { 
  CardRuleGenerator, 
  FrontMatterContent, 
  RowRule, 
  HeaderRowRule,
  FooterRowRule,
  OverlayRowRule,
  OverlayRenderProps,
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
    const { properties, rawYaml } = content;

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

    // 2. Property lines - each gets an overlay showing parsed value
    const rawLines = rawYaml.split('\n');
    const propertyEntries = Object.entries(properties);
    
    // Parse which line each property is on
    for (let i = 1; i < rawLines.length - 1; i++) {
      const lineNumber = startLine + i;
      const line = rawLines[i];
      
      // Find the property for this line
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = properties[key];
        
        if (value !== undefined) {
          const overlayRule: OverlayRowRule = {
            lineNumber,
            overrideType: 'overlay',
            position: 'right',
            overlayId: `frontmatter-prop-${lineNumber}`,
            overlayWidth: '50%',
            heightMode: 'match-lines',
            renderOverlay: (props: OverlayRenderProps) => {
              return React.createElement(FrontmatterPropertyOverlay, {
                propertyKey: key,
                propertyValue: value,
                ...props,
              });
            },
          };
          rules.push(overlayRule);
        }
      }
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

/**
 * Props for frontmatter property overlay
 */
interface FrontmatterPropertyOverlayProps extends OverlayRenderProps {
  propertyKey: string;
  propertyValue: string;
}

/**
 * Overlay showing parsed property key-value
 */
const FrontmatterPropertyOverlay: React.FC<FrontmatterPropertyOverlayProps> = ({
  propertyKey,
  propertyValue,
  onEdit,
}) => {
  return React.createElement('div', {
    className: 'frontmatter-property-overlay flex items-center h-full px-3 gap-4 text-sm cursor-pointer hover:bg-muted/30',
    onClick: () => onEdit(),
  }, [
    React.createElement('span', {
      key: 'key',
      className: 'font-semibold text-muted-foreground min-w-[80px]',
    }, propertyKey),
    React.createElement('span', {
      key: 'value',
      className: 'text-foreground',
    }, formatPropertyValue(propertyValue)),
  ]);
};

/**
 * Format property value for display (e.g., dates, lists)
 */
function formatPropertyValue(value: string): string {
  // Check if it looks like a date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return value;
    }
  }
  
  // Check if it's a comma-separated list
  if (value.includes(',')) {
    return value.split(',').map(v => v.trim()).join(', ');
  }
  
  return value;
}
