/**
 * Markdown Editor - Re-exports from consolidated Editor directory
 * @deprecated Import directly from '@/components/Editor' instead
 */

// Main component
export { MarkdownEditor } from '../components/Editor/MarkdownEditor';
export type { MarkdownEditorProps } from '../components/Editor/MarkdownEditor';

// Types
export type {
  WodBlock,
  WodBlockState,
  ParseError,
  WorkoutMetricFragment,
  WorkoutResults
} from '../components/Editor/types';

// Utilities
export {
  detectWodBlocks,
  findBlockAtLine,
  extractBlockContent
} from '../components/Editor/utils/blockDetection';

export { parseWodBlock } from '../components/Editor/utils/parseWodBlock';
export type { ParseResult } from '../components/Editor/utils/parseWodBlock';

// Hooks
export { useBlockParser } from '../components/Editor/hooks/useBlockParser';
export type {
  UseBlockParserOptions,
  UseBlockParserResult
} from '../components/Editor/hooks/useBlockParser';

// Components
export { MetricEditor } from '../components/Editor/md-components/MetricEditor';
export type { MetricEditorProps } from '../components/Editor/md-components/MetricEditor';

// Section Editor
export { SectionEditor } from '../components/Editor/SectionEditor';
export type { SectionEditorProps } from './SectionEditor';
export type { Section, SectionType, SectionDocument, FrontMatterSubtype } from './types/section';
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
export { FrontMatterDisplay } from './components/section-renderers/FrontMatterDisplay';
