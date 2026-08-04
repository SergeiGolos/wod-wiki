/**
 * dashboardNotes — creation flow for dashboard notes (#907, format locked in
 * #899). A new dashboard is a plain vault note (`type: 'note'`, no journal
 * date) carrying the scaffold from src/lib/dashboard/scaffold; creation marks
 * it active and clears `dashboard.active` from every other dashboard note so
 * the route's discovery (active wins, else first) always lands on the new one.
 */

import type { INotePersistence } from '@/services/persistence';
import { notePersistence } from '@/services/persistence';
import type { HistoryEntry } from '@/types/history';
import { parseFrontmatter, serializeFrontmatter } from '@/lib/frontmatter';
import { buildDashboardScaffold, DEFAULT_DASHBOARD_TITLE } from '@/lib/dashboard/scaffold';

import { journalNotes, type JournalNotes } from './journalNotes';

export interface DashboardNotesDependencies {
  persistence: INotePersistence;
  journal: JournalNotes;
}

export interface DashboardNotes {
  createDashboard(title?: string): Promise<HistoryEntry>;
}

export function createDashboardNotes({ persistence, journal }: DashboardNotesDependencies): DashboardNotes {
  return {
    async createDashboard(title = DEFAULT_DASHBOARD_TITLE) {
      // Deactivate first: if creation fails, the vault keeps its dashboards
      // (discovery falls back to the first one) rather than gaining a second
      // active note.
      const notes = await persistence.listNotes({});
      for (const note of notes) {
        const { meta, body } = parseFrontmatter(note.rawContent);
        if (meta['dashboard'] !== 'true' || meta['dashboard.active'] !== 'true') continue;
        const next = { ...meta };
        delete next['dashboard.active'];
        await journal.update(note.id, `---\n${serializeFrontmatter(next)}\n---\n${body}`);
      }

      return journal.create({
        title,
        rawContent: buildDashboardScaffold(title),
        type: 'note',
      });
    },
  };
}

export const dashboardNotes = createDashboardNotes({ persistence: notePersistence, journal: journalNotes });
