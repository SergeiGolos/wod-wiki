import { type INowProvider, wallClockNow } from '@/runtime/INowProvider';
import type { HistoryEntry } from '@/types/history';

/**
 * Parse exported-markdown back into a (partial) HistoryEntry.
 *
 * Time is read exclusively through `clock` (an `INowProvider`) — never via
 * `Date.now()` directly — so the import path is deterministic under a frozen
 * clock. The clock is only consulted for the `Target Date` fallback when the
 * markdown omits it; every field that *is* present in the metadata is
 * recovered verbatim (this is what makes the round-trip preserve timestamps).
 */
export function parseMarkdownToEntry(
  markdown: string,
  clock: INowProvider = wallClockNow,
): Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> | null {
  try {
    // Extract metadata section
    const metadataMatch = markdown.match(/## Metadata\s+(.*?)\s+## Content/s);
    if (!metadataMatch) return null;

    const metadataLines = metadataMatch[1].split('\n').filter((line) => line.trim());

    // Parse metadata
    const metadata: Record<string, string> = {};
    for (const line of metadataLines) {
      const match = line.match(/^- \*\*(.+?)\*\*:\s*(.+)$/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }

    // Extract content
    const contentMatch = markdown.match(/## Content\s+(.*)$/s);
    const rawContent = contentMatch ? contentMatch[1].trim() : '';

    // Extract title from first line
    const titleMatch = markdown.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Imported Note';

    // Parse tags
    const tags =
      metadata['Tags'] && metadata['Tags'] !== 'None'
        ? metadata['Tags'].split(',').map((t) => t.trim())
        : [];

    // Parse dates — recover the stored Target Date verbatim; only fall back to
    // the clock when the metadata omits it.
    const targetDate = metadata['Target Date']
      ? new Date(metadata['Target Date']).getTime()
      : clock.nowMs();

    const result: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> = {
      title,
      rawContent,
      tags,
      targetDate,
      sections: [],
    };

    if (metadata['Cloned From']) {
      result.templateId = metadata['Cloned From'];
    }

    if (metadata['Cloned To']) {
      result.clonedIds = metadata['Cloned To'].split(',').map((id) => id.trim());
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Create a (partial) HistoryEntry from arbitrary markdown. Exported-format
 * markdown round-trips through {@link parseMarkdownToEntry}; plain markdown
 * gets a minimal entry whose `targetDate` is the clock's current time.
 *
 * Time comes exclusively from `clock` (defaulting to the wall clock) — never
 * from `Date.now()`.
 */
export function createNoteFromMarkdown(
  markdown: string,
  clock: INowProvider = wallClockNow,
): Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> {
  // Try to parse as exported format first
  const parsed = parseMarkdownToEntry(markdown, clock);
  if (parsed) return parsed;

  // Otherwise, treat as plain markdown
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Imported Note';

  return {
    title,
    rawContent: markdown,
    tags: [],
    targetDate: clock.nowMs(),
    sections: [],
  };
}
