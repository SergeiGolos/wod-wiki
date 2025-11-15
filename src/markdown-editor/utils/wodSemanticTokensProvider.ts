/**
 * Monaco Semantic Tokens Provider for WOD blocks
 * Provides syntax highlighting within WOD blocks
 */

import { editor as monacoEditor, languages } from 'monaco-editor';
import { WodBlock } from '../types';

export interface SemanticTokenConfig {
  type: string;
  tokenType: string; // Monaco semantic token type
  tokenModifiers?: string[];
}

/**
 * Default semantic token configuration for fragment types
 */
export const DEFAULT_SEMANTIC_CONFIG: SemanticTokenConfig[] = [
  { type: 'duration', tokenType: 'number', tokenModifiers: ['defaultLibrary'] },
  { type: 'resistance', tokenType: 'number', tokenModifiers: ['modification'] },
  { type: 'rep', tokenType: 'number' },
  { type: 'rounds', tokenType: 'keyword' },
  { type: 'action', tokenType: 'keyword' },
  { type: 'distance', tokenType: 'number' },
  { type: 'effort', tokenType: 'variable' },
];

/**
 * Creates a semantic tokens provider for WOD blocks
 */
export function createWodSemanticTokensProvider(
  blocks: WodBlock[],
  tokenConfig: SemanticTokenConfig[] = DEFAULT_SEMANTIC_CONFIG
): languages.DocumentSemanticTokensProvider {
  const legend: languages.SemanticTokensLegend = {
    tokenTypes: ['keyword', 'number', 'variable', 'string', 'comment', 'class', 'function'],
    tokenModifiers: ['defaultLibrary', 'modification']
  };

  return {
    getLegend: () => legend,

    provideDocumentSemanticTokens(
      _model: monacoEditor.ITextModel,
      _lastResultId: string | null,
      _token: any
    ): languages.ProviderResult<languages.SemanticTokens> {
      const data: number[] = [];

      // Track previous position for delta calculation
      let prevLine = 0;
      let prevChar = 0;

      // Collect all fragments from all blocks with block offset information
      const allFragments = blocks.flatMap(block =>
        (block.statements || []).flatMap(stmt => 
          (stmt.fragments || [])
            .filter(f => f.meta)
            .map(f => ({ fragment: f, blockStartLine: block.startLine }))
        )
      );

      // Sort by position
      allFragments.sort((a, b) => {
        const aLine = a.blockStartLine + 1 + a.fragment.meta!.line;
        const bLine = b.blockStartLine + 1 + b.fragment.meta!.line;
        if (aLine !== bLine) {
          return aLine - bLine;
        }
        return a.fragment.meta!.columnStart - b.fragment.meta!.columnStart;
      });

      // Generate semantic tokens
      for (const { fragment, blockStartLine } of allFragments) {
        if (!fragment.meta) continue;

        const config = tokenConfig.find(c => c.type === fragment.type);
        if (!config) continue;

        // Adjust line number: fragment line is relative to block content
        // Block content starts at blockStartLine + 1 (after ```wod)
        // Fragment line 1 = blockStartLine + 2
        const absoluteLine = blockStartLine + 1 + fragment.meta.line;
        const line = absoluteLine - 1; // Monaco is 0-indexed for semantic tokens
        const char = fragment.meta.columnStart - 1;
        const length = fragment.meta.length;

        // Calculate deltas
        const deltaLine = line - prevLine;
        const deltaChar = (line === prevLine) ? (char - prevChar) : char;

        const tokenTypeIndex = legend.tokenTypes.indexOf(config.tokenType);
        const tokenModifierBits = (config.tokenModifiers || []).reduce((bits, modifier) => {
          const modIndex = legend.tokenModifiers.indexOf(modifier);
          return modIndex >= 0 ? bits | (1 << modIndex) : bits;
        }, 0);

        // Push 5 values per token: deltaLine, deltaChar, length, tokenType, tokenModifiers
        data.push(deltaLine, deltaChar, length, tokenTypeIndex, tokenModifierBits);

        prevLine = line;
        prevChar = char;
      }

      return {
        data: new Uint32Array(data),
        resultId: undefined
      };
    },

    releaseDocumentSemanticTokens: () => {}
  };
}
