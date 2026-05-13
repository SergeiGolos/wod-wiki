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

  it('skips re-hydration when WOD block already has pre-parsed statements', () => {
    // Parse once so blocks have statements populated
    const content = '# Workout\n\n```wod\n5:00 Run\n```';
    const first = deriveWorkbenchDocumentState(content);
    expect(first.blocks[0].statements?.length).toBeGreaterThan(0);

    // Parse again using prior sections — blocks already have statements
    const second = deriveWorkbenchDocumentState(content, first.sections);

    // Statements should still be present (short-circuit return in hydrateWodBlock)
    expect(second.blocks).toHaveLength(1);
    expect(second.blocks[0].statements?.length).toBeGreaterThan(0);
    expect(second.blocks[0].state).toBe('parsed');
  });

  it('handles non-wod sections (headings only) returning no blocks', () => {
    const content = '# My Notes\n\nSome text here';
    const state = deriveWorkbenchDocumentState(content);

    // No wod blocks should be extracted
    expect(state.blocks).toHaveLength(0);
    expect(state.sections.length).toBeGreaterThanOrEqual(1);
  });

  it('handles multiple WOD blocks in one document', () => {
    const content = '# WOD 1\n\n```wod\n5:00 Run\n```\n\n# WOD 2\n\n```wod\n10:00 Walk\n```';
    const state = deriveWorkbenchDocumentState(content);

    // Both wod blocks should be returned
    expect(state.blocks.length).toBeGreaterThanOrEqual(2);
  });

  it('returns sections alongside blocks', () => {
    const content = '# Workout\n\n```wod\n5:00 Run\n```';
    const state = deriveWorkbenchDocumentState(content);

    expect(state.sections.length).toBeGreaterThan(0);
    expect(state.blocks.length).toBeGreaterThan(0);
  });
});
