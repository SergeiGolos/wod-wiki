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
  WorkoutMetricFragment,
  WorkoutResults
} from './types';

// Utilities
export {
  detectWodBlocks,
  findBlockAtLine,
  extractBlockContent
} from './utils/blockDetection';

export { parseWodBlock } from './utils/parseWodBlock';
export type { ParseResult } from './utils/parseWodBlock';

// Hooks
export { useWodBlocks } from './hooks/useWodBlocks';
export type {
  UseWodBlocksOptions,
  UseWodBlocksResult
} from './hooks/useWodBlocks';

export { useBlockParser } from './hooks/useBlockParser';
export type {
  UseBlockParserOptions,
  UseBlockParserResult
} from './hooks/useBlockParser';

// Components
export { WodBlockManager } from './components/WodBlockManager';
export type { WodBlockManagerProps } from './components/WodBlockManager';

// ContextPanel has been removed - use WorkoutContextPanel from '@/components/workout/WorkoutContextPanel' instead

export { FragmentEditor } from './components/FragmentEditor';
export type { FragmentEditorProps } from './components/FragmentEditor';

// Widgets
export { ReactMonacoWidget } from './widgets/ReactMonacoWidget';
export { ContextOverlay } from './widgets/ContextOverlay';

// Hooks
export { useContextOverlay } from './hooks/useContextOverlay';
export { useBlockEditor } from './hooks/useBlockEditor';
export type { UseBlockEditorOptions, UseBlockEditorReturn } from './hooks/useBlockEditor';

// Section Editor (Phase 1 + Phase 2)
export { SectionEditor } from './SectionEditor';
export type { SectionEditorProps } from './SectionEditor';
export type { Section, SectionType, SectionDocument } from './types/section';
export { parseDocumentSections, buildRawContent, calculateTotalLines, matchSectionIds } from './utils/sectionParser';
export { useSectionDocument } from './hooks/useSectionDocument';
export type { UseSectionDocumentOptions, UseSectionDocumentReturn } from './hooks/useSectionDocument';
export { SectionContainer, SECTION_LINE_HEIGHT } from './components/SectionContainer';
export { SectionEditView } from './components/SectionEditView';
export type { SectionEditViewProps } from './components/SectionEditView';
export { WodSectionEditor } from './components/WodSectionEditor';
export type { WodSectionEditorProps } from './components/WodSectionEditor';
export { HeadingDisplay } from './components/section-renderers/HeadingDisplay';
export { ParagraphDisplay } from './components/section-renderers/ParagraphDisplay';
export { WodBlockDisplay } from './components/section-renderers/WodBlockDisplay';
