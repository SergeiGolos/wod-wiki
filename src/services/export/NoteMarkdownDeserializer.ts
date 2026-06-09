import type { INowProvider } from '@/runtime/INowProvider';
import type { HistoryEntry } from '@/types/history';

export function parseMarkdownToEntry(
  markdown: string
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

    // Parse dates
    const targetDate = metadata['Target Date']
      ? new Date(metadata['Target Date']).getTime()
      : Date.now();

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

export function createNoteFromMarkdown(
  markdown: string,
  clock?: INowProvider
): Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> {
  // Try to parse as exported format first
  const parsed = parseMarkdownToEntry(markdown);
  if (parsed) return parsed;

  // Otherwise, treat as plain markdown
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Imported Note';

  return {
    title,
    rawContent: markdown,
    tags: [],
    targetDate: clock?.nowMs() ?? Date.now(),
    sections: [],
  };
}
