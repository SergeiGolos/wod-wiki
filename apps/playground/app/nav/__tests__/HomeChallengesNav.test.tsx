import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { HomeChallengesNav, HOME_CHALLENGE_SECTION_MAP } from '../HomeChallengesNav';
import { SecondaryNav } from '../SecondaryNav';
import { NavProvider } from '../NavContext';
import { resolveRouteView } from '../../lib/routeView';
import type { ParsedCanvasPage } from '../../canvas/parseCanvasMarkdown';

describe('HomeChallengesNav', () => {
  afterEach(() => {
    cleanup();
  });

  it('maps home quest ids to the correct home tour sections', () => {
    expect(HOME_CHALLENGE_SECTION_MAP['qs-arrive']).toBe('tour-hero');
    expect(HOME_CHALLENGE_SECTION_MAP['qs-edit']).toBe('tour-hero');
    expect(HOME_CHALLENGE_SECTION_MAP['qs-tour-timer']).toBe('run');
    expect(HOME_CHALLENGE_SECTION_MAP['qs-run']).toBe('run');
    expect(HOME_CHALLENGE_SECTION_MAP['qs-tour-analytics']).toBe('explore');
  });

  it('renders the challenges view with progress badge and quest items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <HomeChallengesNav />
      </MemoryRouter>,
    );

    expect(screen.getByText('Challenges')).toBeTruthy();
    const progressEl = screen.getByTestId('home-challenges-progress');
    expect(progressEl).toBeTruthy();
    expect(progressEl.textContent).toMatch(/^\d+\/\d+$/);

    expect(screen.getByText('Welcome to WOD Wiki')).toBeTruthy();
    expect(screen.getByText('Change the workout')).toBeTruthy();
  });

  it('scrolls to the mapped section on challenge click', () => {
    const scrollIntoViewMock = mock(() => {});
    const heroSection = document.createElement('section');
    heroSection.id = 'tour-hero';
    heroSection.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(heroSection);

    render(
      <MemoryRouter initialEntries={['/']}>
        <HomeChallengesNav />
      </MemoryRouter>,
    );

    const arriveCard = screen.getByText('Welcome to WOD Wiki');
    act(() => {
      arriveCard.click();
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
    document.body.removeChild(heroSection);
  });
});

describe('SecondaryNav on home page', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders HomeChallengesNav when on home route (/)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NuqsAdapter>
          <NavProvider tree={[]}>
            <SecondaryNav />
          </NavProvider>
        </NuqsAdapter>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('home-challenges-nav')).toBeTruthy();
    expect(screen.getByText('Challenges')).toBeTruthy();
  });
});

describe('resolveRouteView for home route', () => {
  it('populates view.nav with the home challenges', () => {
    const mockCanvasPage: ParsedCanvasPage = {
      frontmatter: {},
      template: 'canvas',
      route: '/',
      quests: [
        { id: 'qs-arrive', label: 'Welcome to WOD Wiki' },
        { id: 'qs-edit', label: 'Change the workout' },
        { id: 'qs-tour-timer', label: 'See the timer run it' },
        { id: 'qs-run', label: 'Run it to the finish' },
        { id: 'qs-tour-analytics', label: 'Review the session' },
      ],
      chapters: [],
      sections: [],
    } as unknown as ParsedCanvasPage;

    const view = resolveRouteView('/', {}, {
      canvasPage: mockCanvasPage,
      workoutItems: [],
      recentResults: [],
      selectWorkout: () => {},
    });

    expect(view.nav).toHaveLength(5);
    expect(view.nav[0]?.label).toBe('Welcome to WOD Wiki');
    expect(view.nav[0]?.id).toBe('tour-hero');
    expect(view.nav[2]?.label).toBe('See the timer run it');
    expect(view.nav[2]?.id).toBe('run');
  });
});
