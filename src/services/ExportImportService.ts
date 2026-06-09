/**
 * ExportImportService — thin orchestrator for note export/import.
 *
 * Format/policy logic lives in pure modules:
 * - NoteCsvFormatter
 * - NoteMarkdownSerializer
 * - NoteMarkdownDeserializer
 *
 * I/O lives in adapter ports:
 * - BrowserFileWriter / BrowserFileDownloader
 * - BrowserFilePicker
 *
 * This module wires them together for the browser runtime.
 */

import type { HistoryEntry } from '@/types/history';
import type { IContentProvider } from '@/types/content-provider';
import { wallClockNow } from '@/runtime/INowProvider';

import { statementsToCSV, resultsToCSV } from './export/NoteCsvFormatter';
import { noteToMarkdown } from './export/NoteMarkdownSerializer';
import { parseMarkdownToEntry, createNoteFromMarkdown as _createNoteFromMarkdown } from './export/NoteMarkdownDeserializer';
import { BrowserFileWriter } from './export/BrowserFileWriter';
import { BrowserFilePicker } from './export/BrowserFilePicker';
import { BrowserFileDownloader } from './export/BrowserFileDownloader';


// ── Export Functions ──────────────────────────────────────────────────────

export async function exportAllNotes(provider: IContentProvider): Promise<void> {
  const entries = await provider.getEntries();
  if (entries.length === 0) {
    throw new Error('No notes to export');
  }

  const clock = wallClockNow;
  const zip = new BrowserFileWriter();
  const downloader = new BrowserFileDownloader();

  // README
  const readme = [
    '# WOD Wiki Export',
    '',
    `Export Date: ${clock.now().toISOString()}`,
    `Total Notes: ${entries.length}`,
    '',
    '## File Structure',
    '',
    'Each note is exported with the following files:',
    '- `{noteId}.md` - Markdown representation with metadata',
    '- `{noteId}_statements.csv` - Parsed code statements and metrics',
    '- `{noteId}_results.csv` - Workout results for all versions',
    '',
    '## Notes',
    '',
    ...entries.map(e => `- ${e.title} (${e.id})`),
  ].join('\n');
  zip.addText('README.md', readme);

  for (const entry of entries) {
    const noteId = entry.id.replace(/[^a-zA-Z0-9-_]/g, '_');
    zip.addText(`${noteId}.md`, noteToMarkdown(entry, clock));
    zip.addText(`${noteId}_statements.csv`, statementsToCSV(entry));
    zip.addText(`${noteId}_results.csv`, resultsToCSV(entry));
  }

  const blob = await zip.toBlob();
  downloader.download(blob, `wod-wiki-export-${clock.nowMs()}.zip`);
}

export async function exportNote(entry: HistoryEntry): Promise<void> {
  const clock = wallClockNow;
  const zip = new BrowserFileWriter();
  const downloader = new BrowserFileDownloader();

  const noteId = entry.id.replace(/[^a-zA-Z0-9-_]/g, '_');
  zip.addText(`${noteId}.md`, noteToMarkdown(entry, clock));
  zip.addText(`${noteId}_statements.csv`, statementsToCSV(entry));
  zip.addText(`${noteId}_results.csv`, resultsToCSV(entry));

  const readme = [
    `# ${entry.title}`,
    '',
    `Export Date: ${clock.now().toISOString()}`,
    '',
    '## Files',
    '',
    `- \`${noteId}.md\` - Markdown representation with metadata`,
    `- \`${noteId}_statements.csv\` - Parsed code statements and metrics`,
    `- \`${noteId}_results.csv\` - Workout results`,
  ].join('\n');
  zip.addText('README.md', readme);

  const blob = await zip.toBlob();
  const filename = `${entry.title.replace(/[^a-zA-Z0-9-_]/g, '_')}-${clock.nowMs()}.zip`;
  downloader.download(blob, filename);
}

// ── Import Functions ──────────────────────────────────────────────────────

export async function importFromZip(
  file: File,
  provider: IContentProvider
): Promise<{ imported: number; errors: string[] }> {
  // Import still uses JSZip directly to read the zip
  // (IFileWriter is for writing; reading is a separate concern not yet port-seamed)
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const errors: string[] = [];
  let imported = 0;

  const mdFiles = Object.keys(zip.files).filter(name => name.endsWith('.md') && name !== 'README.md');

  for (const filename of mdFiles) {
    try {
      const content = await zip.files[filename].async('text');
      const entry = parseMarkdownToEntry(content);
      if (entry) {
        await provider.saveEntry(entry);
        imported++;
      }
    } catch (err) {
      errors.push(`Failed to import ${filename}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { imported, errors };
}

// ── Public API ────────────────────────────────────────────────────────────

export function pickFile(accept: string = '*'): Promise<File | null> {
  return new BrowserFilePicker().pick(accept);
}

export function createNoteFromMarkdown(markdown: string): Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> {
  return _createNoteFromMarkdown(markdown);
}
