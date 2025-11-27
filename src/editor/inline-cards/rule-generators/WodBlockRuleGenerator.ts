/**
 * WodBlockRuleGenerator - Generates rules for WOD code blocks
 * 
 * Behavior:
 * - Desktop: 50/50 split layout with preview overlay on the right
 * - Mobile: Preview hidden by default, buttons in header to show preview/run workout
 * - Opening fence (```wod) and closing fence (```) are styled minimal (text hidden when not editing)
 * - ViewZone header positioned after opening fence with Preview/Run buttons on mobile
 * - ViewZone footer positioned after closing fence (provides padding)
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
  OverlayRenderProps,
  ViewZoneRenderProps,
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

    // Calculate heights for preview panel
    // These values should match the actual rendered sizes of WodPreviewPanel
    const lineHeight = 22; // Monaco line height
    const headerZoneHeight = 40; // ViewZone header (increased for visual balance)
    const previewHeaderHeight = 52; // Header with Run button
    const previewFooterHeight = 40; // Footer with hints
    const statementItemHeight = 40; // Each statement row (reduced for tighter spacing)
    const bodyPadding = 16; // Reduced padding
    const statementCount = statements?.length || 0;
    
    // Calculate total height needed for preview panel content
    const statementsHeight = Math.max(60, statementCount * statementItemHeight);
    const previewContentHeight = previewHeaderHeight + statementsHeight + bodyPadding + previewFooterHeight;
    
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
    
    // Line before opening fence (where header will be positioned)
    const lineBeforeOpeningFence = Math.max(0, startLine - 1);

    // 1. ViewZone header with Preview/Run buttons on mobile
    const headerZoneRule: ViewZoneRule = {
      lineNumber: startLine,
      overrideType: 'view-zone',
      cardType: 'wod-block',
      zonePosition: 'header',
      heightInPx: headerZoneHeight,
      title,
      icon: statusIcon,
      className: 'wod-block-card-header',
      afterLineNumber: lineBeforeOpeningFence,
      // Custom render to add Preview/Run buttons on mobile
      renderContent: (props: ViewZoneRenderProps) => {
        return React.createElement(WodBlockHeader, {
          title,
          statementCount: statements?.length || 0,
          statements,
          parseState,
          onAction: props.onAction,
        });
      },
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

    // 3. Style content lines - on mobile use full width, on desktop use 50% width
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

    // 4. Add spanning overlay for right-side preview (desktop only)
    // On mobile, we skip the overlay entirely - the header buttons provide access to preview
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    
    if (contentLineCount > 0 && !isMobileViewport) {
      const overlayRule: OverlayRowRule = {
        lineNumber: startLine + 1,
        overrideType: 'overlay',
        position: 'right',
        overlayId: `wod-preview-${startLine}`,
        spanLines: { 
          startLine: startLine,
          endLine: endLine
        },
        overlayWidth: '50%',
        heightMode: 'fixed',
        fixedHeight: totalCardHeight,
        topOffset: -headerZoneHeight,
        renderOverlay: (props: OverlayRenderProps) => {
          return React.createElement(WodPreviewOverlay, {
            statements: statements,
            parseState: parseState,
            sourceLines: props.sourceLines || [],
            isEditing: props.isEditing,
            onStartWorkout: () => props.onAction?.('start-workout'),
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
 * Hook to detect mobile viewport with debounced resize handling
 */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  
  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 100); // Debounce resize events
    };
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timeoutId);
    };
  }, []);
  
  return isMobile;
};

/**
 * WodBlockHeader - Header component for WOD blocks
 * 
 * On desktop: Shows title only
 * On mobile: Shows title + Preview button + Run button
 * 
 * The Preview button opens a modal/overlay to show the preview
 */
interface WodBlockHeaderProps {
  title: string;
  statementCount: number;
  statements: WodBlockContent['statements'];
  parseState: WodBlockContent['parseState'];
  onAction?: (actionId: string) => void;
}

const WodBlockHeader: React.FC<WodBlockHeaderProps> = ({
  title,
  statementCount,
  statements,
  parseState,
  onAction,
}) => {
  const isMobile = useIsMobile();
  const [showPreview, setShowPreview] = React.useState(false);
  
  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview(!showPreview);
  };
  
  const handleRunClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[WodBlockHeader] Run button clicked');
    onAction?.('start-workout');
  };

  // Base header with title
  const headerContent = [
    React.createElement('div', {
      key: 'title-section',
      className: 'flex items-center gap-2',
    }, [
      React.createElement('span', { key: 'icon', className: 'text-lg' }, '⏱️'),
      React.createElement('span', { key: 'title', className: 'text-sm font-medium text-foreground' }, title),
    ]),
  ];

  // On mobile, add Preview and Run buttons
  if (isMobile) {
    headerContent.push(
      React.createElement('div', {
        key: 'buttons',
        className: 'flex items-center gap-2',
      }, [
        // Preview button
        React.createElement('button', {
          key: 'preview-button',
          onClick: handlePreviewClick,
          className: 'flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded text-xs font-medium transition-colors cursor-pointer',
          title: showPreview ? 'Hide preview' : 'Show preview',
        }, [
          React.createElement('span', { key: 'icon' }, '👁️'),
          React.createElement('span', { key: 'label' }, 'Preview'),
        ]),
        // Run button
        React.createElement('button', {
          key: 'run-button',
          onClick: handleRunClick,
          className: 'flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer',
        }, [
          React.createElement('span', { key: 'icon' }, '▶'),
          React.createElement('span', { key: 'label' }, 'Run'),
        ]),
      ])
    );
  }

  return React.createElement('div', {
    className: 'wod-block-header-content flex items-center justify-between w-full h-full px-3 bg-gradient-to-r from-blue-500/20 to-transparent',
  }, [
    ...headerContent,
    // Mobile preview overlay (shown when preview button is clicked)
    showPreview && isMobile && React.createElement(MobilePreviewModal, {
      key: 'preview-modal',
      statements,
      parseState,
      onClose: () => setShowPreview(false),
      onStartWorkout: () => {
        onAction?.('start-workout');
        setShowPreview(false);
      },
    }),
  ]);
};

/**
 * Mobile Preview Modal - Full-screen preview overlay for mobile
 */
interface MobilePreviewModalProps {
  statements: WodBlockContent['statements'];
  parseState: WodBlockContent['parseState'];
  onClose: () => void;
  onStartWorkout: () => void;
}

const MobilePreviewModal: React.FC<MobilePreviewModalProps> = ({
  statements,
  parseState,
  onClose,
  onStartWorkout,
}) => {
  // Error state
  if (parseState === 'error') {
    return React.createElement('div', {
      className: 'fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col',
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        className: 'flex items-center justify-between px-4 py-3 border-b border-destructive/30 bg-destructive/10',
      }, [
        React.createElement('div', { 
          key: 'title', 
          className: 'flex items-center gap-2' 
        }, [
          React.createElement('span', { key: 'icon', className: 'text-destructive text-lg' }, '⚠️'),
          React.createElement('span', { key: 'text', className: 'font-semibold text-destructive' }, 'Parse Error'),
        ]),
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          className: 'p-2 hover:bg-destructive/20 rounded-md transition-colors cursor-pointer',
        }, '✕'),
      ]),
      // Body
      React.createElement('div', {
        key: 'body',
        className: 'flex-1 p-4 text-sm text-muted-foreground',
      }, 'Unable to parse workout. Check syntax.'),
    ]);
  }

  // Empty state
  if (!statements || statements.length === 0) {
    return React.createElement('div', {
      className: 'fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col',
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        className: 'flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20',
      }, [
        React.createElement('div', { 
          key: 'title', 
          className: 'flex items-center gap-2' 
        }, [
          React.createElement('span', { key: 'icon', className: 'text-muted-foreground text-lg' }, '📝'),
          React.createElement('span', { key: 'text', className: 'font-semibold text-muted-foreground' }, 'Workout Preview'),
        ]),
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          className: 'p-2 hover:bg-muted rounded-md transition-colors cursor-pointer',
        }, '✕'),
      ]),
      // Body
      React.createElement('div', {
        key: 'body',
        className: 'flex-1 flex items-center justify-center p-4 text-muted-foreground',
      }, 'Enter workout details...'),
    ]);
  }

  // Main preview
  return React.createElement('div', {
    className: 'fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col',
  }, [
    // Header with close and run buttons
    React.createElement('div', {
      key: 'header',
      className: 'flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5',
    }, [
      React.createElement('div', { 
        key: 'title', 
        className: 'flex items-center gap-2' 
      }, [
        React.createElement('span', { key: 'icon', className: 'text-primary text-lg' }, '⏱️'),
        React.createElement('span', { key: 'text', className: 'font-semibold text-foreground' }, 'Workout Preview'),
        React.createElement('span', { 
          key: 'count', 
          className: 'text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full' 
        }, `${statements.length} step${statements.length !== 1 ? 's' : ''}`),
      ]),
      React.createElement('div', {
        key: 'buttons',
        className: 'flex items-center gap-2',
      }, [
        // Run button
        React.createElement('button', {
          key: 'run',
          onClick: onStartWorkout,
          className: 'flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer',
        }, [
          React.createElement('span', { key: 'icon' }, '▶'),
          React.createElement('span', { key: 'label' }, 'Run'),
        ]),
        // Close button
        React.createElement('button', {
          key: 'close',
          onClick: onClose,
          className: 'p-2 hover:bg-muted rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground',
        }, '✕'),
      ]),
    ]),
    
    // Statements list
    React.createElement('div', {
      key: 'body',
      className: 'flex-1 overflow-auto p-4 space-y-3',
    }, statements.map((statement, index) => 
      React.createElement('div', {
        key: index,
        className: 'bg-card rounded-lg p-3 border border-border shadow-sm',
      }, [
        React.createElement('div', {
          key: 'fragments',
          className: 'flex flex-wrap gap-2',
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
                className: `inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-mono border ${colorClasses}`,
                title: `${type.toUpperCase()}: ${JSON.stringify(fragment.value, null, 2)}`,
              }, [
                React.createElement('span', { key: 'icon' }, icon),
                React.createElement('span', { key: 'value' }, value),
              ]);
            })
          : React.createElement('span', {
              key: 'no-fragments',
              className: 'text-sm text-muted-foreground italic',
            }, statement.meta?.sourceRef || 'Empty statement')
        ),
      ])
    )),
    
    // Footer
    React.createElement('div', {
      key: 'footer',
      className: 'px-4 py-3 border-t border-border bg-muted/10 flex items-center justify-center gap-4',
    }, [
      React.createElement('button', {
        key: 'run-large',
        onClick: onStartWorkout,
        className: 'flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-sm',
      }, [
        React.createElement('span', { key: 'icon' }, '▶'),
        React.createElement('span', { key: 'label' }, 'Start Workout'),
      ]),
    ]),
  ]);
};

/**
 * WodPreviewOverlay - Desktop-only preview panel
 * 
 * On mobile: Returns null (hidden)
 * On desktop: Shows the full preview panel at 50% width
 */
interface WodPreviewOverlayProps {
  statements: WodBlockContent['statements'];
  parseState: WodBlockContent['parseState'];
  sourceLines: string[];
  isEditing: boolean;
  onStartWorkout: () => void;
}

const WodPreviewOverlay: React.FC<WodPreviewOverlayProps> = ({
  statements,
  parseState,
  sourceLines,
  isEditing,
  onStartWorkout,
}) => {
  const isMobile = useIsMobile();
  
  // On mobile, don't render the overlay - use the header buttons instead
  if (isMobile) {
    return null;
  }

  // Error state
  if (parseState === 'error') {
    return React.createElement('div', {
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

  // Main preview with statements (desktop only)
  return React.createElement('div', {
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
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          console.log('[WodPreviewOverlay] Run button clicked');
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
      className: 'flex-1 overflow-auto p-3 space-y-2',
    }, statements.map((statement, index) => 
      React.createElement('div', {
        key: index,
        className: 'wod-statement-item bg-background/50 rounded-lg p-2 border border-border/50 hover:border-primary/30 transition-colors',
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
      ])
    )),
    
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
