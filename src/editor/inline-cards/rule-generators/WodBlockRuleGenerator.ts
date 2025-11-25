/**
 * WodBlockRuleGenerator - Generates rules for WOD code blocks
 * 
 * Structure:
 * - Line 1 (```wod): Header rule
 * - Lines 2-N: Spanning overlay with parsed workout + start button
 * - Last line (```): Footer rule
 */

import { Range } from 'monaco-editor';
import React from 'react';
import { 
  CardRuleGenerator, 
  WodBlockContent, 
  RowRule, 
  HeaderRowRule,
  FooterRowRule,
  OverlayRowRule,
  GroupedContentRowRule,
  OverlayRenderProps,
  FooterAction,
} from '../row-types';

export class WodBlockRuleGenerator implements CardRuleGenerator<WodBlockContent> {
  cardType = 'wod-block' as const;

  generateRules(
    content: WodBlockContent,
    sourceRange: Range,
    isEditing: boolean
  ): RowRule[] {
    const rules: RowRule[] = [];
    const startLine = sourceRange.startLineNumber;
    const endLine = sourceRange.endLineNumber;
    
    // Content lines are between the fences
    const contentStartLine = startLine + 1;
    const contentEndLine = endLine - 1;
    const hasContent = contentEndLine >= contentStartLine;

    // 1. Header rule for ```wod line
    const headerRule: HeaderRowRule = {
      lineNumber: startLine,
      overrideType: 'header',
      cardType: 'wod-block',
      title: 'Workout',
      icon: 'timer',
      className: 'wod-block-header',
    };
    rules.push(headerRule);

    // 2. Content lines with spanning overlay
    if (hasContent) {
      const overlayId = `wod-overlay-${startLine}`;
      
      // First content line gets the overlay rule
      const overlayRule: OverlayRowRule = {
        lineNumber: contentStartLine,
        overrideType: 'overlay',
        position: 'right',
        overlayId,
        spanLines: { 
          startLine: contentStartLine, 
          endLine: contentEndLine 
        },
        heightMode: 'match-lines',
        overlayWidth: '50%',
        renderOverlay: (props: OverlayRenderProps) => {
          // This will be rendered by the overlay component
          return React.createElement(WodBlockOverlayContent, {
            content,
            ...props,
          });
        },
      };
      rules.push(overlayRule);

      // Mark subsequent content lines as grouped
      for (let line = contentStartLine + 1; line <= contentEndLine; line++) {
        const groupedRule: GroupedContentRowRule = {
          lineNumber: line,
          overrideType: 'grouped-content',
          parentOverlayId: overlayId,
          lineClassName: 'wod-content-line',
        };
        rules.push(groupedRule);
      }
    }

    // 3. Footer rule for closing ``` line
    const footerActions: FooterAction[] = [];
    
    if (content.parseState === 'parsed' && content.statements.length > 0) {
      footerActions.push({
        id: 'start-workout',
        label: 'Start Workout',
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

/**
 * Props for WOD block overlay content
 */
interface WodBlockOverlayContentProps extends OverlayRenderProps {
  content: WodBlockContent;
}

/**
 * Overlay content component for WOD blocks
 * Shows parsed statements and workout preview
 */
const WodBlockOverlayContent: React.FC<WodBlockOverlayContentProps> = ({
  content,
  isEditing,
  onEdit,
}) => {
  const { statements, parseState } = content;
  
  return React.createElement('div', { 
    className: 'wod-overlay-content p-3 h-full flex flex-col'
  }, [
    // Header
    React.createElement('div', { 
      key: 'header',
      className: 'flex items-center gap-2 mb-2 text-xs text-muted-foreground'
    }, [
      React.createElement('span', { 
        key: 'label',
        className: `px-1.5 py-0.5 rounded-full text-[10px] ${
          parseState === 'parsed' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : parseState === 'error'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`
      }, parseState),
      React.createElement('span', { key: 'count' }, 
        `${statements.length} statement${statements.length !== 1 ? 's' : ''}`
      ),
    ]),
    
    // Statements list
    React.createElement('div', { 
      key: 'statements',
      className: 'flex-1 overflow-auto space-y-1'
    }, 
      statements.length > 0 
        ? statements.map((stmt, idx) => 
            React.createElement('div', { 
              key: idx,
              className: 'text-sm py-1 px-2 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer',
              onClick: () => onEdit(stmt.lineNumber),
            }, formatStatement(stmt))
          )
        : React.createElement('div', { 
            className: 'text-sm text-muted-foreground italic text-center py-4'
          }, parseState === 'error' ? 'Parse error' : 'No statements')
    ),
  ]);
};

/**
 * Format a statement for display
 */
function formatStatement(stmt: any): string {
  // Simple formatting - can be enhanced
  if (stmt.fragments) {
    return stmt.fragments.map((f: any) => f.text || f.value || '').join(' ');
  }
  return stmt.text || 'Statement';
}
