import { afterEach, describe, expect, it, vi } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { EditorView } from '@codemirror/view';

import type { EditorSection } from '@bitcobblers/wod-wiki-ui/extensions';
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
      facet: vi.fn(() => false),
    },
    dispatch: vi.fn(),
  } as unknown as EditorView;
}

function createEffortSection(props: Partial<EditorSection> = {}): EditorSection {
  return {
    id: 'frontmatter-effort-1',
    type: 'frontmatter',
    from: 0,
    to: 0,
    startLine: 1,
    endLine: 13,
    contentFrom: 0,
    contentTo: 0,
    ...props,
  } as EditorSection;
}

// ── Shared effort frontmatter content fixtures ────────────────────────────

const NESTED_EFFORT_CONTENT = [
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
].join('\n');

const MINIMAL_EFFORT_CONTENT = [
  'slug: minimal-effort',
  'label: Minimal',
  'registrySource: custom',
].join('\n');

const EMPTY_EFFORT_CONTENT = [
  'registrySource: custom',
].join('\n');

const DERIVATION_EFFORT_CONTENT = [
  'id: effort-derived',
  'slug: derived-rowing',
  'label: Derived Rowing',
  'aliases:',
  '  - derived',
  'baseAttributes:',
  '  met: 8.0',
  '  discipline: rowing',
  'derivation:',
  '  parentSlug: parent-rowing',
  '  coefficients:',
  '    met: 1.14',
  '  hardOverrides:',
].join('\n');

// ── Desktop active mode tests ─────────────────────────────────────────────

describe('FrontmatterCompanion — desktop active mode', () => {
  it('renders effort fields for effort frontmatter and writes edits back through dispatch', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    expect(screen.getByText('Effort', { selector: 'span' })).toBeTruthy();
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('rowing-intervals');
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe('Rowing Intervals');
    expect((screen.getByLabelText('MET') as HTMLInputElement).value).toBe('7.0');
    expect((screen.getByLabelText('Discipline') as HTMLInputElement).value).toBe('rowing');
    expect((screen.getByLabelText('Aliases') as HTMLInputElement).value).toBe('row, erg');

    const intensitySelect = screen.getByLabelText('Intensity tier') as HTMLSelectElement;
    expect(intensitySelect.value).toBe('high');

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'rowing-intervals-2' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('slug: "rowing-intervals-2"');
    expect(dispatchArg.changes.insert).toContain('baseAttributes:');
    expect(dispatchArg.changes.insert).toContain('  met: 7.0');
  });

  it('updates label field and commits to dispatch', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Updated Label' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('label: Updated Label');
  });

  it('updates MET field with numeric value', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('MET'), { target: { value: '8.5' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('met: 8.5');
  });

  it('rejects invalid MET input (non-numeric)', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('MET'), { target: { value: 'not-a-number' } });

    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it('skips MET dispatch when value is empty string', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('MET'), { target: { value: '' } });

    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it('updates intensity tier via select', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Intensity tier'), { target: { value: 'moderate' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('intensityTier: moderate');
  });

  it('clears intensity tier when selecting "Unset"', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Intensity tier'), { target: { value: '' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).not.toContain('intensityTier');
  });

  it('updates discipline field', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Discipline'), { target: { value: 'running' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('discipline: running');
  });

  it('updates aliases from comma-separated input', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Aliases'), { target: { value: 'row, erg, indoor-row' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('  - row');
    expect(dispatchArg.changes.insert).toContain('  - erg');
    expect(dispatchArg.changes.insert).toContain('  - "indoor-row"');
  });

  it('renders empty aliases as aliases: []', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Aliases'), { target: { value: '' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    expect(dispatchArg.changes.insert).toContain('aliases: []');
  });
});

// ── Compact mode tests (simulates mobile / inactive) ──────────────────────

describe('FrontmatterCompanion — compact mode', () => {
  it('renders compact summary when frontmatter is inactive (desktop sidebar collapsed)', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-effort-1"
        section={createEffortSection()}
        view={view}
        isActive={false}
        widthPercent={100}
        docVersion={1}
      />,
    );

    // Should show the Effort badge and summary
    expect(screen.getByText('Effort', { selector: 'span' })).toBeTruthy();
    expect(screen.getAllByText('Rowing Intervals').length).toBeGreaterThanOrEqual(1);

    // Should NOT show form fields in compact mode
    expect(screen.queryByLabelText('Slug')).toBeNull();
    expect(screen.queryByLabelText('Label')).toBeNull();
    expect(screen.queryByLabelText('MET')).toBeNull();

    // Should show the focus hint
    expect(screen.getByText(/Focus the block to edit/)).toBeTruthy();
  });

  it('renders compact summary when widthPercent is below 24 (narrow sidebar)', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-effort-1"
        section={createEffortSection()}
        view={view}
        isActive
        widthPercent={20}
        docVersion={1}
      />,
    );

    expect(screen.getByText('Effort', { selector: 'span' })).toBeTruthy();
    expect(screen.getAllByText('Rowing Intervals').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByLabelText('Slug')).toBeNull();
    expect(screen.queryByLabelText('MET')).toBeNull();
  });

  it('shows "Untitled effort" fallback when label and slug are missing', () => {
    const view = createView(EMPTY_EFFORT_CONTENT);

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-effort-1"
        section={createEffortSection()}
        view={view}
        isActive={false}
        widthPercent={100}
        docVersion={1}
      />,
    );

    expect(screen.getAllByText('Untitled effort').length).toBeGreaterThanOrEqual(1);
  });

  it('shows summary text with MET badge in compact mode', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-effort-1"
        section={createEffortSection()}
        view={view}
        isActive={false}
        widthPercent={100}
        docVersion={1}
      />,
    );

    // The header should show MET badge — query by the font-mono class used for metric badges
    const monoSpans = document.querySelectorAll('.font-mono');
    const hasMetBadge = Array.from(monoSpans).some((el) =>
      el.textContent?.includes('7.0') && el.textContent?.includes('MET'),
    );
    expect(hasMetBadge).toBe(true);
    expect(screen.getByText('rowing')).toBeTruthy();
    expect(screen.getByText('high')).toBeTruthy();
  });
});

// ── Empty / minimal frontmatter tests ─────────────────────────────────────

describe('FrontmatterCompanion — minimal effort frontmatter', () => {
  it('renders with empty fields for minimal effort data', () => {
    const view = createView(MINIMAL_EFFORT_CONTENT);

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

    expect(screen.getByText('Effort', { selector: 'span' })).toBeTruthy();
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('minimal-effort');
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe('Minimal');
    expect((screen.getByLabelText('MET') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Discipline') as HTMLInputElement).value).toBe('');

    const intensitySelect = screen.getByLabelText('Intensity tier') as HTMLSelectElement;
    expect(intensitySelect.value).toBe('');

    expect((screen.getByLabelText('Aliases') as HTMLInputElement).value).toBe('');
  });

  it('shows summary in compact mode for minimal data', () => {
    const view = createView(MINIMAL_EFFORT_CONTENT);

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-effort-1"
        section={createEffortSection()}
        view={view}
        isActive={false}
        widthPercent={100}
        docVersion={1}
      />,
    );

    // Minimal effort has slug and label, so it shows a summary
    expect(screen.getAllByText('Minimal').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Derivation section tests ──────────────────────────────────────────────

describe('FrontmatterCompanion — derivation section', () => {
  it('renders derivation metadata in read-only record grid', () => {
    const view = createView(DERIVATION_EFFORT_CONTENT);

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

    expect(screen.getByText('Effort', { selector: 'span' })).toBeTruthy();
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('derived-rowing');

    // Record grid should show read-only fields
    expect(screen.getByText('Record')).toBeTruthy();
    expect(screen.getByText('effort-derived')).toBeTruthy();

    // Coefficients should not be directly editable as form fields
    expect(screen.queryByLabelText('Parent Slug')).toBeNull();
  });
});

// ── Mobile viewport simulation tests ──────────────────────────────────────

describe('FrontmatterCompanion — mobile viewport behavior', () => {
  it('renders compact mode on mobile inactive frontmatter (100% width)', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-effort-1"
        section={createEffortSection()}
        view={view}
        isActive={false}
        widthPercent={100}
        docVersion={1}
      />,
    );

    // Mobile inactive frontmatter gets 100% width → compact mode
    expect(screen.getByText('Effort', { selector: 'span' })).toBeTruthy();
    expect(screen.queryByLabelText('Slug')).toBeNull();
    expect(screen.getByText(/Focus the block to edit/)).toBeTruthy();
  });

  it('renders full form when active on mobile if width allows', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    // Even on mobile, if active and widthPercent >= 24, show full form
    expect(screen.getByLabelText('Slug')).toBeTruthy();
    expect(screen.getByLabelText('Label')).toBeTruthy();
    expect(screen.getByLabelText('MET')).toBeTruthy();
  });
});

// ── Serialization round-trip tests ────────────────────────────────────────

describe('FrontmatterCompanion — serialization round-trip', () => {
  it('preserves all nested fields through edit dispatch', () => {
    const view = createView(NESTED_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Updated' } });

    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    const output = dispatchArg.changes.insert;

    // All original fields should be preserved
    expect(output).toContain('id: "effort-1"');
    expect(output).toContain('slug: "rowing-intervals"');
    expect(output).toContain('label: Updated');
    expect(output).toContain('  - row');
    expect(output).toContain('  - erg');
    expect(output).toContain('baseAttributes:');
    expect(output).toContain('  met: 7.0');
    expect(output).toContain('  discipline: rowing');
    expect(output).toContain('intensityTier: high');
    expect(output).toContain('registrySource: bundled');
  });

  it('preserves derivation fields through edit dispatch', () => {
    const view = createView(DERIVATION_EFFORT_CONTENT);

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

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Updated Derived' } });

    const dispatchArg = vi.mocked(view.dispatch).mock.calls[0][0] as { changes: { insert: string } };
    const output = dispatchArg.changes.insert;

    expect(output).toContain('label: Updated Derived');
    expect(output).toContain('derivation:');
    expect(output).toContain('  parentSlug: "parent-rowing"');
    expect(output).toContain('  coefficients:');
    expect(output).toContain('    met: 1.14');
  });
});

// ── Generic property form (default subtype) ─────────────────────────────────

const GENERIC_CONTENT = [
  'title: "WOD 761"',
  'order: 2',
  'category:',
  '  - kettlebell',
  '  - strength',
].join('\n');

function createGenericSection(props: Partial<EditorSection> = {}): EditorSection {
  return {
    id: 'frontmatter-generic-1',
    type: 'frontmatter',
    from: 0,
    to: 0,
    startLine: 1,
    endLine: 6,
    contentFrom: 0,
    contentTo: 0,
    ...props,
  } as EditorSection;
}

function renderGeneric(view: EditorView, overrides: Partial<Parameters<typeof FrontmatterCompanion>[0]> = {}) {
  return render(
    <FrontmatterCompanion
      sectionId="frontmatter-generic-1"
      section={createGenericSection()}
      view={view}
      isActive
      widthPercent={35}
      docVersion={1}
      {...overrides}
    />,
  );
}

function lastInsert(view: EditorView): string {
  const calls = vi.mocked(view.dispatch).mock.calls;
  return (calls[calls.length - 1][0] as { changes: { insert: string } }).changes.insert;
}

describe('FrontmatterCompanion — generic property form', () => {
  it('renders one row per property with type-appropriate controls', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    expect(screen.getByText('Properties', { selector: 'span' })).toBeTruthy();
    expect(screen.getByText('3 fields')).toBeTruthy();

    expect((screen.getByLabelText('title') as HTMLInputElement).value).toBe('WOD 761');
    const orderInput = screen.getByLabelText('order') as HTMLInputElement;
    expect(orderInput.value).toBe('2');
    expect(orderInput.type).toBe('number');
    expect(screen.getByText('kettlebell')).toBeTruthy();
    expect(screen.getByText('strength')).toBeTruthy();

    expect((screen.getByLabelText('Type for title') as HTMLSelectElement).value).toBe('text');
    expect((screen.getByLabelText('Type for order') as HTMLSelectElement).value).toBe('number');
    expect((screen.getByLabelText('Type for category') as HTMLSelectElement).value).toBe('list');
  });

  it('commits an edited text value as serialized YAML', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.change(screen.getByLabelText('title'), { target: { value: 'WOD 762' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(lastInsert(view)).toBe('title: WOD 762\norder: 2\ncategory:\n  - kettlebell\n  - strength');
  });

  it('commits an edited number value', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.change(screen.getByLabelText('order'), { target: { value: '5' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(lastInsert(view)).toContain('order: 5');
  });

  it('commits a renamed key while preserving row order and value', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.change(screen.getAllByLabelText('Property name')[0], { target: { value: 'name' } });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(lastInsert(view)).toBe('name: WOD 761\norder: 2\ncategory:\n  - kettlebell\n  - strength');
  });

  it('holds invalid key drafts locally without dispatching', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    const keyInput = screen.getAllByLabelText('Property name')[0];
    fireEvent.change(keyInput, { target: { value: '1bad' } });

    expect(view.dispatch).not.toHaveBeenCalled();
    expect((keyInput as HTMLInputElement).value).toBe('1bad');
  });

  it('rejects renaming a key to an already-taken name', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.change(screen.getAllByLabelText('Property name')[0], { target: { value: 'order' } });

    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it('removes a property via its remove button', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.click(screen.getByLabelText('Remove order'));

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(lastInsert(view)).toBe('title: WOD 761\ncategory:\n  - kettlebell\n  - strength');
  });

  it('adds a new property through the add-property flow', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.click(screen.getByRole('button', { name: /add property/i }));
    fireEvent.change(screen.getByLabelText('New property name'), { target: { value: 'difficulty' } });
    fireEvent.change(screen.getByLabelText('New property value'), { target: { value: 'hard' } });
    fireEvent.keyDown(screen.getByLabelText('New property name'), { key: 'Enter' });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(lastInsert(view)).toBe(
      'title: WOD 761\norder: 2\ncategory:\n  - kettlebell\n  - strength\ndifficulty: hard',
    );
  });

  it('adds a list item on Enter and removes one via its chip button', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.change(screen.getByLabelText('Add to category'), { target: { value: 'row' } });
    fireEvent.keyDown(screen.getByLabelText('Add to category'), { key: 'Enter' });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(lastInsert(view)).toContain('category:\n  - kettlebell\n  - strength\n  - row');

    fireEvent.click(screen.getByLabelText('Remove kettlebell'));

    expect(view.dispatch).toHaveBeenCalledTimes(2);
    expect(lastInsert(view)).toContain('category:\n  - strength');
  });

  it('renders a read-only summary in compact mode', () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view, { isActive: false });

    expect(screen.getByText('Focus the block to edit properties.')).toBeTruthy();
    expect(screen.getByText('WOD 761')).toBeTruthy();
    expect(screen.queryByLabelText('title')).toBeNull();
  });
});

describe('FrontmatterCompanion — add-property focus flow', () => {
  it('does not commit when focus moves from key input to value input within the add row', async () => {
    const view = createView(GENERIC_CONTENT);
    renderGeneric(view);

    fireEvent.click(screen.getByRole('button', { name: /add property/i }));
    const nameInput = screen.getByLabelText('New property name');
    const valueInput = screen.getByLabelText('New property value');

    fireEvent.change(nameInput, { target: { value: 'equipment' } });
    // Moving to the value input: focus lands there before the deferred
    // blur-commit check runs, so no commit may fire.
    valueInput.focus();
    fireEvent.blur(nameInput);
    const { promise: settled, resolve: markSettled } = Promise.withResolvers<void>();
    setTimeout(markSettled, 10);
    await settled;
    expect(view.dispatch).not.toHaveBeenCalled();

    fireEvent.change(valueInput, { target: { value: 'kettlebell' } });
    fireEvent.keyDown(valueInput, { key: 'Enter' });

    expect(view.dispatch).toHaveBeenCalledTimes(1);
    expect(lastInsert(view)).toContain('equipment: kettlebell');
  });
});
