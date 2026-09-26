import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { SessionsNavPanel } from '../SessionsNavPanel';
import { storageService } from '@/services/storage';
import type { Session, Note } from '@/types/storage';

describe('SessionsNavPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders All Sessions link and recent pages with sessions', async () => {
    const originalGetRecent = storageService.getRecentSessions;
    const originalGetNote = storageService.getNote;

    storageService.getRecentSessions = mock(async () => [
      {
        id: 'sess-1',
        noteId: 'note-wod-1',
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        completed: true,
      } as unknown as Session,
      {
        id: 'sess-2',
        noteId: 'note-wod-2',
        startTime: 3000,
        endTime: 4000,
        duration: 1000,
        completed: true,
      } as unknown as Session,
    ]);

    storageService.getNote = mock(async (id: string) => {
      if (id === 'note-wod-1') return { id: 'note-wod-1', title: 'Fran Benchmark', createdAt: 1000 } as unknown as Note;
      if (id === 'note-wod-2') return { id: 'note-wod-2', title: 'Murph Challenge', createdAt: 2000 } as unknown as Note;
      return undefined;
    });

    let currentPath = '/sessions';
    function PathTracker() {
      const location = useLocation();
      currentPath = location.pathname;
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/sessions']}>
        <PathTracker />
        <SessionsNavPanel currentPath="/sessions" location={{ pathname: '/sessions' } as unknown as Location} />
      </MemoryRouter>,
    );

    expect(screen.getByText('All Sessions')).toBeDefined();
    expect(screen.getByText('Recent Pages')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Fran Benchmark')).toBeDefined();
      expect(screen.getByText('Murph Challenge')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Fran Benchmark'));
    expect(currentPath).toBe('/notes/note-wod-1');

    storageService.getRecentSessions = originalGetRecent;
    storageService.getNote = originalGetNote;
  });

  it('shows empty message when no sessions exist', async () => {
    const originalGetRecent = storageService.getRecentSessions;
    storageService.getRecentSessions = mock(async () => []);

    render(
      <MemoryRouter initialEntries={['/sessions']}>
        <SessionsNavPanel currentPath="/sessions" location={{ pathname: '/sessions' } as unknown as Location} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No sessions recorded yet.')).toBeDefined();
    });

    storageService.getRecentSessions = originalGetRecent;
  });
});
