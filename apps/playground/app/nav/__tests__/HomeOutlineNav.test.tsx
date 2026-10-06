import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { SecondaryNav } from '../SecondaryNav';
import { NavContext, initialNavState } from '../NavContext';
import type { NavItemL3 } from '../navTypes';
import { deriveNav } from '../../lib/routeNav';
import type { ParsedCanvasPage } from '../../canvas/parseCanvasMarkdown';

const HOME_OUTLINE: NavItemL3[] = [
  { id: 'tour-hero', label: 'Welcome', level: 3, action: { type: 'scroll', sectionId: 'tour-hero' } },
  { id: 'run', label: 'Run it as a Timer', level: 3, action: { type: 'scroll', sectionId: 'tour-section-run' },
    secondaryAction: { id: 'run-start', label: 'Start the run', action: { type: 'call', handler: () => {} } } },
];

function renderHomeNav(l3Items: NavItemL3[], scrollToSection = mock(() => {})) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <NuqsAdapter>
        <NavContext.Provider
          value={{
            tree: [],
            navState: initialNavState,
            dispatch: () => {},
            l3Items,
            setL3Items: () => {},
            secondarySpec: undefined,
            setSecondarySpec: () => {},
            scrollToSection,
            registerScrollFn: () => {},
          }}
        >
          <SecondaryNav />
        </NavContext.Provider>
      </NuqsAdapter>
    </MemoryRouter>,
  );
}

describe('SecondaryNav on home page', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the tour outline instead of the challenges list', () => {
    renderHomeNav(HOME_OUTLINE);

    expect(screen.getByText('On this page')).toBeTruthy();
    expect(screen.getByText('Welcome')).toBeTruthy();
    expect(screen.getByText('Run it as a Timer')).toBeTruthy();
    expect(screen.queryByText('Challenges')).toBeNull();
  });

  it('shows the run transition button on the run outline row', () => {
    const onRun = mock(() => {});
    renderHomeNav([
      { ...HOME_OUTLINE[1]!, secondaryAction: { id: 'run-start', label: 'Start the run', action: { type: 'call', handler: onRun } } },
    ]);

    // The play affordance lives in a nested span with role="button".
    const play = screen.getByTitle('Start workout');
    play.click();
    expect(onRun).toHaveBeenCalled();
  });

  it('shows the stop transition button on the metrics outline row', () => {
    const onRun = mock(() => {});
    renderHomeNav([
      {
        id: 'own',
        label: 'Own the Metrics',
        level: 3,
        action: { type: 'scroll', sectionId: 'tour-section-own' },
        secondaryAction: { id: 'run-stop', label: 'Stop the timer', action: { type: 'call', handler: onRun } },
        secondaryRunIcon: 'stop',
      },
    ]);

    const stop = screen.getByTitle('Stop workout');
    stop.click();
    expect(onRun).toHaveBeenCalled();
  });

  it('scrolls to the section when an outline link is clicked', () => {
    const scrollToSection = mock(() => {});
    renderHomeNav(HOME_OUTLINE, scrollToSection);

    screen.getByText('Welcome').click();
    expect(scrollToSection).toHaveBeenCalledWith('tour-hero');
  });

  it('renders nothing on home when no outline is published', () => {
    const { container } = renderHomeNav([]);
    expect(container.firstChild).toBeNull();
  });
});

describe('deriveNav for home route', () => {
  it('returns an empty index so the home tour owns its L3 outline', () => {
    const mockCanvasPage = {
      frontmatter: {},
      template: 'canvas',
      route: '/',
      quests: [{ id: 'qs-arrive', label: 'Welcome to WOD Wiki' }],
      chapters: [],
      sections: [],
    } as unknown as ParsedCanvasPage;

    const nav = deriveNav('/', {
      canvasPage: mockCanvasPage,
      workoutItems: [],
      recentResults: [],
      selectWorkout: () => {},
    });

    expect(nav).toEqual([]);
  });
});
