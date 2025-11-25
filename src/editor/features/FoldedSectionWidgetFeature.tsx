/**
 * FoldedSectionWidgetFeature - Renders summary widgets for folded sections
 * 
 * When a heading section or WOD block is folded in Monaco, this feature replaces
 * the default "..." indicator with a rich summary widget that resembles the
 * EditorIndexPanel collapsed view:
 * 
 * - Heading sections: Show title with child count
 * - WOD blocks: Show parsed statements with "Start Workout" button
 * 
 * Uses Monaco's view zones to render React components inline with the editor.
 */

import React from 'react';
import { editor, Range } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import ReactDOM from 'react-dom/client';
import { WodBlock } from '../../markdown-editor/types';
import { Button } from '../../components/ui/button';
import { Play, ChevronRight, Timer, Hash } from 'lucide-react';

export interface FoldedSectionInfo {
  type: 'heading' | 'wod';
  startLine: number;
  endLine: number;
  level?: number; // For headings
  title?: string;
  wodBlock?: WodBlock;
}

interface FoldedHeadingWidgetProps {
  title: string;
  level: number;
  lineCount: number;
  onExpand: () => void;
}

/**
 * Widget shown when a heading section is folded
 */
const FoldedHeadingWidget: React.FC<FoldedHeadingWidgetProps> = ({
  title,
  level: _level,
  lineCount,
  onExpand
}) => {
  return (
    <div 
      className="folded-heading-widget inline-flex items-center gap-2 px-2 py-1 ml-2 rounded-md bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted transition-colors"
      onClick={onExpand}
    >
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <Hash className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs font-medium">{title}</span>
      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-background rounded">
        {lineCount} lines
      </span>
    </div>
  );
};

interface FoldedWodWidgetProps {
  wodBlock: WodBlock;
  onExpand: () => void;
  onStartWorkout?: () => void;
}

/**
 * Widget shown when a WOD block is folded
 */
const FoldedWodWidget: React.FC<FoldedWodWidgetProps> = ({
  wodBlock,
  onExpand,
  onStartWorkout
}) => {
  const statementCount = wodBlock.statements?.length || 0;
  const hasStatements = statementCount > 0;

  return (
    <div 
      className="folded-wod-widget flex items-center gap-2 px-3 py-2 ml-2 rounded-md bg-card border border-border cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onExpand}
    >
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Timer className="h-4 w-4 text-blue-500 flex-shrink-0" />
      
      {/* Summary content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {hasStatements ? (
          <>
            {/* Show first few statement summaries */}
            <div className="flex items-center gap-1 overflow-hidden">
              {wodBlock.statements?.slice(0, 3).map((statement, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded text-[10px] whitespace-nowrap"
                >
                  {statement.fragments?.slice(0, 2).map((f: any, fIdx: number) => (
                    <span key={fIdx} className="text-muted-foreground">
                      {f.image?.slice(0, 15) || f.type}
                    </span>
                  ))}
                </div>
              ))}
              {statementCount > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{statementCount - 3} more
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground italic">Empty workout</span>
        )}
      </div>

      {/* Status badge */}
      <span className={`
        text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0
        ${wodBlock.state === 'parsed' 
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
          : 'bg-muted text-muted-foreground'}
      `}>
        {wodBlock.state}
      </span>

      {/* Start button */}
      {onStartWorkout && wodBlock.state === 'parsed' && (
        <Button
          size="sm"
          className="h-6 px-2 text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onStartWorkout();
          }}
        >
          <Play className="h-3 w-3" />
          Start
        </Button>
      )}
    </div>
  );
};

/**
 * Manager class to handle folded section widgets
 */
export class FoldedSectionWidgetManager {
  private editor: editor.IStandaloneCodeEditor;
  private monaco: Monaco;
  private disposables: { dispose(): void }[] = [];
  private decorations: string[] = [];
  private foldedSections: Map<number, FoldedSectionInfo> = new Map();
  private widgetRoots: Map<number, ReactDOM.Root> = new Map();
  private wodBlocks: WodBlock[] = [];
  private onStartWorkout?: (block: WodBlock) => void;

  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    monaco: Monaco,
    onStartWorkout?: (block: WodBlock) => void
  ) {
    this.editor = editorInstance;
    this.monaco = monaco;
    this.onStartWorkout = onStartWorkout;

    // Listen for folding changes
    const foldingListener = this.editor.onDidChangeModel(() => {
      this.updateFoldedSections();
    });
    this.disposables.push(foldingListener);

    // Poll for folding state changes (Monaco doesn't have a direct event)
    const pollInterval = setInterval(() => {
      this.updateFoldedSections();
    }, 500);
    this.disposables.push({ dispose: () => clearInterval(pollInterval) });

    console.log('[FoldedSectionWidgetManager] Initialized');
  }

  /**
   * Update the WOD blocks for rendering widgets
   */
  public setWodBlocks(blocks: WodBlock[]): void {
    this.wodBlocks = blocks;
    this.updateFoldedSections();
  }

  private updateFoldedSections(): void {
    const model = this.editor.getModel();
    if (!model) return;

    // Get current folded regions using Monaco's internal API
    const foldingModel = (this.editor as any)._contributions?.get?.('editor.contrib.folding');
    if (!foldingModel) return;

    const foldingRanges = foldingModel.getFoldingModel?.()?.regions;
    if (!foldingRanges) return;

    const newFoldedLines = new Set<number>();
    const decorations: editor.IModelDeltaDecoration[] = [];

    // Find all collapsed regions
    for (let i = 0; i < foldingRanges.length; i++) {
      const region = foldingRanges.getRegion(i);
      if (region && region.isCollapsed) {
        const startLine = region.startLineNumber;
        const endLine = region.endLineNumber;
        newFoldedLines.add(startLine);

        // Determine if this is a heading or WOD block
        const lineContent = model.getLineContent(startLine);
        const headingMatch = lineContent.match(/^(#{1,6})\s+(.+)/);
        const isWodBlock = lineContent.trim() === '```wod';

        if (headingMatch) {
          this.foldedSections.set(startLine, {
            type: 'heading',
            startLine,
            endLine,
            level: headingMatch[1].length,
            title: headingMatch[2]
          });
        } else if (isWodBlock) {
          // Find the corresponding WodBlock
          const wodBlock = this.wodBlocks.find(b => b.startLine === startLine);
          this.foldedSections.set(startLine, {
            type: 'wod',
            startLine,
            endLine,
            wodBlock
          });
        }

        // Add an inline decoration widget at the end of the folded line
        const info = this.foldedSections.get(startLine);
        if (info) {
          decorations.push({
            range: new Range(startLine, model.getLineMaxColumn(startLine), startLine, model.getLineMaxColumn(startLine)),
            options: {
              after: {
                content: '', // We'll render React widget separately
                inlineClassName: 'folded-section-widget-placeholder'
              }
            }
          });
        }
      }
    }

    // Clean up widgets for sections that are no longer folded
    for (const [line] of this.foldedSections) {
      if (!newFoldedLines.has(line)) {
        this.removeWidget(line);
        this.foldedSections.delete(line);
      }
    }

    // Render widgets for newly folded sections
    for (const line of newFoldedLines) {
      if (!this.widgetRoots.has(line)) {
        this.renderWidget(line);
      }
    }

    // Update decorations
    this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
  }

  private renderWidget(line: number): void {
    const info = this.foldedSections.get(line);
    if (!info) return;

    // Create an overlay widget for the folded content
    const domNode = document.createElement('div');
    domNode.className = 'folded-section-widget-container';
    domNode.style.cssText = 'display: inline-flex; position: relative; z-index: 1;';

    const root = ReactDOM.createRoot(domNode);
    this.widgetRoots.set(line, root);

    const expandSection = () => {
      this.editor.setPosition({ lineNumber: line, column: 1 });
      this.editor.getAction('editor.unfold')?.run();
    };

    if (info.type === 'heading') {
      root.render(
        <FoldedHeadingWidget
          title={info.title || 'Section'}
          level={info.level || 1}
          lineCount={info.endLine - info.startLine}
          onExpand={expandSection}
        />
      );
    } else if (info.type === 'wod' && info.wodBlock) {
      root.render(
        <FoldedWodWidget
          wodBlock={info.wodBlock}
          onExpand={expandSection}
          onStartWorkout={this.onStartWorkout ? () => this.onStartWorkout?.(info.wodBlock!) : undefined}
        />
      );
    }

    // Add as an overlay widget
    const widget: editor.IOverlayWidget = {
      getId: () => `folded-widget-${line}`,
      getDomNode: () => domNode,
      getPosition: () => ({
        preference: this.monaco.editor.OverlayWidgetPositionPreference.TOP_CENTER
      })
    };

    this.editor.addOverlayWidget(widget);
  }

  private removeWidget(line: number): void {
    const root = this.widgetRoots.get(line);
    if (root) {
      root.unmount();
      this.widgetRoots.delete(line);
    }
  }

  public dispose(): void {
    // Clean up all widgets
    for (const [line] of this.widgetRoots) {
      this.removeWidget(line);
    }
    
    // Clean up decorations
    this.decorations = this.editor.deltaDecorations(this.decorations, []);
    
    // Dispose event handlers
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    console.log('[FoldedSectionWidgetManager] Disposed');
  }
}

// CSS styles for the widgets
export const foldedSectionWidgetStyles = `
.folded-section-widget-container {
  font-family: var(--font-sans, system-ui, sans-serif);
}

.folded-heading-widget,
.folded-wod-widget {
  user-select: none;
}
`;
