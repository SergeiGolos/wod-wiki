import { parseDocumentSections, matchSectionIds } from '@/components/Editor/utils/sectionParser';
import { parseWodBlock } from '@/components/Editor/utils/parseWodBlock';
import { sharedParser } from '@/hooks/useRuntimeParser';
import type { WodBlock, Section } from '@/components/Editor/types';
import type { Section as EditorSection } from '@/components/Editor/types/section';

export interface WorkbenchDocumentState {
  readonly sections: Section[];
  readonly blocks: WodBlock[];
}

export function deriveWorkbenchDocumentState(
  content: string,
  previousSections?: Section[] | null,
): WorkbenchDocumentState {
  if (!content) {
    return { sections: [], blocks: [] };
  }

  const parsedSections = parseDocumentSections(content);
  const sections = previousSections
    ? matchSectionIds(previousSections, parsedSections)
    : parsedSections;

  const blocks = sections
    .filter((section: EditorSection) => section.type === 'wod' && section.wodBlock)
    .map((section: EditorSection) => hydrateWodBlock(section.wodBlock!));

  return { sections, blocks };
}

function hydrateWodBlock(block: WodBlock): WodBlock {
  if (block.statements && block.statements.length > 0) {
    return block;
  }

  try {
    const result = parseWodBlock(block.content, sharedParser);
    return {
      ...block,
      statements: result.statements,
      errors: result.errors,
      state: (result.success ? 'parsed' : 'error') as WodBlock['state'],
    };
  } catch (error) {
    console.error('[WorkbenchDocumentModel] Block parse error:', error);
    return block;
  }
}
