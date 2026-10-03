import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { NavPanelProps } from '../navTypes';
import { storageService } from '@/services/storage';
import { noteByIdPath, ROUTE_PATTERNS } from '../../lib/routes';

interface PageWithSession {
  id: string;
  title: string;
}

export function SessionsNavPanel(_props: NavPanelProps | Record<string, unknown>) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pages, setPages] = useState<PageWithSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadPages() {
      try {
        const sessions = (await storageService.getRecentSessions?.(30)) ?? [];
        const seenNoteIds = new Set<string>();
        const noteIds: string[] = [];

        for (const session of sessions) {
          if (session.noteId && !seenNoteIds.has(session.noteId)) {
            seenNoteIds.add(session.noteId);
            noteIds.push(session.noteId);
            if (noteIds.length >= 10) break;
          }
        }

        const loaded: PageWithSession[] = [];
        for (const noteId of noteIds) {
          const note = await storageService.getNote?.(noteId);
          if (note) {
            loaded.push({
              id: note.id,
              title: note.title || 'Untitled Note',
            });
          }
        }

        if (!cancelled) {
          setPages(loaded);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPages();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const allSessionsActive =
    location.pathname === ROUTE_PATTERNS.sessions ||
    location.pathname === '/sessions';

  return (
    <div className="flex flex-col gap-1 px-2 py-3" data-testid="sessions-nav-panel">
      <NavRow
        label="All Sessions"
        active={allSessionsActive}
        onClick={() => navigate(ROUTE_PATTERNS.sessions)}
      />

      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3">
        Recent Pages
      </div>

      {loading ? (
        <div className="px-3 py-2 text-xs text-muted-foreground/60">Loading…</div>
      ) : pages.length === 0 ? (
        <>
          <div className="px-3 py-2 text-xs text-muted-foreground/60">No sessions recorded yet.</div>
          <button
            type="button"
            onClick={() => navigate(ROUTE_PATTERNS.collections)}
            className="mx-3 mb-1 rounded-lg border border-border/60 px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-muted/60"
          >
            Browse workouts to run your first session
          </button>
        </>
      ) : (
        pages.map((p) => (
          <NavRow
            key={p.id}
            label={p.title}
            active={location.pathname === noteByIdPath(p.id)}
            onClick={() => navigate(noteByIdPath(p.id))}
          />
        ))
      )}
    </div>
  );
}

function NavRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer select-none',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}
