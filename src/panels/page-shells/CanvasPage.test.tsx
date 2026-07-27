import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, cleanup, render, screen } from '@testing-library/react';
import { CanvasPage } from './CanvasPage';
import type { PageNavLink } from '@/components/organisms/layout/PageNavDropdown';

let mockActiveId = '';
const mockSetActiveId = mock((id: string, _opts?: { history?: string }) => {
  mockActiveId = id;
});

mock.module('nuqs', () => ({
  useQueryState: () => [mockActiveId, mockSetActiveId],
  parseAsStringEnum: () => ({ withDefault: () => 'all' }),
}));

describe('CanvasPage', () => {
  beforeEach(() => {
    mockActiveId = '';
    mockSetActiveId.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the title and children', () => {
    render(
      <CanvasPage title="Test Page" index={[{ id: 'intro', label: 'Intro', type: 'heading' }]} activeSectionId="intro">
        <div data-testid="content">Hello</div>
      </CanvasPage>,
    );

    expect(screen.getByText('Test Page')).toBeTruthy();
    expect(screen.getByTestId('content')).toBeTruthy();
  });

  it('invokes onRun on primary sidebar click for collection workout links', () => {
    const onRun = mock(() => {});
    const index: PageNavLink[] = [
      {
        id: 'workout-../../markdown/collections/girls/Fran.md',
        label: 'Fran',
        type: 'wod',
        onRun,
        runIcon: 'link',
      },
    ];

    render(
      <CanvasPage title="Collection" index={index} activeSectionId="workout-../../markdown/collections/girls/Fran.md">
        <div data-testid="content">Collection content</div>
      </CanvasPage>,
    );

    act(() => {
      screen.getByText('Fran').click();
    });
    expect(onRun).toHaveBeenCalled();
  });
});
