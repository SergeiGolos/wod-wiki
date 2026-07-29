/**
 * TourReferenceSection.test.tsx — Quick Reference CTAs.
 */

import { afterEach, describe, expect, it } from 'bun:test';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TourReferenceSection } from './TourReferenceSection';
import { telemetry, HOME_EVENTS } from '@/services/telemetry';
import { CONSTRUCT_GRID_CELLS, getConstructByGridCell } from '../services/constructSource';

function renderSection() {
  return render(
    <MemoryRouter>
      <TourReferenceSection />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

describe('TourReferenceSection', () => {
  it('links Open the cheat sheet to /guide/syntax/cheatsheet', () => {
    renderSection();
    const link = screen.getByRole('link', { name: /Open the cheat sheet/ });
    expect(link.getAttribute('href')).toBe('/guide/syntax/cheatsheet');
  });

  it('renders every Quick Reference cell as a link to its cheat-sheet anchor', () => {
    renderSection();
    for (const cell of CONSTRUCT_GRID_CELLS) {
      const link = screen.getByRole('link', { name: cell });
      const item = getConstructByGridCell(cell);
      expect(link.getAttribute('href')).toBe(item?.gridRoute ?? '/guide/syntax/cheatsheet');
    }
  });

  it('records reference_opened telemetry when a grid cell is clicked', () => {
    const recorded: { name: string }[] = [];
    const unsubscribe = telemetry.events.subscribe((event) => recorded.push(event as { name: string }));
    try {
      renderSection();
      const link = screen.getByRole('link', { name: 'AMRAP' });
      fireEvent.click(link);
      expect(recorded.map((e) => e.name)).toContain(HOME_EVENTS.referenceOpened);
    } finally {
      unsubscribe();
    }
  });

  it('opens the palette from the search button', () => {
    renderSection();
    const dispatched: KeyboardEvent[] = [];
    const capture = (e: Event) => dispatched.push(e as KeyboardEvent);
    window.addEventListener('keydown', capture);
    try {
      const button = screen.getByRole('button', { name: /Search everything/ });
      fireEvent.click(button);
      expect(dispatched.length).toBeGreaterThan(0);
    } finally {
      window.removeEventListener('keydown', capture);
    }
  });
});
