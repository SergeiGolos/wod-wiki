import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EditorView } from '@codemirror/view';
import type { EditorSection } from '@bitcobblers/wod-wiki-ui/extensions';
import { FrontmatterCompanion } from './FrontmatterCompanion';
import { InMemoryStorage } from '@/services/storage/InMemoryStorage';
import { setStorageForTesting, resetStorageForTesting, storageService } from '@/services/storage';

afterEach(() => {
  cleanup();
  resetStorageForTesting();
});

function createView(innerContent: string): EditorView {
  return {
    state: {
      doc: {
        sliceString: vi.fn(() => innerContent),
      },
      readOnly: false,
      facet: vi.fn(() => false),
    },
    dispatch: vi.fn(),
  } as unknown as EditorView;
}

function createFrontmatterSection(): EditorSection {
  return {
    id: 'frontmatter-1',
    type: 'frontmatter',
    from: 0,
    to: 50,
    startLine: 1,
    endLine: 5,
    contentFrom: 4,
    contentTo: 46,
  } as EditorSection;
}

describe('FrontmatterCompanion Typed Tags Typeahead and Creation (Ticket 03)', () => {
  let memoryStorage: InMemoryStorage;

  beforeEach(async () => {
    memoryStorage = new InMemoryStorage();
    setStorageForTesting(memoryStorage);

    await storageService.putTagType({
      id: 'type-equipment',
      name: 'equipment',
      label: 'Equipment',
      createdAt: 1000,
    });

    await storageService.putTag({
      id: 'tag-barbell',
      label: 'barbell',
      type: 'equipment',
      createdAt: 1000,
    });
  });

  it('renders chips for typed tags and suggests matching existing tags', async () => {
    const rawContent = `equipment:
  - barbell
`;
    const view = createView(rawContent);
    const section = createFrontmatterSection();

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-1"
        section={section}
        view={view}
        isActive={true}
        widthPercent={50}
        docVersion={1}
      />
    );

    // Verify existing barbell chip is displayed
    await waitFor(() => {
      expect(screen.getByText('barbell')).toBeTruthy();
    });

    // Find the input for equipment
    const input = screen.getByLabelText('Add to equipment');
    expect(input).toBeTruthy();

    // Type a prefix
    fireEvent.change(input, { target: { value: 'bar' } });

    // Typeahead suggestion should appear
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeTruthy();
    });
  });

  it('creates fresh tag on-the-fly and adds it to the list when Enter is pressed', async () => {
    const rawContent = `equipment:
  - barbell
`;
    const view = createView(rawContent);
    const section = createFrontmatterSection();

    render(
      <FrontmatterCompanion
        sectionId="frontmatter-1"
        section={section}
        view={view}
        isActive={true}
        widthPercent={50}
        docVersion={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('barbell')).toBeTruthy();
    });

    const input = screen.getByLabelText('Add to equipment');
    fireEvent.change(input, { target: { value: 'kettlebell' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Verify fresh tag was created in storage with type 'equipment'
    await waitFor(async () => {
      const tags = await storageService.getTags('equipment');
      const labels = tags.map((t) => t.label);
      expect(labels).toContain('kettlebell');
    });

    // Verify view.dispatch was called with updated content
    expect(view.dispatch).toHaveBeenCalled();
  });
});
