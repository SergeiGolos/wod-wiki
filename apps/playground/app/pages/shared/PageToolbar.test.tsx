import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActionsMenu } from './PageToolbar';
import { NavContext, initialNavState } from '../../nav/NavContext';
import type { NavItemL3 } from '../../nav/navTypes';

mock.module('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'system', setTheme: () => {} }),
}));

mock.module('@/contexts/AudioContext', () => ({
  useAudio: () => ({ isEnabled: false, toggleAudio: () => {} }),
}));

mock.module('@/contexts/DebugModeContext', () => ({
  useDebugMode: () => ({ isDebugMode: false, toggleDebugMode: () => {} }),
}));

function renderWithNav(l3Items: NavItemL3[], scrollToSection = mock(() => {})) {
  return render(
    <MemoryRouter>
      <NavContext.Provider
        value={{
          tree: [],
          navState: initialNavState,
          dispatch: () => {},
          l3Items,
          setL3Items: () => {},
          scrollToSection,
          registerScrollFn: () => {},
        }}
      >
        <ActionsMenu currentWorkout={{ name: 'Test', content: '' }} />
      </NavContext.Provider>
    </MemoryRouter>,
  );
}

describe('ActionsMenu', () => {
  afterEach(() => {
    cleanup();
  });

  it('scrolls to the section for plain L3 items', () => {
    const scrollToSection = mock(() => {});
    const items: NavItemL3[] = [
      { id: 'intro', label: 'Intro', level: 3, action: { type: 'scroll', sectionId: 'intro' } },
    ];

    renderWithNav(items, scrollToSection);
    act(() => {
      screen.getByRole('button').click();
    });
    act(() => {
      screen.getByText('Intro').click();
    });
    expect(scrollToSection).toHaveBeenCalledWith('intro');
  });

  it('invokes the action handler for collection workout links with a call action', () => {
    const onRun = mock(() => {});
    const scrollToSection = mock(() => {});
    const items: NavItemL3[] = [
      {
        id: 'workout-../../markdown/collections/girls/Fran.md',
        label: 'Fran',
        level: 3,
        action: { type: 'call', handler: onRun },
      },
    ];

    renderWithNav(items, scrollToSection);
    act(() => {
      screen.getByRole('button').click();
    });
    act(() => {
      screen.getByText('Fran').click();
    });
    expect(onRun).toHaveBeenCalled();
    expect(scrollToSection).not.toHaveBeenCalled();
  });

  it('offers Date language options with the current one marked, and persists a pick (#858)', () => {
    renderWithNav([]);
    act(() => {
      screen.getByRole('button').click();
    });

    // Auto (UI language) is the default and carries the ✓.
    expect(screen.getByTestId('date-locale-auto').textContent).toContain('Auto (UI language)')
    expect(screen.getByTestId('date-locale-auto').textContent).toContain('✓')
    expect(screen.getByTestId('date-locale-en').textContent).not.toContain('✓')

    act(() => {
      screen.getByTestId('date-locale-en').click();
    });
    expect(localStorage.getItem('wodwiki:dateLocale')).toBe('en')

    // Item clicks close the menu — re-open to assert the ✓ moved.
    act(() => {
      screen.getByRole('button').click();
    });
    expect(screen.getByTestId('date-locale-en').textContent).toContain('✓')
    expect(screen.getByTestId('date-locale-auto').textContent).not.toContain('✓')

    // Back to Auto clears the stored override.
    act(() => {
      screen.getByTestId('date-locale-auto').click();
    });
    expect(localStorage.getItem('wodwiki:dateLocale')).toBeNull()
    localStorage.clear()
  });
});
