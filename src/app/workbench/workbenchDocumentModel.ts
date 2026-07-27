import { parseDocumentSections, matchSectionIds } from '@/components/Editor/utils/sectionParser';
import { parseScriptBlock } from '@/components/Editor/utils/parseScriptBlock';
import type { ScriptBlock, Section } from '@/components/Editor/types';
import type { Section as EditorSection } from '@/components/Editor/types/section';
export interface WorkbenchDocumentState {
  readonly sections: Section[];
  readonly blocks: ScriptBlock[];
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
    .filter((section: EditorSection) => section.type === 'wod' && section.scriptBlock)
    .map((section: EditorSection) => hydrateScriptBlock(section.scriptBlock!));

  return { sections, blocks };
}

function hydrateScriptBlock(block: ScriptBlock): ScriptBlock {
  if (block.statements && block.statements.length > 0) {
    return block;
  }

  try {
    const result = parseScriptBlock(block.content);
    return {
      ...block,
      statements: result.statements,
      errors: result.errors,
      state: (result.success ? 'parsed' : 'error') as ScriptBlock['state'],
    };
  } catch (error) {
    console.error('[WorkbenchDocumentModel] Block parse error:', error);
    return block;
  }
}
