/**
 * createJournalNoteStrategy — command palette strategy for creating a new
 * journal note for a specific date.
 *
 * Top-level options: Blank · Template (soon) · Collection · History · Feed
 * Selecting Collection / History / Feed switches to a sub-strategy that lets
 * the user search for a source; the chosen content is cloned into the new note.
 */

import type { CommandStrategy, CommandPaletteResult } from '@/components/command-palette/types';
import { playgroundDB } from './playgroundDB';

// ── Blank template ─────────────────────────────────────────────────────────

export const JOURNAL_BLANK_TEMPLATE = `# Journal Entry\n\n\`\`\`wod\n\n\`\`\`\n`;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateLabel(dateKey: string): string {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface JournalNoteStrategyParams {
  dateKey: string;
  /** Workout library items — used by the Collection sub-strategy. */
  workoutItems: { id: string; name: string; category: string; content?: string }[];
  /** Swap the active palette strategy (same as setStrategy from useCommandPalette). */
  updateStrategy: (strategy: CommandStrategy | null) => void;
  /**
   * Called when the user has made a selection.
   * Pass the content to pre-populate, or empty string for blank.
   * The caller is responsible for saving to playgroundDB and navigating.
   */
  onCreated: (content: string) => Promise<void> | void;
}

// ── Top-level options ──────────────────────────────────────────────────────

const SOURCE_OPTIONS: CommandPaletteResult[] = [
  {
    id: 'blank',
    name: 'Blank',
    category: 'Create from',
    subtitle: 'Empty entry with a workout block ready to fill in',
    type: 'action',
    payload: 'blank',
  },
  {
    id: 'template',
    name: 'Template',
    category: 'Create from',
    subtitle: 'Coming soon — saved note templates',
    type: 'action',
    payload: 'template',
  },
  {
    id: 'collection',
    name: 'Collection',
    category: 'Create from',
    subtitle: 'Clone a workout from the library into today\'s entry',
    type: 'action',
    payload: 'collection',
  },
  {
    id: 'history',
    name: 'History',
    category: 'Create from',
    subtitle: 'Copy the structure of a past journal entry',
    type: 'action',
    payload: 'history',
  },
  {
    id: 'feed',
    name: 'Feed',
    category: 'Create from',
    subtitle: 'Browse recent workouts to copy into this entry',
    type: 'action',
    payload: 'feed',
  },
];

// ── Main strategy ──────────────────────────────────────────────────────────

export function createJournalNoteStrategy(params: JournalNoteStrategyParams): CommandStrategy {
  const dateLabel = formatDateLabel(params.dateKey);

  return {
    id: 'journal-note-create',
    placeholder: 'Choose a starting point…',

    renderHeader: () => (
      <div className="px-4 py-3 bg-primary/5 border-b border-border">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          New journal entry
        </p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{dateLabel}</p>
      </div>
    ),

    getResults: async (query: string) => {
      if (!query) return SOURCE_OPTIONS;
      const q = query.toLowerCase();
      return SOURCE_OPTIONS.filter(
        o => o.name.toLowerCase().includes(q) || (o.subtitle ?? '').toLowerCase().includes(q),
      );
    },

    onSelect: (result) => {
      switch (result.payload) {
        case 'blank':
          params.onCreated(JOURNAL_BLANK_TEMPLATE);
          break;

        case 'template':
          // Coming soon — do nothing
          break;

        case 'collection':
          params.updateStrategy(createCollectionPickStrategy(params));
          break;

        case 'history':
          params.updateStrategy(createHistoryPickStrategy(params));
          break;

        case 'feed':
          // Feed uses the same library as Collection for now
          params.updateStrategy(createCollectionPickStrategy(params));
          break;
      }
    },
  };
}

// ── Collection sub-strategy ────────────────────────────────────────────────

function createCollectionPickStrategy(params: JournalNoteStrategyParams): CommandStrategy {
  return {
    id: 'journal-note-collection',
    placeholder: 'Search the workout library…',

    getResults: async (query: string) => {
      const q = query.toLowerCase();
      const items = params.workoutItems.filter(item =>
        !query ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
      );
      return items.slice(0, 30).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        type: 'workout' as const,
        payload: item,
      }));
    },

    onSelect: (result) => {
      const item = result.payload as { name: string; content?: string };
      const content = item.content
        ? `# ${item.name}\n\n${item.content}`
        : JOURNAL_BLANK_TEMPLATE;
      params.onCreated(content);
    },
  };
}

// ── History sub-strategy ───────────────────────────────────────────────────

function createHistoryPickStrategy(params: JournalNoteStrategyParams): CommandStrategy {
  return {
    id: 'journal-note-history',
    placeholder: 'Search past journal entries…',

    getResults: async (query: string) => {
      const [lower, upper] = await Promise.all([
        playgroundDB.getPagesByCategory('journal'),
        playgroundDB.getPagesByCategory('Journal'),
      ]);

      const q = query.toLowerCase();
      const pages = [...lower, ...upper]
        // Exclude the date we're creating for, and non-date pages
        .filter(p => {
          const key = p.id.replace(/^journal\//, '');
          return /^\d{4}-\d{2}-\d{2}$/.test(key) && p.id !== `journal/${params.dateKey}`;
        })
        .filter(p =>
          !query ||
          p.name.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 30);

      return pages.map(p => ({
        id: p.id,
        name: p.name,
        category: 'Journal',
        subtitle: new Date(p.updatedAt).toLocaleDateString(),
        type: 'action' as const,
        payload: p,
      }));
    },

    onSelect: (result) => {
      params.onCreated(result.payload?.content ?? JOURNAL_BLANK_TEMPLATE);
    },
  };
}
