import { describe, expect, it } from 'bun:test';
import { parseDocumentSections } from '@/components/Editor/utils/sectionParser';
import { deriveWorkbenchDocumentState } from './workbenchDocumentModel';

describe('deriveWorkbenchDocumentState', () => {
  it('returns empty sections and blocks for empty content', () => {
    expect(deriveWorkbenchDocumentState('')).toEqual({ sections: [], blocks: [] });
  });

  it('hydrates WOD blocks with parsed statements', () => {
    const content = '# Workout\n\n```wod\n5:00 Run\n```';
    const state = deriveWorkbenchDocumentState(content);

    expect(state.blocks).toHaveLength(1);
    expect(state.blocks[0].statements?.length).toBeGreaterThan(0);
    expect(state.blocks[0].state).toBe('parsed');
  });

  it('preserves stable section ids when prior sections are supplied', () => {
    const previous = parseDocumentSections('# Old Title\n\n```wod\n5:00 Run\n```');
    const next = deriveWorkbenchDocumentState('# New Title\n\n```wod\n5:00 Run\n```', previous);

    expect(next.sections[0].id).toBe(previous[0].id);
    expect(next.sections[1].id).toBe(previous[1].id);
  });
});
