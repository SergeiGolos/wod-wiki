/**
 * Monaco Inlay Hints Provider for WOD blocks
 * Shows emoji icons inline with WOD block content
 */

import { editor as monacoEditor, languages, IRange } from 'monaco-editor';
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
 * Creates an inlay hints provider for WOD blocks
 */
export function createWodInlayHintsProvider(
  blocks: WodBlock[],
  _activeBlockId: string | null,
  cursorLine: number | null,
  hintConfig: FragmentHintConfig[] = DEFAULT_HINT_CONFIG
): languages.InlayHintsProvider {
  return {
    provideInlayHints(
      _model: monacoEditor.ITextModel,
      _range: IRange,
      _token: any
    ): languages.ProviderResult<languages.InlayHintList> {
      const hints: languages.InlayHint[] = [];

      // Find which block contains the cursor (if any)
      // Note: cursorLine is 1-indexed, block.startLine/endLine are 0-indexed
      const activeBlock = blocks.find(b => {
        const blockStart = b.startLine + 1; // Convert to 1-indexed
        const blockEnd = b.endLine + 1;     // Convert to 1-indexed
        return cursorLine !== null && cursorLine >= blockStart && cursorLine <= blockEnd;
      });

      // Process each block
      for (const block of blocks) {
        // Skip active block (where cursor is focused)
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
          const config = hintConfig.find(c => c.type === fragment.type);
          if (!config || !config.hints.length) {
            continue;
          }

          // Add hints for this fragment
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

            hints.push({
              kind: languages.InlayHintKind.Parameter,
              position: {
                lineNumber: absoluteLineNumber,
                column
              },
              label: hintDef.hint,
              paddingLeft: hintDef.position === 'after',
              paddingRight: hintDef.position === 'before',
            });
          }
        }
      }

      return {
        hints,
        dispose: () => {}
      };
    }
  };
}