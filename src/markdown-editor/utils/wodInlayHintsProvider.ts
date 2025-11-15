/**
 * Monaco Decorations Manager for WOD blocks
 * Shows emoji icons inline with WOD block content using Decorations API
 * Provides instant, synchronous updates when cursor moves
 */

import { editor as monacoEditor, Range } from 'monaco-editor';
import { WodBlock } from '../types';

export interface WodInlayHint {
  hint: string;
  position: 'before' | 'after';
  offset?: number;
}

export interface FragmentHintConfig {
  type: string;
  hints: WodInlayHint[];
}

/**
 * Default hint configuration for fragment types
 */
export const DEFAULT_HINT_CONFIG: FragmentHintConfig[] = [
  { type: 'duration', hints: [{ hint: '⏱️', position: 'before' }] },
  { type: 'resistance', hints: [{ hint: '💪', position: 'before' }] },
  { type: 'rep', hints: [{ hint: '×', position: 'after' }] },
  { type: 'rounds', hints: [{ hint: '🔄', position: 'before' }] },
  { type: 'action', hints: [{ hint: '▶️', position: 'before' }] },
  { type: 'distance', hints: [{ hint: '📏', position: 'before' }] },
];

/**
 * WodDecorationsManager - Manages inline emoji decorations for WOD blocks
 * Uses Monaco's Decorations API for instant, synchronous updates
 */
export class WodDecorationsManager {
  private decorationsCollection: monacoEditor.IEditorDecorationsCollection;
  private decorationOptionsCache: Map<string, monacoEditor.IModelDecorationOptions>;
  private hintConfig: FragmentHintConfig[];

  constructor(
    editor: monacoEditor.IStandaloneCodeEditor,
    hintConfig: FragmentHintConfig[] = DEFAULT_HINT_CONFIG
  ) {
    this.decorationsCollection = editor.createDecorationsCollection();
    this.decorationOptionsCache = new Map();
    this.hintConfig = hintConfig;
    
    // Pre-cache decoration options for performance
    this.cacheDecorationOptions();
  }

  /**
   * Pre-cache decoration options for all emoji types
   */
  private cacheDecorationOptions(): void {
    for (const config of this.hintConfig) {
      for (const hint of config.hints) {
        const key = `${hint.hint}-${hint.position}`;
        if (!this.decorationOptionsCache.has(key)) {
          this.decorationOptionsCache.set(key, {
            [hint.position === 'before' ? 'before' : 'after']: {
              content: hint.hint,
              inlineClassName: 'wod-fragment-icon',
            }
          });
        }
      }
    }
  }

  /**
   * Update decorations based on current blocks and cursor position
   * This is called synchronously on cursor movement for instant updates
   */
  updateDecorations(blocks: WodBlock[], cursorLine: number | null): void {
    const decorations: monacoEditor.IModelDeltaDecoration[] = [];

    // Find which block contains the cursor (if any)
    // Note: cursorLine is 1-indexed, block.startLine/endLine are 0-indexed
    const activeBlock = blocks.find(b => {
      const blockStart = b.startLine + 1; // Convert to 1-indexed
      const blockEnd = b.endLine + 1;     // Convert to 1-indexed
      return cursorLine !== null && cursorLine >= blockStart && cursorLine <= blockEnd;
    });

    // Process each block
    for (const block of blocks) {
      // Skip active block (where cursor is focused) - decorations hidden
      if (activeBlock && block.id === activeBlock.id) {
        continue;
      }

      // Skip blocks without parsed statements
      if (!block.statements || block.statements.length === 0) {
        continue;
      }

      // Process all fragments in all statements
      const fragments = block.statements.flatMap(stmt => stmt.fragments || []);

      for (const fragment of fragments) {
        if (!fragment.meta) {
          continue;
        }

        // Find hint config for this fragment type
        const config = this.hintConfig.find(c => c.type === fragment.type);
        if (!config || !config.hints.length) {
          continue;
        }

        // Add decorations for this fragment
        for (const hintDef of config.hints) {
          // Fragment line is relative to block content (1-indexed within block)
          // Need to adjust to absolute document line number
          // Block content starts at block.startLine + 1 (after opening ```wod)
          // Fragment line 1 = block.startLine + 2 (Monaco is 1-indexed)
          const absoluteLineNumber = block.startLine + 1 + fragment.meta.line;
          const columnStart = fragment.meta.columnStart;
          const length = fragment.meta.length;

          // Calculate position based on hint configuration
          const column = hintDef.position === 'before'
            ? columnStart + (hintDef.offset || 0)
            : columnStart + length + 1 + (hintDef.offset || 0);

          // Get cached decoration options
          const key = `${hintDef.hint}-${hintDef.position}`;
          const options = this.decorationOptionsCache.get(key);
          
          if (options) {
            decorations.push({
              range: new Range(absoluteLineNumber, column, absoluteLineNumber, column),
              options
            });
          }
        }
      }
    }

    // Apply all decorations at once - synchronous update
    this.decorationsCollection.set(decorations);
  }

  /**
   * Dispose of the decorations manager
   */
  dispose(): void {
    this.decorationsCollection.clear();
    this.decorationOptionsCache.clear();
  }
}