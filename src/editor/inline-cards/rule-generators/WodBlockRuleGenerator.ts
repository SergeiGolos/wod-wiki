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
import React, { useRef, useLayoutEffect } from 'react';
import type { 
  CardRuleGenerator, 
  WodBlockContent, 
  RowRule, 
  StyledRowRule,
  ViewZoneRule,
  OverlayRowRule,
  OverlayRenderProps,
  RuleGenerationContext,
} from '../row-types';
import { WodScriptVisualizer } from '../../../components/WodScriptVisualizer';

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

    // Content line range (excluding fences) - may be needed for future features
    // const _firstContentLine = startLine + 1;
    // const _lastContentLine = endLine - 1;
    
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
  sourceLines: _sourceLines,
  isEditing: _isEditing,
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
      className: 'wod-preview-panel wod-preview-error flex flex-col bg-destructive/5 border-l border-destructive/30',
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
      className: 'wod-preview-panel wod-preview-empty flex flex-col bg-muted/10 border-l border-border',
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
    className: 'wod-preview-panel flex flex-col bg-card/80 border-l border-primary/20',
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
      className: 'overflow-hidden px-3 flex flex-col justify-center',
    }, [
        React.createElement(WodScriptVisualizer, {
            key: 'visualizer',
            statements: statements,
            activeStatementIds: activeStatementIndex !== -1 && statements[activeStatementIndex] ? new Set([statements[activeStatementIndex].id]) : undefined,
            onHover: (id: number | null) => {
                if (id !== null && onHover) {
                    const stmt = statements.find(s => s.id === id);
                    if (stmt?.meta?.line !== undefined) {
                        onHover(stmt.meta.line);
                    }
                }
            }
        })
    ]),
    
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
