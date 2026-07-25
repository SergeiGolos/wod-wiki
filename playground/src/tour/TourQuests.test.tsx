/**
 * TourQuests.test.tsx — the homepage outro quest list: home-tour chapter
 * first with clickable quest rows, guide chapters with cross-page progress
 * and links to their syntax-guide pages.
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TourQuests } from './TourQuests';
import type { Chapter, Quest } from '../canvas/parseCanvasMarkdown';

const STORAGE_KEY = 'wodwiki.quests.v1';

const chapters: Chapter[] = [
  {
    id: 'home-tour',
    title: 'Take the Tour',
    badge: 'play',
    questIds: ['qs-arrive', 'qs-tour-timer'],
    sectionIds: [],
  },
  {
    id: 'basics',
    title: 'Basics',
    badge: 'trophy',
    questIds: ['basics-movement', 'basics-reps'],
    sectionIds: [],
  },
];

const homeQuests: Quest[] = [
  { id: 'qs-arrive', label: 'Welcome to WOD Wiki' },
  { id: 'qs-tour-timer', label: 'See the timer run it' },
];

const questLabels = {
  'basics-movement': 'Add a movement',
  'basics-reps': 'Add a rep count',
};

function seedLedger(ledger: Record<string, Record<string, boolean>>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

function renderQuests(onHomeQuestClick?: (id: string) => void) {
  return render(
    <MemoryRouter>
      <TourQuests
        quests={homeQuests}
        chapters={chapters}
        questLabels={questLabels}
        onHomeQuestClick={onHomeQuestClick}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  // Explicit cleanup: bun's shared test process binds @testing-library's
  // auto-cleanup to whichever file loads first, so renders from this file
  // leak into later queries when another test file ran before it.
  cleanup();
  window.localStorage.clear();
});

describe('TourQuests', () => {
  it('renders every chapter with live progress from the ledger', async () => {
    seedLedger({
      '/': { 'qs-arrive': true },
      '/guide/syntax/basics': { 'basics-movement': true },
    });
    renderQuests();

    await waitFor(() => {
      expect(screen.getByText('Take the Tour')).toBeTruthy();
      expect(screen.getByText('Basics')).toBeTruthy();
    });
    // Both chapters are 1/2 — one done of two declared quests each.
    expect(screen.getAllByText('1/2').length).toBe(2);
    // Overall counter aggregates across chapters.
    expect(screen.getByText('2/4 quests complete')).toBeTruthy();
  });

  it('labels guide quests from the cross-page label map', async () => {
    renderQuests();
    await waitFor(() => {
      expect(screen.getByText('Add a movement')).toBeTruthy();
      expect(screen.getByText('Add a rep count')).toBeTruthy();
    });
  });

  it('fires onHomeQuestClick when a home-chapter quest row is clicked', async () => {
    const onClick = mock(() => {});
    renderQuests(onClick);

    const row = await screen.findByText('See the timer run it');
    fireEvent.click(row);

    expect(onClick).toHaveBeenCalledWith('qs-tour-timer');
  });

  it('links guide chapters to their syntax-guide page', async () => {
    renderQuests();
    await screen.findByText('Basics');
    const link = screen.getByRole('link', { name: /Basics/ });
    expect(link.getAttribute('href')).toBe('/guide/syntax/basics');
  });
});
