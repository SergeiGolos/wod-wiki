/**
 * WodBlockRuleGenerator - Generates rules for WOD code blocks
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Both preview and edit mode use 50/50 split layout
 * - Fence lines (```wod and ```) are styled to be visually hidden
 * - ViewZone header/footer appear before/after the hidden fences
 * - Content lines get 50% width styling
 * - Right-side overlay shows WOD preview panel
 * 
 * Note: We don't use setHiddenAreas because it breaks ViewZone positioning.
 * Instead, we use CSS to visually collapse fence lines while keeping them
 * in the DOM for proper ViewZone afterLineNumber references.
 */

import { Range } from 'monaco-editor';
import React from 'react';
import { 
  CardRuleGenerator, 
  WodBlockContent, 
  RowRule, 
  StyledRowRule,
  ViewZoneRule,
  OverlayRowRule,
  FooterAction,
  OverlayRenderProps,
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
    const contentLineCount = endLine - startLine - 1; // Lines between fences
    
    // Determine title based on parse state
    const { parseState, statements } = content;
    let title = 'Workout';
    let statusIcon = 'timer';
    
    if (parseState === 'parsed') {
      title = statements.length > 0 
        ? `Workout (${statements.length} statement${statements.length !== 1 ? 's' : ''})`
        : 'Workout (empty)';
    } else if (parseState === 'error') {
      title = 'Workout (parse error)';
      statusIcon = 'alert-circle';
    }

    // Calculate preview height based on content
    const lineHeight = 22; // Approximate line height
    const previewHeight = Math.max(120, contentLineCount * lineHeight);

    // 1. Style opening fence to be visually hidden (```wod)
    // NOTE: We don't use setHiddenAreas because it breaks ViewZone positioning.
    const openingHiddenRule: StyledRowRule = {
      lineNumber: startLine,
      overrideType: 'styled',
      className: 'wod-fence-hidden',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'wod-fence-text-hidden',
      },
    };
    rules.push(openingHiddenRule);

    // 2. ViewZone header (appears before the fence line)
    const headerZoneRule: ViewZoneRule = {
      lineNumber: startLine,
      overrideType: 'view-zone',
      cardType: 'wod-block',
      zonePosition: 'header',
      heightInPx: 36,
      title,
      icon: statusIcon,
      className: 'wod-block-card-header',
    };
    rules.push(headerZoneRule);

    // 3. Style content lines with 50% width for split view
    for (let lineNum = startLine + 1; lineNum < endLine; lineNum++) {
      const styledRule: StyledRowRule = {
        lineNumber: lineNum,
        overrideType: 'styled',
        className: 'wod-block-content-line',
        decoration: {
          isWholeLine: true,
          inlineClassName: 'wod-code-text',
        },
      };
      rules.push(styledRule);
    }

    // 4. Add spanning overlay for right-side preview (50% width)
    if (contentLineCount > 0) {
      const overlayRule: OverlayRowRule = {
        lineNumber: startLine + 1,
        overrideType: 'overlay',
        position: 'right',
        overlayId: `wod-preview-${startLine}`,
        spanLines: { 
          startLine: startLine + 1, 
          endLine: endLine - 1 
        },
        overlayWidth: '50%',
        heightMode: 'match-lines',
        renderOverlay: (props: OverlayRenderProps) => {
          return React.createElement(WodPreviewPanel, {
            statements: statements,
            parseState: parseState,
            sourceLines: props.sourceLines || [],
            isEditing: props.isEditing,
            onStartWorkout: () => props.onEdit(),
          });
        },
      };
      rules.push(overlayRule);
    }

    // 5. Style closing fence to be visually hidden (```)
    const closingHiddenRule: StyledRowRule = {
      lineNumber: endLine,
      overrideType: 'styled',
      className: 'wod-fence-hidden',
      decoration: {
        isWholeLine: true,
        inlineClassName: 'wod-fence-text-hidden',
      },
    };
    rules.push(closingHiddenRule);

    // 6. ViewZone footer with actions (appears after the fence line)
    const footerActions: FooterAction[] = [];
    
    if (parseState === 'parsed' && statements.length > 0) {
      footerActions.push({
        id: 'start-workout',
        label: 'Start Workout',
        icon: 'play',
        variant: 'primary',
      });
    }

    const footerZoneRule: ViewZoneRule = {
      lineNumber: endLine,
      overrideType: 'view-zone',
      cardType: 'wod-block',
      zonePosition: 'footer',
      heightInPx: footerActions.length > 0 ? 40 : 8,
      className: 'wod-block-card-footer',
      actions: footerActions,
    };
    rules.push(footerZoneRule);

    return rules;
  }
}

/**
 * WOD Preview Panel Component
 * Displays parsed workout statements in a preview format
 */
interface WodPreviewPanelProps {
  statements: WodBlockContent['statements'];
  parseState: WodBlockContent['parseState'];
  sourceLines: string[];
  isEditing: boolean;
  onStartWorkout: () => void;
}

const WodPreviewPanel: React.FC<WodPreviewPanelProps> = ({
  statements,
  parseState,
  sourceLines,
  isEditing,
  onStartWorkout,
}) => {
  if (parseState === 'error') {
    return React.createElement('div', {
      className: 'wod-preview-panel wod-preview-error p-4',
    }, [
      React.createElement('div', {
        key: 'icon',
        className: 'text-destructive text-lg mb-2',
      }, '⚠️ Parse Error'),
      React.createElement('div', {
        key: 'message',
        className: 'text-sm text-muted-foreground',
      }, 'Unable to parse workout. Check syntax.'),
    ]);
  }

  if (!statements || statements.length === 0) {
    return React.createElement('div', {
      className: 'wod-preview-panel wod-preview-empty p-4 text-center',
    }, [
      React.createElement('div', {
        key: 'message',
        className: 'text-muted-foreground',
      }, 'Enter workout details...'),
    ]);
  }

  return React.createElement('div', {
    className: 'wod-preview-panel p-3 h-full overflow-auto',
  }, [
    React.createElement('div', {
      key: 'statements',
      className: 'space-y-2',
    }, statements.map((statement, index) => 
      React.createElement('div', {
        key: index,
        className: 'wod-statement-preview flex items-start gap-2 text-sm',
      }, [
        React.createElement('span', {
          key: 'icon',
          className: 'text-primary',
        }, getStatementIcon(statement)),
        React.createElement('span', {
          key: 'text',
          className: 'flex-1',
        }, formatStatement(statement)),
      ])
    )),
  ]);
};

// Helper functions for WOD preview
function getStatementIcon(statement: any): string {
  // Determine icon based on statement type/fragments
  if (statement.fragments) {
    const hasRounds = statement.fragments.some((f: any) => f.type === 'rounds');
    const hasTimer = statement.fragments.some((f: any) => f.type === 'timer');
    const hasEffort = statement.fragments.some((f: any) => f.type === 'effort');
    
    if (hasRounds) return '🔄';
    if (hasTimer) return '⏱️';
    if (hasEffort) return '💪';
  }
  return '•';
}

function formatStatement(statement: any): string {
  if (statement.sourceRef) {
    return statement.sourceRef;
  }
  return JSON.stringify(statement).slice(0, 50);
}
