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
  /** Clone a prebuilt seed into the vault as an editable dashboard note,
   *  stamping its slug so it stays route-addressable at /dashboard/:slug. */
  cloneDashboard(slug: string, seedRawContent: string, title?: string): Promise<HistoryEntry>;
}

export function createDashboardNotes({ persistence, journal }: DashboardNotesDependencies): DashboardNotes {
  // Deactivate every other active dashboard so the just-created/cloned note
  // is the one the namespace lands on. Runs before the create so a failure
  // leaves the vault's existing dashboards intact.
  async function deactivateOthers(excludeId?: string): Promise<void> {
    const notes = await persistence.listNotes({});
    for (const note of notes) {
      if (excludeId && note.id === excludeId) continue;
      const { meta, body } = parseFrontmatter(note.rawContent);
      if (meta['dashboard'] !== 'true' || meta['dashboard.active'] !== 'true') continue;
      const next = { ...meta };
      delete next['dashboard.active'];
      await journal.update(note.id, `---\n${serializeFrontmatter(next)}\n---\n${body}`);
    }
  }

  return {
    async createDashboard(title = DEFAULT_DASHBOARD_TITLE) {
      await deactivateOthers();
      return journal.create({ title, rawContent: buildDashboardScaffold(title), type: 'note' });
    },

    async cloneDashboard(slug, seedRawContent, title) {
      await deactivateOthers();
      // Stamp the slug into the seed's frontmatter so the clone is
      // addressable; keep the seed's title unless overridden.
      const { meta, body } = parseFrontmatter(seedRawContent);
      const nextMeta: Record<string, string | number | string[]> = { ...meta, slug };
      if (title) nextMeta.title = title;
      const raw = `---\n${serializeFrontmatter(nextMeta)}\n---\n${body}`;
      return journal.create({ title: typeof nextMeta.title === 'string' ? nextMeta.title : slug, rawContent: raw, type: 'note' });
    },
  };
}

export const dashboardNotes = createDashboardNotes({ persistence: notePersistence, journal: journalNotes });
