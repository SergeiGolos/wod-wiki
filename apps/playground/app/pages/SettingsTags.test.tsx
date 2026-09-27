import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import { InMemoryStorage } from '@/services/storage/InMemoryStorage';
import { setStorageForTesting, resetStorageForTesting, storageService } from '@/services/storage';

// Mock contexts
mock.module('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'system', setTheme: () => {} }),
}));
mock.module('@/contexts/AudioContext', () => ({
  useAudio: () => ({ isEnabled: true, toggleAudio: () => {}, playTestSound: () => {} }),
}));
mock.module('@/contexts/DebugModeContext', () => ({
  useDebugMode: () => ({ isDebugMode: false, toggleDebugMode: () => {} }),
}));

afterEach(() => {
  cleanup();
  resetStorageForTesting();
});

function renderSettings(initialPath = '/settings/tags') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/:tab" element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SettingsPage Tags Management (Ticket 04)', () => {
  let memoryStorage: InMemoryStorage;

  beforeEach(async () => {
    memoryStorage = new InMemoryStorage();
    setStorageForTesting(memoryStorage);

    await storageService.putTagType({
      id: 'type-equipment',
      name: 'equipment',
      label: 'Equipment',
      color: '#3b82f6',
      createdAt: 1000,
    });

    await storageService.putTag({
      id: 'tag-1',
      label: 'barbell',
      type: 'equipment',
      createdAt: 1000,
    });

    await storageService.putTag({
      id: 'tag-2',
      label: 'benchmark',
      createdAt: 1001,
    });
  });

  it('renders the tags management subroute with tag types and tags', async () => {
    renderSettings('/settings/tags');

    // Tag Types header and seeded item
    await waitFor(() => {
      expect(screen.getAllByText('Equipment').length).toBeGreaterThan(0);
      expect(screen.getByText('barbell')).toBeTruthy();
      expect(screen.getByText('benchmark')).toBeTruthy();
    });
  });

  it('can create a new tag type from the UI', async () => {
    renderSettings('/settings/tags');

    await waitFor(() => {
      expect(screen.getAllByText('Equipment').length).toBeGreaterThan(0);
    });
    const nameInput = screen.getByPlaceholderText('Type name (e.g. discipline)');
    const labelInput = screen.getByPlaceholderText('Display label (e.g. Discipline)');
    const addTypeBtn = screen.getByRole('button', { name: /Add Type/i });

    fireEvent.change(nameInput, { target: { value: 'movement' } });
    fireEvent.change(labelInput, { target: { value: 'Movement' } });
    fireEvent.click(addTypeBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Movement').length).toBeGreaterThan(0);
    });

    const types = await storageService.getAllTagTypes();
    expect(types.map((t) => t.name)).toContain('movement');
  });

  it('can reassign a tag type from the UI', async () => {
    renderSettings('/settings/tags');

    await waitFor(() => {
      expect(screen.getByText('benchmark')).toBeTruthy();
    });

    const select = screen.getByLabelText('Type for benchmark');
    fireEvent.change(select, { target: { value: 'equipment' } });

    await waitFor(async () => {
      const tag = (await storageService.getAllTags()).find((t) => t.label === 'benchmark');
      expect(tag?.type).toBe('equipment');
    });
  });

  it('filters the tags table by search text and by type', async () => {
    renderSettings('/settings/tags');

    await waitFor(() => {
      expect(screen.getByText('barbell')).toBeTruthy();
      expect(screen.getByText('benchmark')).toBeTruthy();
    });

    // Search filter
    const searchInput = screen.getByLabelText('Filter tags');
    fireEvent.change(searchInput, { target: { value: 'barb' } });

    await waitFor(() => {
      expect(screen.queryByText('barbell')).toBeTruthy();
      expect(screen.queryByText('benchmark')).toBeNull();
    });

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.queryByText('benchmark')).toBeTruthy();
    });

    // Type filter: filter to equipment only
    const typeFilterSelect = screen.getByLabelText('Filter by type');
    fireEvent.change(typeFilterSelect, { target: { value: 'equipment' } });

    await waitFor(() => {
      expect(screen.queryByText('barbell')).toBeTruthy();
      expect(screen.queryByText('benchmark')).toBeNull();
    });
  });

  it('edits a tag label inline in the table', async () => {
    renderSettings('/settings/tags');

    await waitFor(() => {
      expect(screen.getByText('barbell')).toBeTruthy();
    });

    // Click to rename
    const tagButton = screen.getByText('barbell');
    fireEvent.click(tagButton);

    const editInput = screen.getByDisplayValue('barbell');
    fireEvent.change(editInput, { target: { value: 'barbell-renamed' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });

    await waitFor(async () => {
      const tags = await storageService.getAllTags();
      const labels = tags.map((t) => t.label);
      expect(labels).toContain('barbell-renamed');
      expect(labels).not.toContain('barbell');
    });
  });
});
