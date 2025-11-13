/**
 * Markdown Editor - Main exports
 */

// Main component
export { MarkdownEditor } from './MarkdownEditor';
export type { MarkdownEditorProps } from './MarkdownEditor';

// Types
export type {
  WodBlock,
  WodBlockState,
  ParseError,
  WorkoutMetric,
  WorkoutResults
} from './types';

// Utilities
export {
  detectWodBlocks,
  findBlockAtLine,
  extractBlockContent
} from './utils/blockDetection';

// Hooks
export { useWodBlocks } from './hooks/useWodBlocks';
export type {
  UseWodBlocksOptions,
  UseWodBlocksResult
} from './hooks/useWodBlocks';
