/**
 * WodBlockRuleGenerator - Generates rules for WOD code blocks
 * 
 * Behavior per Monaco Card Behavior Spec:
 * - Both preview and edit mode use 50/50 split layout
 * - Opening fence (```wod) and closing fence (```) are styled minimal (text hidden when not editing)
 * - ViewZone header positioned after opening fence
 * - ViewZone footer positioned after closing fence (provides padding)
 * - Content lines get 50% width styling
 * - Right-side overlay shows WOD preview panel with Run button
 */

import { Range } from 'monaco-editor';
import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { 
  CardRuleGenerator, 
  WodBlockContent, 
  RowRule, 
  StyledRowRule,
  ViewZoneRule,
  OverlayRowRule,
  OverlayRenderProps,
  RuleGenerationContext,
} from '../row-types';
import { ICodeStatement } from '../../../core/types/core';

export class WodBlockRuleGenerator implements CardRuleGenerator<WodBlockContent> {
  cardType = 'wod-block' as const;

  generateRules(
    content: WodBlockContent,
    sourceRange: Range,
    context: RuleGenerationContext
  ): RowRule[] {
    const { isEditing, cursorLine, measuredHeight } = context;
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

    // Determine active statement index based on cursor line
    let activeStatementIndex = -1;
    if (isEditing && cursorLine >= startLine && cursorLine <= endLine && statements) {
      // Find the statement that corresponds to the current line
      // statements meta.line is 1-based relative to the block content
      // cursorLine is absolute
      // startLine is the opening fence (```wod)
      // So content starts at startLine + 1
      // If cursor is at startLine + 1, relative line is 1.
      const relativeCursorLine = cursorLine - startLine;

      activeStatementIndex = statements.findIndex(s => s.meta?.line === relativeCursorLine);
    }

    // Calculate heights for preview panel
    // These values should match the actual rendered sizes of WodPreviewPanel
    const lineHeight = 22; // Monaco line height
    const headerZoneHeight = 40; // ViewZone header (increased for visual balance)
    const previewHeaderHeight = 48; // Header with Run button (py-2 = 8px*2 + content ~32px)
    const previewFooterHeight = 36; // Footer with hints (py-2 = 8px*2 + text ~20px)
    const statementItemHeight = 48; // Each statement row (p-2 + border + content + space-y-2 gap)
    const bodyPadding = 24; // p-3 = 12px * 2
    const statementCount = statements?.length || 0;
    
    // Calculate total height needed for preview panel content
    // Use measured height if available, otherwise estimate
    let previewContentHeight;
    if (measuredHeight !== undefined && measuredHeight > 0) {
      previewContentHeight = measuredHeight;
    } else {
       const statementsHeight = Math.max(60, statementCount * statementItemHeight);
       previewContentHeight = previewHeaderHeight + statementsHeight + bodyPadding + previewFooterHeight;
    }
    
    // Calculate available height from visible lines:
    // - Opening fence line (styled minimal)
    // - Content lines (between fences)
    // - Closing fence line (styled minimal)
    const openingFenceHeight = lineHeight;
    const contentLinesHeight = contentLineCount * lineHeight;
    const closingFenceHeight = lineHeight;
    const visibleLinesHeight = openingFenceHeight + contentLinesHeight + closingFenceHeight;
    
    // The footer ViewZone needs to provide enough extra space so that:
    // headerZoneHeight + visibleLinesHeight + footerZoneHeight >= previewContentHeight
    // 
    // We want the preview panel to fit exactly without scrolling, and the total
    // card area (header + visible lines + footer) should equal the preview panel height.
    const footerZoneHeight = Math.max(8, previewContentHeight - headerZoneHeight - visibleLinesHeight);
    
    // Total card height = header + visible lines (opening fence + content + closing fence) + footer
    const totalCardHeight = headerZoneHeight + visibleLinesHeight + footerZoneHeight;

    // Calculate content line range (excluding fences)
    const firstContentLine = startLine + 1;
    const lastContentLine = endLine - 1;
    
    // Line before opening fence (where header will be positioned)
    const lineBeforeOpeningFence = Math.max(0, startLine - 1);

    // 1. ViewZone header (positioned BEFORE the opening fence line - above ```wod)
    const headerZoneRule: ViewZoneRule = {
      lineNumber: startLine,
      overrideType: 'view-zone',
      cardType: 'wod-block',
      zonePosition: 'header',
      heightInPx: headerZoneHeight,
      title,
      icon: statusIcon,
      className: 'wod-block-card-header',
      afterLineNumber: lineBeforeOpeningFence, // Before the opening fence line
    };
    rules.push(headerZoneRule);

    // 2. Style opening fence (```wod) - text hidden when not editing
    const openingFenceRule: StyledRowRule = {
      lineNumber: startLine,
      overrideType: 'styled',
      className: `wod-fence-line wod-fence-opening ${isEditing ? 'wod-fence-editing' : ''}`,
      decoration: {
        isWholeLine: true,
        inlineClassName: isEditing ? 'wod-fence-text-visible' : 'wod-fence-text-hidden',
      },
    };
    rules.push(openingFenceRule);

    // 3. Style content lines with 50% width for split view and left padding
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
    // The overlay spans from header to footer
    // Position starts at opening fence line, offset up to cover header zone
    // The overlay height = totalCardHeight (matches the full card area)
    //
    // Position calculation:
    // - spanLines.startLine = opening fence line
    // - getTopForLineNumber(opening fence) returns position AFTER the header ViewZone
    // - To align with header ViewZone top, we need topOffset = -headerZoneHeight
    if (contentLineCount > 0) {
      const overlayRule: OverlayRowRule = {
        lineNumber: startLine + 1,
        overrideType: 'overlay',
        position: 'right',
        overlayId: `wod-preview-${startLine}`,
        spanLines: { 
          startLine: startLine, // Include opening fence
          endLine: endLine // Include closing fence
        },
        overlayWidth: '50%',
        heightMode: 'fixed',
        fixedHeight: totalCardHeight,
        // Offset: from opening fence line, go up by header zone height
        // (getTopForLineNumber returns position after ViewZone, so we just need -headerZoneHeight)
        topOffset: -headerZoneHeight,
        renderOverlay: (props: OverlayRenderProps) => {
          return React.createElement(WodPreviewPanel, {
            statements: statements,
            parseState: parseState,
            sourceLines: props.sourceLines || [],
            isEditing: props.isEditing,
            activeStatementIndex: activeStatementIndex,
            onStartWorkout: () => props.onAction?.('start-workout'),
            // Convert relative line to absolute line for hover action
            onHover: (line: number) => props.onAction?.('hover-statement', { line: startLine + line }),
            onResize: (height: number) => props.onAction?.('resize', { height }),
          });
        },
      };
      rules.push(overlayRule);
    }

    // 5. Style closing fence (```) - text hidden when not editing
    const closingFenceRule: StyledRowRule = {
      lineNumber: endLine,
      overrideType: 'styled',
      className: `wod-fence-line wod-fence-closing ${isEditing ? 'wod-fence-editing' : ''}`,
      decoration: {
        isWholeLine: true,
        inlineClassName: isEditing ? 'wod-fence-text-visible' : 'wod-fence-text-hidden',
      },
    };
    rules.push(closingFenceRule);

    // 6. ViewZone footer - provides padding so the total card area fits the preview panel
    // This is purely visual padding, no actions - the Run button is in the preview panel
    const footerZoneRule: ViewZoneRule = {
      lineNumber: endLine,
      overrideType: 'view-zone',
      cardType: 'wod-block',
      zonePosition: 'footer',
      heightInPx: footerZoneHeight,
      className: 'wod-block-card-footer',
    };
    rules.push(footerZoneRule);

    return rules;
  }
}

/**
 * Fragment color mapping for visualization
 * Matches the Tailwind CSS color scheme used in FragmentVisualizer
 */
const fragmentColorMap: Record<string, string> = {
  timer: 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-100',
  rep: 'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-800 dark:text-green-100',
  effort: 'bg-yellow-100 border-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-800 dark:text-yellow-100',
  distance: 'bg-teal-100 border-teal-200 text-teal-800 dark:bg-teal-900/50 dark:border-teal-800 dark:text-teal-100',
  rounds: 'bg-purple-100 border-purple-200 text-purple-800 dark:bg-purple-900/50 dark:border-purple-800 dark:text-purple-100',
  action: 'bg-pink-100 border-pink-200 text-pink-800 dark:bg-pink-900/50 dark:border-pink-800 dark:text-pink-100',
  increment: 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:border-indigo-800 dark:text-indigo-100',
  lap: 'bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-900/50 dark:border-orange-800 dark:text-orange-100',
  text: 'bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100',
  resistance: 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-800 dark:text-red-100',
};

/**
 * Get color classes for a fragment type
 */
function getFragmentColorClasses(type: string): string {
  const normalizedType = type.toLowerCase();
  return fragmentColorMap[normalizedType] || 'bg-gray-200 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100';
}

/**
 * Get icon for fragment type
 */
function getFragmentIcon(type: string): string {
  const iconMap: Record<string, string> = {
    timer: '⏱️',
    duration: '⏱️',
    rounds: '🔄',
    rep: '×',
    reps: '×',
    resistance: '💪',
    weight: '💪',
    distance: '📏',
    action: '▶️',
    rest: '⏸️',
    effort: '🏃',
    lap: '+',
    increment: '↕️',
    text: '📝',
  };
  return iconMap[type.toLowerCase()] || '•';
}

/**
 * WOD Preview Panel Component
 * Displays parsed workout statements with colored fragments and run button
 */
interface WodPreviewPanelProps {
  statements: WodBlockContent['statements'];
  parseState: WodBlockContent['parseState'];
  sourceLines: string[];
  isEditing: boolean;
  activeStatementIndex?: number;
  onStartWorkout: () => void;
  onHover?: (line: number) => void;
  onResize?: (height: number) => void;
}

const WodPreviewPanel: React.FC<WodPreviewPanelProps> = ({
  statements,
  parseState,
  sourceLines,
  isEditing,
  activeStatementIndex = -1,
  onStartWorkout,
  onHover,
  onResize,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor height changes and report back
  useLayoutEffect(() => {
    if (!containerRef.current || !onResize) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          // Use border box height if possible, but entry gives content/border box.
          // Using offsetHeight from element is safer for including padding/border.
          onResize(containerRef.current?.offsetHeight || entry.contentRect.height);
        }
      }
    });

    observer.observe(containerRef.current);

    // Initial measurement
    onResize(containerRef.current.offsetHeight);

    return () => observer.disconnect();
  }, [statements?.length, parseState]); // Re-observe doesn't matter much but dependencies help trigger updates

  // Error state
  if (parseState === 'error') {
    return React.createElement('div', {
      ref: containerRef,
      className: 'wod-preview-panel wod-preview-error flex flex-col h-full bg-destructive/5 border-l border-destructive/30',
    }, [
      React.createElement('div', {
        key: 'header',
        className: 'flex items-center gap-2 px-4 py-3 border-b border-destructive/30 bg-destructive/10',
      }, [
        React.createElement('span', { key: 'icon', className: 'text-destructive text-lg' }, '⚠️'),
        React.createElement('span', { key: 'title', className: 'font-semibold text-destructive' }, 'Parse Error'),
      ]),
      React.createElement('div', {
        key: 'body',
        className: 'flex-1 p-4 text-sm text-muted-foreground',
      }, 'Unable to parse workout. Check syntax.'),
    ]);
  }

  // Empty state
  if (!statements || statements.length === 0) {
    return React.createElement('div', {
      ref: containerRef,
      className: 'wod-preview-panel wod-preview-empty flex flex-col h-full bg-muted/10 border-l border-border',
    }, [
      React.createElement('div', {
        key: 'header',
        className: 'flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20',
      }, [
        React.createElement('span', { key: 'icon', className: 'text-muted-foreground text-lg' }, '📝'),
        React.createElement('span', { key: 'title', className: 'font-semibold text-muted-foreground' }, 'Workout Preview'),
      ]),
      React.createElement('div', {
        key: 'body',
        className: 'flex-1 flex items-center justify-center p-4 text-muted-foreground',
      }, 'Enter workout details...'),
    ]);
  }

  // Main preview with statements
  return React.createElement('div', {
    ref: containerRef,
    className: 'wod-preview-panel flex flex-col h-full bg-card/80 border-l border-primary/20',
  }, [
    // Header with Run button
    React.createElement('div', {
      key: 'header',
      className: 'flex items-center justify-between px-4 py-2 border-b border-border bg-primary/5',
    }, [
      React.createElement('div', {
        key: 'title-section',
        className: 'flex items-center gap-2',
      }, [
        React.createElement('span', { key: 'icon', className: 'text-primary text-lg' }, '⏱️'),
        React.createElement('span', { key: 'title', className: 'font-semibold text-foreground' }, 'Workout Preview'),
        React.createElement('span', { 
          key: 'count', 
          className: 'text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full' 
        }, `${statements.length} step${statements.length !== 1 ? 's' : ''}`),
      ]),
      // Run Button
      React.createElement('button', {
        key: 'run-button',
        onMouseDown: (e: React.MouseEvent) => {
          e.stopPropagation(); // Prevent Monaco from stealing focus/selection
          console.log('[WodPreviewPanel] Run button clicked');
          onStartWorkout();
        },
        className: 'flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer',
      }, [
        React.createElement('span', { key: 'play-icon' }, '▶'),
        React.createElement('span', { key: 'label' }, 'Run'),
      ]),
    ]),
    
    // Statements list with fragments
    React.createElement('div', {
      key: 'body',
      className: 'flex-1 overflow-hidden p-3 space-y-2',
    }, statements.map((statement, index) => {
        const isActive = index === activeStatementIndex;
        return React.createElement('div', {
        key: index,
        className: `wod-statement-item bg-background/50 rounded-lg p-2 border transition-colors cursor-default ${isActive
          ? 'border-primary shadow-sm bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/50 hover:border-primary/30'}`,
        onMouseEnter: () => {
          if (statement.meta?.line && onHover) {
            onHover(statement.meta.line);
          }
        },
        onMouseLeave: () => {
             // Optional: could trigger hover end
        },
      }, [
        // Statement fragments as colored badges
        React.createElement('div', {
          key: 'fragments',
          className: 'flex flex-wrap gap-1',
        }, statement.fragments && statement.fragments.length > 0 
          ? statement.fragments.map((fragment: any, fragIndex: number) => {
              const type = fragment.type || fragment.fragmentType || 'text';
              const colorClasses = getFragmentColorClasses(type);
              const icon = getFragmentIcon(type);
              const value = fragment.image || (typeof fragment.value === 'object' 
                ? JSON.stringify(fragment.value) 
                : String(fragment.value || ''));
              
              return React.createElement('span', {
                key: fragIndex,
                className: `inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${colorClasses} shadow-sm`,
                title: `${type.toUpperCase()}: ${JSON.stringify(fragment.value, null, 2)}`,
              }, [
                React.createElement('span', { key: 'icon', className: 'text-sm leading-none' }, icon),
                React.createElement('span', { key: 'value' }, value),
              ]);
            })
          : React.createElement('span', {
              key: 'no-fragments',
              className: 'text-xs text-muted-foreground italic',
            }, statement.meta?.sourceRef || 'Empty statement')
        ),
      ]);
    })),
    
    // Footer with stats
    React.createElement('div', {
      key: 'footer',
      className: 'px-4 py-2 border-t border-border text-xs text-muted-foreground bg-muted/10 flex items-center justify-between',
    }, [
      React.createElement('span', { key: 'hint' }, 'Click Run to start workout'),
      React.createElement('span', { key: 'shortcut', className: 'font-mono' }, '⌘⏎'),
    ]),
  ]);
};
