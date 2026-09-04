import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MenuList } from '../MenuList';
import type { MenuSpec } from '../menuModel';

function renderMenu(entries: MenuSpec) {
  return render(
    <MemoryRouter>
      <MenuList entries={entries} />
    </MemoryRouter>,
  );
}

describe('MenuList', () => {
  afterEach(() => {
    cleanup();
  });

  it('invokes onRun when a run-affordance link row is clicked', () => {
    const onRun = mock(() => {});
    renderMenu([{ kind: 'link', id: 'workout-1', label: 'Fran', onRun, runIcon: 'play' }]);

    screen.getByText('Fran').click();
    expect(onRun).toHaveBeenCalled();
  });

  it('renders section labels above their entries', () => {
    renderMenu([
      {
        kind: 'section',
        id: 'sec',
        label: 'Recent entries',
        entries: [{ kind: 'link', id: 'e1', label: 'Fran' }],
      },
    ]);

    expect(screen.getByText('Recent entries')).toBeTruthy();
    expect(screen.getByText('Fran')).toBeTruthy();
  });

  it('hides WQL sections that resolved with no rows', () => {
    renderMenu([
      { kind: 'section', id: 'empty', label: 'Recent entries', entries: [] },
      { kind: 'link', id: 'plain', label: 'Plain link' },
    ]);

    expect(screen.queryByText('Recent entries')).toBeNull();
    expect(screen.getByText('Plain link')).toBeTruthy();
  });
});
