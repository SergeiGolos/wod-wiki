/**
 * WodBlockSplitViewFeature - Inline split view for WOD blocks in Monaco
 * 
 * This feature creates a split-view effect within the Monaco editor where
 * WOD blocks show a side-by-side view:
 * - Left: Monaco editor for editing WOD code (when editing) or static code display (when not editing)
 * - Right: Parsed workout preview with Run button
 * 
 * When cursor enters the WOD block area:
 * - Split view shows editable Monaco editor on left, live preview on right
 * - User can edit code and see preview update in real-time
 * 
 * When cursor is outside:
 * - Split view shows static code on left, preview on right
 * - Click anywhere to start editing
 * 
 * Uses Monaco view zones to create inline overlays that replace hidden WOD block content.
 */

import React, { useRef, useEffect, useState } from 'react';
import { editor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import ReactDOM from 'react-dom/client';
import { WodBlock } from '../../markdown-editor/types';
import { StatementDisplay } from '../../components/fragments/StatementDisplay';
import { Button } from '../../components/ui/button';
import { Play, Timer, X, Edit3, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HiddenAreasCoordinator } from '../utils/HiddenAreasCoordinator';
import { CARD_SYSTEM_CONFIG } from '../inline-cards/config';

interface WodSplitViewProps {
  block: WodBlock;
  isEditing?: boolean;
  onStartWorkout?: () => void;
  onEdit?: () => void;
  onClose?: () => void;
  onCodeChange?: (newCode: string) => void;
  monaco?: Monaco | null;
}

/**
 * WodSplitView - Side-by-side Code | Preview component
 * When isEditing is true, shows an embedded Monaco editor on the left side
 */
const WodSplitView: React.FC<WodSplitViewProps> = ({
  block,
  isEditing = false,
  onStartWorkout,
  onEdit,
  onClose,
  onCodeChange,
  monaco
}) => {
  const hasStatements = block.statements && block.statements.length > 0;
  const rawCode = block.content || '';
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const miniEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [localCode, setLocalCode] = useState(rawCode);

  // Update local code when block content changes externally
  useEffect(() => {
    setLocalCode(block.content || '');
    if (miniEditorRef.current && miniEditorRef.current.getValue() !== (block.content || '')) {
      miniEditorRef.current.setValue(block.content || '');
    }
  }, [block.content]);

  // Create/destroy mini Monaco editor when editing state changes
  useEffect(() => {
    if (isEditing && editorContainerRef.current && monaco) {
      // Create a mini Monaco editor for inline editing
      const miniEditor = monaco.editor.create(editorContainerRef.current, {
        value: localCode,
        language: 'wod', // Use wod language if registered, falls back to plaintext
        minimap: { enabled: false },
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        fontSize: 12,
        fontFamily: 'var(--font-mono, monospace)',
        padding: { top: 8, bottom: 8 },
        renderLineHighlight: 'none',
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'hidden',
          verticalScrollbarSize: 8
        },
        theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs'
      });

      miniEditorRef.current = miniEditor;

      // Listen for changes and propagate them
      const changeDisposable = miniEditor.onDidChangeModelContent(() => {
        const newValue = miniEditor.getValue();
        setLocalCode(newValue);
        if (onCodeChange) {
          onCodeChange(newValue);
        }
      });

      // Focus the mini editor when it's created
      setTimeout(() => {
        miniEditor.focus();
      }, 50);

      return () => {
        changeDisposable.dispose();
        miniEditor.dispose();
        miniEditorRef.current = null;
      };
    }
  }, [isEditing, monaco, localCode, onCodeChange]);

  return (
    <div className="wod-split-view h-full flex bg-card border border-border rounded-lg overflow-hidden shadow-md">
      {/* Left side: Code Editor or Static Display */}
      <div className="w-1/2 h-full border-r border-border flex flex-col overflow-hidden bg-muted/10">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Edit3 className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {isEditing ? 'Editing' : 'Code'}
            </span>
          </div>
          {!isEditing && onEdit && (
            <button
              onClick={onEdit}
              className="px-2 py-0.5 rounded hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground"
            >
              Edit
            </button>
          )}
        </div>
        {isEditing && monaco ? (
          <div 
            ref={editorContainerRef} 
            className="flex-1 min-h-0"
            style={{ height: '100%' }}
          />
        ) : (
          <pre 
            className="flex-1 p-3 text-xs font-mono whitespace-pre-wrap text-foreground/80 overflow-auto cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={onEdit}
            title="Click to edit"
          >
            {rawCode}
          </pre>
        )}
      </div>
      
      {/* Right side: Preview */}
      <div className="w-1/2 h-full flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Preview</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              block.state === 'parsed'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            )}>
              {block.state}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onClose && (
              <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 transition-colors">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {hasStatements ? (
            block.statements?.map((statement, index) => (
              <StatementDisplay key={index} statement={statement} compact={false} />
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic text-center py-4">
              {block.state === 'error' ? <span className="text-destructive">Parse error</span> : 'No statements'}
            </div>
          )}
        </div>
        
        {onStartWorkout && block.state === 'parsed' && hasStatements && (
          <div className="p-3 border-t border-border flex-shrink-0">
            <Button onClick={onStartWorkout} className="w-full gap-2" size="default" data-no-edit>
              <Play className="h-4 w-4" />
              Run Workout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * WodBlockSplitViewManager - Manages the inline view overlays for WOD blocks
 * 
 * When cursor is outside a WOD block: shows split view with static code on left, preview on right
 * When cursor is inside a WOD block: shows split view with embedded Monaco editor on left, live preview on right
 */
export class WodBlockSplitViewManager {
  private editor: editor.IStandaloneCodeEditor;
  private monaco: Monaco;
  private hiddenAreasCoordinator?: HiddenAreasCoordinator;
  private viewZones: Map<string, {
    zoneId: string;
    root: ReactDOM.Root;
    domNode: HTMLDivElement;
    marginDomNode: HTMLDivElement;
    isEditing: boolean;
  }> = new Map();
  private blocks: WodBlock[] = [];
  private disposables: { dispose(): void }[] = [];
  private onStartWorkout?: (block: WodBlock) => void;
  private enabled: boolean = true;
  private activeBlockId: string | null = null;
  private isDesktop: boolean = true;

  constructor(
    editorInstance: editor.IStandaloneCodeEditor,
    monaco: Monaco,
    onStartWorkout?: (block: WodBlock) => void,
    hiddenAreasCoordinator?: HiddenAreasCoordinator
  ) {
    this.editor = editorInstance;
    this.monaco = monaco;
    this.onStartWorkout = onStartWorkout;
    this.hiddenAreasCoordinator = hiddenAreasCoordinator;

    // Detect desktop mode
    this.isDesktop = window.innerWidth >= 1024;
    const resizeHandler = () => {
      const wasDesktop = this.isDesktop;
      this.isDesktop = window.innerWidth >= 1024;
      if (wasDesktop !== this.isDesktop) {
        this.updateViewZones();
      }
    };
    window.addEventListener('resize', resizeHandler);
    this.disposables.push({ dispose: () => window.removeEventListener('resize', resizeHandler) });

    // Listen for content changes
    const contentListener = this.editor.onDidChangeModelContent(() => {
      // Debounce the update
      setTimeout(() => {
        console.log('[WodBlockSplitViewManager] Content changed, refreshing view zones');
        this.updateViewZones();
      }, 100);
    });
    this.disposables.push(contentListener);

    // Listen for layout changes - just log for debugging
    const layoutListener = this.editor.onDidLayoutChange(() => {
      if (CARD_SYSTEM_CONFIG.debug) {
        console.log('[WodBlockSplitViewManager] Layout changed, view zones:', this.viewZones.size);
      }
    });
    this.disposables.push(layoutListener);

    // Listen for cursor position changes to detect editing
    const cursorListener = this.editor.onDidChangeCursorPosition((e) => {
      const cursorLine = e.position.lineNumber;
      // WodBlock uses 0-indexed lines, Monaco uses 1-indexed
      const blockAtCursor = this.blocks.find(b => 
        (b.startLine !== undefined && b.endLine !== undefined) && 
        cursorLine >= (b.startLine + 1) && cursorLine <= (b.endLine + 1)
      );
      
      const newActiveBlockId = blockAtCursor?.id || null;
      if (newActiveBlockId !== this.activeBlockId) {
        this.activeBlockId = newActiveBlockId;
        // Re-render all blocks to update editing state
        this.updateViewZones();
      }
      
      // Detect if view zones have been lost (cursor jumping over hidden area)
      // Check if cursor jumped over a block that should have a view zone
      const parsedBlocks = this.blocks.filter(b => b.state === 'parsed' && b.id !== this.activeBlockId);
      if (CARD_SYSTEM_CONFIG.debug) {
        console.log('[WodBlockSplitViewManager] Cursor at line', cursorLine, '- parsed blocks:', parsedBlocks.length, 'view zones:', this.viewZones.size);
      }
      
      // Only check zone visibility if we have blocks but no view zones tracked
      // This avoids constant recreation loops when zones are being created
      if (parsedBlocks.length > 0 && this.viewZones.size === 0) {
        if (CARD_SYSTEM_CONFIG.debug) {
          console.log('[WodBlockSplitViewManager] Parsed blocks exist but no view zones tracked - recreating');
        }
        this.updateViewZones();
      }
    });
    this.disposables.push(cursorListener);

    console.log('[WodBlockSplitViewManager] Initialized');
  }

  /**
   * Enable or disable the split view
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearAllViewZones();
      this.clearHiddenAreas();
    } else {
      this.updateViewZones();
    }
  }

  /**
   * Update the WOD blocks to display
   */
  public updateBlocks(blocks: WodBlock[]): void {
    console.log('[WodBlockSplitViewManager] updateBlocks called with', blocks.length, 'blocks');
    this.blocks = blocks;
    
    // Re-evaluate active block based on current cursor position
    // This handles cases where block IDs changed but cursor is still in the "same" block
    this.updateActiveBlockFromCursor();

    if (this.enabled) {
      this.updateViewZones();
    }
  }

  private updateActiveBlockFromCursor(): void {
    const position = this.editor.getPosition();
    if (!position) {
      // Don't clear activeBlockId if we just lost focus, 
      // but if cursor is truly gone (e.g. editor disposed), maybe?
      // Actually, getPosition() returns null if editor is not ready.
      return;
    }
    
    const cursorLine = position.lineNumber;
    // Find block containing cursor
    const blockAtCursor = this.blocks.find(b => 
      (b.startLine !== undefined && b.endLine !== undefined) && 
      cursorLine >= (b.startLine + 1) && cursorLine <= (b.endLine + 1)
    );
    
    const newActiveBlockId = blockAtCursor?.id || null;
    
    // Only update if changed (to avoid log spam, though logic is cheap)
    if (newActiveBlockId !== this.activeBlockId) {
      console.log('[WodBlockSplitViewManager] Active block updated from cursor:', newActiveBlockId);
      this.activeBlockId = newActiveBlockId;
    }
  }

  /**
   * Clear hidden areas
   */
  private clearHiddenAreas(): void {
    if (this.hiddenAreasCoordinator) {
      this.hiddenAreasCoordinator.clearHiddenAreas('wod-blocks');
    } else {
      (this.editor as any).setHiddenAreas([]);
    }
  }

  /**
   * Update which areas of the editor are hidden
   * Hide all parsed WOD blocks EXCEPT the active one (being edited)
   * Note: WodBlock uses 0-indexed lines, Monaco uses 1-indexed
   * 
   * IMPORTANT: We hide starting from the SECOND line of the block (after ```wod)
   * because Monaco collapses view zones that are adjacent to hidden areas.
   * By keeping the first line visible (but empty/minimal), the view zone has
   * a place to render.
   */
  private updateHiddenAreas(): void {
    const hiddenRanges: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }[] = [];
    
    for (const block of this.blocks) {
      // Convert from 0-indexed (WodBlock) to 1-indexed (Monaco)
      const startLine = block.startLine + 1;
      const endLine = block.endLine + 1;
      console.log('[WodBlockSplitViewManager] Processing block:', block.id, 'state:', block.state, 'lines (1-indexed):', startLine, '-', endLine, 'activeBlockId:', this.activeBlockId);
      if (!block.startLine && block.startLine !== 0) continue;
      if (!block.endLine && block.endLine !== 0) continue;
      if (block.state !== 'parsed') continue;
      
      // Don't hide the block that's currently being edited
      // This allows the cursor to enter the block for editing
      if (block.id === this.activeBlockId) {
        console.log('[WodBlockSplitViewManager] Skipping hide for active block:', block.id);
        continue;
      }
      
      // Hide WOD block content starting from line AFTER the opening fence
      // This leaves the ```wod line visible so the view zone has somewhere to attach
      // The view zone will visually cover this line
      const hideStartLine = startLine + 1; // Line after ```wod
      if (hideStartLine <= endLine) {
        hiddenRanges.push({
          startLineNumber: hideStartLine,
          startColumn: 1,
          endLineNumber: endLine,
          endColumn: 1
        });
      }
    }
    
    console.log('[WodBlockSplitViewManager] Hiding', hiddenRanges.length, 'ranges:', hiddenRanges);
    
    if (this.hiddenAreasCoordinator) {
      const ranges = hiddenRanges.map(r => new this.monaco.Range(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn));
      this.hiddenAreasCoordinator.updateHiddenAreas('wod-blocks', ranges);
    } else {
      // Apply hidden areas directly if no coordinator
      (this.editor as any).setHiddenAreas(hiddenRanges);
    }
  }

  private updateViewZones(): void {
    if (!this.enabled) {
      console.log('[WodBlockSplitViewManager] updateViewZones skipped - not enabled');
      return;
    }
    console.log('[WodBlockSplitViewManager] updateViewZones called with', this.blocks.length, 'blocks');
    console.log('[WodBlockSplitViewManager] Current view zones:', Array.from(this.viewZones.keys()));

    // Always update hidden areas to hide WOD blocks (they're replaced by split views)
    this.updateHiddenAreas();

    const currentBlockIds = new Set(this.blocks.map(b => b.id));

    // Remove view zones for blocks that no longer exist
    for (const [id] of this.viewZones) {
      if (!currentBlockIds.has(id)) {
        console.log('[WodBlockSplitViewManager] Removing stale view zone:', id);
        this.removeViewZone(id);
      }
    }

    // Create or update view zones for each parsed block
    for (const block of this.blocks) {
      console.log('[WodBlockSplitViewManager] Checking block', block.id, 'state:', block.state, 'activeBlockId:', this.activeBlockId, 'hasExistingZone:', this.viewZones.has(block.id));
      if (block.state !== 'parsed') {
        console.log('[WodBlockSplitViewManager] Block not parsed, skipping. Removing zone if exists.');
        // Remove zone if block is not parsed
        if (this.viewZones.has(block.id)) {
          this.removeViewZone(block.id);
        }
        continue;
      }

      // Determine if this block is being edited
      const isEditing = this.activeBlockId === block.id;
      const existingZone = this.viewZones.get(block.id);

      // When editing, remove the view zone and let the user edit the raw code
      // The block is un-hidden (via updateHiddenAreas) so the code is visible
      if (isEditing) {
        console.log('[WodBlockSplitViewManager] Block is being edited, removing view zone if exists');
        if (existingZone) {
          this.removeViewZone(block.id);
        }
        continue;
      }

      // Show inline visualization for non-editing blocks
      if (existingZone) {
        console.log('[WodBlockSplitViewManager] Updating existing view zone content');
        // Just update the content
        this.updateViewZoneContent(block, false);
      } else {
        console.log('[WodBlockSplitViewManager] Creating new view zone for block:', block.id);
        // Create new zone
        this.createViewZone(block, false);
      }
    }
    
    console.log('[WodBlockSplitViewManager] updateViewZones completed. Final view zones:', Array.from(this.viewZones.keys()));
  }

  private createViewZone(block: WodBlock, isEditing: boolean = false): void {
    if (block.startLine === undefined || block.endLine === undefined) return;

    // Convert from 0-indexed (WodBlock) to 1-indexed (Monaco)
    const startLine = block.startLine + 1;
    const endLine = block.endLine + 1;
    
    // Calculate number of lines the WOD block spans
    const lineCount = endLine - startLine + 1;
    // Make the zone taller to accommodate the visualization
    const statementsCount = block.statements?.length || 0;
    const estimatedHeight = Math.max(lineCount, statementsCount * 2 + 3, 5);
    const heightInLines = estimatedHeight;

    console.log('[WodBlockSplitViewManager] Creating view zone at line', startLine - 1, 'with height', heightInLines, 'isEditing:', isEditing);

    // Create the DOM node for the view zone
    const domNode = document.createElement('div');
    domNode.className = 'wod-inline-view-zone';
    domNode.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: 200px;
      pointer-events: auto;
      box-sizing: border-box;
      padding: 4px 8px;
      cursor: pointer;
      background: var(--vscode-editor-background, #fff);
    `;
    
    console.log('[WodBlockSplitViewManager] Created DOM node:', domNode);

    // Add click handler to enter edit mode when clicking anywhere on the view zone
    domNode.addEventListener('click', (e) => {
      // Don't trigger if clicking on buttons or interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-no-edit]')) {
        return;
      }
      console.log('[WodBlockSplitViewManager] View zone clicked, focusing block:', block.id);
      this.focusBlock(block);
    });

    // Create margin decoration
    const marginDomNode = document.createElement('div');
    marginDomNode.className = 'wod-inline-view-margin';
    marginDomNode.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--vscode-symbolIcon-classForeground, #3b82f6);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
    `;

    const root = ReactDOM.createRoot(domNode);

    const zoneConfig = {
      // Place view zone after the line before the WOD block
      afterLineNumber: startLine - 1,
      heightInLines: Math.max(heightInLines, 1), // Ensure at least 1 line
      domNode,
      marginDomNode,
      suppressMouseDown: false,
    };
    
    console.log('[WodBlockSplitViewManager] Zone config:', JSON.stringify({
      afterLineNumber: zoneConfig.afterLineNumber,
      heightInLines: zoneConfig.heightInLines
    }));

    this.editor.changeViewZones((accessor) => {
      const zoneId = accessor.addZone(zoneConfig);
      
      console.log('[WodBlockSplitViewManager] Zone created with ID:', zoneId);

      this.viewZones.set(block.id, {
        zoneId,
        root,
        domNode,
        marginDomNode,
        isEditing
      });
    });

    // Handler for code changes from the embedded editor
    const handleCodeChange = (newCode: string) => {
      this.updateBlockContent(block, newCode);
    };

    // Render the React component
    root.render(
      <WodSplitView
        block={block}
        isEditing={isEditing}
        onStartWorkout={this.onStartWorkout ? () => this.onStartWorkout?.(block) : undefined}
        onEdit={() => this.focusBlock(block)}
        onCodeChange={handleCodeChange}
        monaco={this.monaco}
      />
    );
    
    // Log after render - check DOM dimensions after a short delay
    setTimeout(() => {
      const rect = domNode.getBoundingClientRect();
      console.log('[WodBlockSplitViewManager] After React render - domNode rect:', rect.width, 'x', rect.height, 'parent:', domNode.parentElement?.className);
    }, 100);
  }

  /**
   * Update the block content in the main editor
   */
  private updateBlockContent(block: WodBlock, newCode: string): void {
    if (block.startLine === undefined || block.endLine === undefined) return;
    
    const model = this.editor.getModel();
    if (!model) return;

    // Convert from 0-indexed (WodBlock) to 1-indexed (Monaco)
    // The block includes ```wod and ``` fences, but we only want to update content between them
    const contentStartLine = block.startLine + 2; // Line after ```wod
    const contentEndLine = block.endLine; // Line before ```
    
    // Get the range for the content (excluding fences)
    const range = {
      startLineNumber: contentStartLine,
      startColumn: 1,
      endLineNumber: contentEndLine,
      endColumn: model.getLineMaxColumn(contentEndLine)
    };

    // Use pushEditOperations to make it undoable
    model.pushEditOperations(
      [],
      [{ range, text: newCode }],
      () => null
    );
  }

  private focusBlock(block: WodBlock): void {
    if (block.startLine !== undefined) {
      console.log('[WodBlockSplitViewManager] focusBlock called for:', block.id);
      // Trigger edit mode for this block
      this.activeBlockId = block.id;
      this.updateViewZones();
      
      // Move cursor to the first content line of the block (after ```wod)
      // and focus the editor
      const contentLine = block.startLine + 2; // Line after ```wod (0-indexed + 1 for Monaco + 1 for content)
      setTimeout(() => {
        this.editor.setPosition({ lineNumber: contentLine, column: 1 });
        this.editor.focus();
        this.editor.revealLineInCenter(contentLine);
        console.log('[WodBlockSplitViewManager] Cursor moved to line:', contentLine);
      }, 50);
    }
  }

  private updateViewZoneContent(block: WodBlock, isEditing: boolean = false): void {
    const zone = this.viewZones.get(block.id);
    if (!zone) return;

    // Handler for code changes from the embedded editor
    const handleCodeChange = (newCode: string) => {
      this.updateBlockContent(block, newCode);
    };

    // Re-render with updated block
    zone.root.render(
      <WodSplitView
        block={block}
        isEditing={isEditing}
        onStartWorkout={this.onStartWorkout ? () => this.onStartWorkout?.(block) : undefined}
        onEdit={() => this.focusBlock(block)}
        onCodeChange={handleCodeChange}
        monaco={this.monaco}
      />
    );
  }

  private removeViewZone(id: string): void {
    const zone = this.viewZones.get(id);
    if (!zone) return;

    console.log('[WodBlockSplitViewManager] removeViewZone called for:', id, 'stack:', new Error().stack);

    zone.root.unmount();
    
    this.editor.changeViewZones((accessor) => {
      accessor.removeZone(zone.zoneId);
    });

    this.viewZones.delete(id);
  }

  private clearAllViewZones(): void {
    for (const [id] of this.viewZones) {
      this.removeViewZone(id);
    }
    // Clear hidden areas when disabled
    this.clearHiddenAreas();
  }

  public dispose(): void {
    this.clearAllViewZones();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    // Clear hidden areas on dispose
    this.clearHiddenAreas();
    console.log('[WodBlockSplitViewManager] Disposed');
  }
}

// Export CSS styles
export const wodSplitViewStyles = `
.wod-inline-view-zone {
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 12px;
}

.wod-inline-view {
  transition: opacity 0.2s ease;
}

.wod-inline-view:hover {
  border-color: var(--primary);
}
`;
