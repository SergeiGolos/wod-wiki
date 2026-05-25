import { afterEach, describe, expect, it, vi } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { EditorView } from '@codemirror/view';

import type { EditorSection } from '../extensions/section-state';
import { FrontmatterCompanion } from './FrontmatterCompanion';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createView(innerContent: string): EditorView {
  return {
    state: {
      doc: {
        sliceString: vi.fn(() => innerContent),
      },
    },
    dispatch: vi.fn(),
  } as unknown as EditorView;
}

function createEffortSection(): EditorSection {
  return {
    id: 'frontmatter-effort-1',
    type: 'frontmatter',
    from: 0,
    to: 0,
    startLine: 1,
    endLine: 13,
    contentFrom: 0,
    contentTo: 0,
  } as EditorSection;
}

describe('FrontmatterCompanion', () => {
  it('renders effort fields for effort frontmatter and writes edits back through dispatch', () => {
    const view = createView([
      'id: effort-1',
      'slug: rowing-intervals',
      'label: Rowing Intervals',
      'aliases:',
      '  - row',
      '  - erg',
      'baseAttributes:',
      '  met: 7.0',
      '  discipline: rowing',
      '  intensityTier: high',
      'registrySource: bundled',
    ].join('\n'));

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-effort-1"
        section={createEffortSection()}
        view={view}
        isActive
        widthPercent={35}
        docVersion={1}
      />,
    );

    expect(screen.getByText('Effort')).toBeTruthy();
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('rowing-intervals');
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe('Rowing Intervals');
    expect((screen.getByLabelText('MET') as HTMLInputElement).value).toBe('7.0');

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'rowing-intervals-2' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('slug: "rowing-intervals-2"');
    expect(dispatchArg.changes.insert).toContain('baseAttributes:');
    expect(dispatchArg.changes.insert).toContain('  met: 7.0');
  });
});
