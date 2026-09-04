import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { CanvasPage } from './CanvasPage';

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

});
