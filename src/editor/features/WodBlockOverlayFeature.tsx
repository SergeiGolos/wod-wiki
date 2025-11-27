/**
 * WodBlockSplitViewFeature - Split view overlay for WOD blocks in Monaco
 * 
 * This feature creates a split-view effect within the Monaco editor where
 * WOD blocks show their stylized visualization on the right half of the
 * editor. The raw WOD code remains on the left, and the parsed/stylized
 * view appears on the right.
 * 
 * Key behaviors:
 * - Automatically detects WOD blocks in the editor
 * - Renders a semi-transparent overlay on the right side
 * - Shows parsed statements with FragmentVisualizer style
 * - Includes "Start Workout" button
 * - Updates in real-time as the code is edited
 */

import React, { useState } from 'react';
import { editor, Range } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import ReactDOM from 'react-dom/client';
import { WodBlock } from '../../markdown-editor/types';
import { StatementDisplay } from '../../components/fragments/StatementDisplay';
import { Button } from '../../components/ui/button';
import { Play, ChevronDown, ChevronRight, Timer, Eye, EyeOff } from 'lucide-react';

export interface WodBlockOverlayProps {
  block: WodBlock;
  onStartWorkout?: () => void;
  onEdit?: () => void;
}

/**
 * WodBlockOverlay - React component for the inline visualization
 */
const WodBlockOverlay: React.FC<WodBlockOverlayProps> = ({ block, onStartWorkout, onEdit }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!block.statements || block.statements.length === 0) {
    return (
      <div className="wod-overlay-empty p-2 text-xs text-muted-foreground italic">
        No statements parsed
      </div>
    );
  }

  return (
    <div className="wod-block-overlay h-full flex flex-col bg-card/95 backdrop-blur-sm border-l border-border">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            {isExpanded ? '▼' : '▶'} Workout
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {block.state}
          </span>
        </div>
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
        )}
      </div>

      {/* Statements */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {block.statements.map((statement, index) => (
            <div
              key={index}
              className="text-xs p-1.5 rounded bg-background/50 border border-border/50"
            >
              {/* Render fragments inline */}
              <div className="flex flex-wrap gap-1">
                {statement.fragments?.map((fragment: any, fIdx: number) => (
                  <span
                    key={fIdx}
                    className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] ${getFragmentClass(fragment.type)}`}
                  >
                    {fragment.image || fragment.type}
                  </span>
                )) || (
                  <span className="text-muted-foreground">Statement {index + 1}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Button */}
      {onStartWorkout && block.state === 'parsed' && (
        <div className="p-2 border-t border-border">
          <button
            onClick={onStartWorkout}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90"
          >
            ▶ Start
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Get CSS class for fragment type
 */
function getFragmentClass(type: string): string {
  const classes: Record<string, string> = {
    'timer': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'rounds': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'rep': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'effort': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'weight': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    'distance': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    'calories': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return classes[type?.toLowerCase()] || 'bg-muted text-muted-foreground';
}

/**
 * WodBlockOverlayManager - Manages WOD block overlays in Monaco
 * 
 * Uses Monaco's overlay widgets to create a split-view effect where the
 * visualization appears on the right side of the WOD block lines.
 */
export class WodBlockOverlayManager {
  private editor: editor.IStandaloneCodeEditor;
  private overlays: Map<string, {
    widget: editor.IOverlayWidget;
    root: ReactDOM.Root;
    domNode: HTMLDivElement;
  }> = new Map();
  private blocks: WodBlock[] = [];
  private disposables: { dispose(): void }[] = [];
  private onStartWorkout?: (block: WodBlock) => void;

  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    onStartWorkout?: (block: WodBlock) => void
  ) {
    this.editor = editorInstance;
    this.onStartWorkout = onStartWorkout;

    // Listen to layout changes to reposition overlays
    const layoutHandler = this.editor.onDidLayoutChange(() => {
      this.updateOverlayPositions();
    });
    this.disposables.push(layoutHandler);

    // Listen to scroll changes
    const scrollHandler = this.editor.onDidScrollChange(() => {
      this.updateOverlayPositions();
    });
    this.disposables.push(scrollHandler);

    console.log('[WodBlockOverlayManager] Initialized');
  }

  /**
   * Update the WOD blocks to display
   */
  public updateBlocks(blocks: WodBlock[]): void {
    this.blocks = blocks;
    this.renderOverlays();
  }

  private renderOverlays(): void {
    // Remove old overlays that no longer exist
    const currentBlockIds = new Set(this.blocks.map(b => b.id));
    for (const [id, overlay] of this.overlays) {
      if (!currentBlockIds.has(id)) {
        this.removeOverlay(id);
      }
    }

    // Create or update overlays for each block
    for (const block of this.blocks) {
      if (block.state !== 'parsed') continue;
      
      if (this.overlays.has(block.id)) {
        // Update existing overlay
        this.updateOverlay(block);
      } else {
        // Create new overlay
        this.createOverlay(block);
      }
    }
  }

  private createOverlay(block: WodBlock): void {
    const domNode = document.createElement('div');
    domNode.className = 'wod-block-overlay-container';
    domNode.style.cssText = `
      position: absolute;
      width: 300px;
      pointer-events: auto;
      z-index: 10;
    `;

    const root = ReactDOM.createRoot(domNode);
    
    const widget: editor.IOverlayWidget = {
      getId: () => `wod-overlay-${block.id}`,
      getDomNode: () => domNode,
      getPosition: () => null // We'll position manually
    };

    this.editor.addOverlayWidget(widget);
    
    // Render React component
    root.render(
      <WodBlockOverlay
        block={block}
        onStartWorkout={this.onStartWorkout ? () => this.onStartWorkout?.(block) : undefined}
        onEdit={() => this.focusBlock(block)}
      />
    );

    this.overlays.set(block.id, { widget, root, domNode });
    this.positionOverlay(block);
  }

  private updateOverlay(block: WodBlock): void {
    const overlay = this.overlays.get(block.id);
    if (!overlay) return;

    // Re-render with updated block
    overlay.root.render(
      <WodBlockOverlay
        block={block}
        onStartWorkout={this.onStartWorkout ? () => this.onStartWorkout?.(block) : undefined}
        onEdit={() => this.focusBlock(block)}
      />
    );

    this.positionOverlay(block);
  }

  private positionOverlay(block: WodBlock): void {
    const overlay = this.overlays.get(block.id);
    if (!overlay) return;

    // Get the editor's layout info
    const layoutInfo = this.editor.getLayoutInfo();
    const editorWidth = layoutInfo.width;
    const overlayWidth = 300;
    
    // Account for scrollbar and minimap width
    const rightEdgeOffset = layoutInfo.verticalScrollbarWidth + layoutInfo.minimap.minimapWidth;
    
    // Position on the right side of the editor, avoiding scrollbar overlap
    const rightPosition = editorWidth - overlayWidth - rightEdgeOffset - 20; // 20px margin

    // Get the top position based on the block's start line
    const startLine = block.startLine || 1;
    const topPosition = this.editor.getTopForLineNumber(startLine);
    const scrollTop = this.editor.getScrollTop();

    // Calculate height based on block content
    const endLine = block.endLine || startLine + 5;
    const bottomPosition = this.editor.getTopForLineNumber(endLine + 1);
    const height = Math.max(100, bottomPosition - topPosition);

    overlay.domNode.style.top = `${topPosition - scrollTop}px`;
    overlay.domNode.style.left = `${rightPosition}px`;
    overlay.domNode.style.height = `${height}px`;
  }

  private updateOverlayPositions(): void {
    for (const block of this.blocks) {
      this.positionOverlay(block);
    }
  }

  private removeOverlay(id: string): void {
    const overlay = this.overlays.get(id);
    if (!overlay) return;

    overlay.root.unmount();
    this.editor.removeOverlayWidget(overlay.widget);
    this.overlays.delete(id);
  }

  private focusBlock(block: WodBlock): void {
    const line = block.startLine || 1;
    this.editor.setPosition({ lineNumber: line, column: 1 });
    this.editor.revealLineInCenter(line);
    this.editor.focus();
  }

  public dispose(): void {
    // Remove all overlays
    for (const id of this.overlays.keys()) {
      this.removeOverlay(id);
    }
    
    // Dispose event handlers
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    
    console.log('[WodBlockOverlayManager] Disposed');
  }
}

// Export CSS styles that should be added to the page
export const wodBlockOverlayStyles = `
.wod-block-overlay-container {
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 12px;
}

.wod-block-overlay {
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
`;
