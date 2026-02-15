/**
 * ExportImportService
 *
 * Handles exporting and importing notes data as ZIP files in the browser.
 * Supports exporting all data or individual notes.
 *
 * Export format:
 * - Each note creates:
 *   - {noteId}.md - Markdown representation
 *   - {noteId}_statements.csv - Parsed code statements/fragments
 *   - {noteId}_results_{version}.csv - Results for each version
 */

import JSZip from 'jszip';
import type { HistoryEntry } from '@/types/history';
import type { IContentProvider } from '@/types/content-provider';

// ──────────────────────────────────────────────────────────────
// CSV Formatting Utilities
// ──────────────────────────────────────────────────────────────

/**
 * Escape a CSV field value
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    const headerRow = headers.map(escapeCSV).join(',');
    const dataRows = rows.map(row => row.map(escapeCSV).join(','));
    return [headerRow, ...dataRows].join('\n');
}

// ──────────────────────────────────────────────────────────────
// Note Serialization
// ──────────────────────────────────────────────────────────────

/**
 * Convert a note to markdown content
 */
function noteToMarkdown(entry: HistoryEntry): string {
    const metadata = [
        `# ${entry.title}`,
        '',
        '## Metadata',
        '',
        `- **ID**: ${entry.id}`,
        `- **Created**: ${new Date(entry.createdAt).toISOString()}`,
        `- **Updated**: ${new Date(entry.updatedAt).toISOString()}`,
        `- **Target Date**: ${new Date(entry.targetDate).toISOString()}`,
        `- **Tags**: ${entry.tags.join(', ') || 'None'}`,
    ];

    if (entry.templateId) {
        metadata.push(`- **Cloned From**: ${entry.templateId}`);
    }

    if (entry.clonedIds && entry.clonedIds.length > 0) {
        metadata.push(`- **Cloned To**: ${entry.clonedIds.join(', ')}`);
    }

    metadata.push('', '## Content', '', entry.rawContent);

    return metadata.join('\n');
}

/**
 * Convert parsed statements/fragments to CSV
 */
function statementsToCSV(entry: HistoryEntry): string {
    const headers = [
        'Statement ID',
        'Parent ID',
        'Line',
        'Fragment Type',
        'Fragment Value',
        'Fragment Behavior'
    ];

    const rows: (string | number | null)[][] = [];

    // Extract statements from sections if they exist
    if (entry.sections) {
        for (const section of entry.sections) {
            if (section.wodBlock?.statements) {
                for (const stmt of section.wodBlock.statements) {
                    if (stmt.fragments && stmt.fragments.length > 0) {
                        for (const fragment of stmt.fragments) {
                            rows.push([
                                stmt.id,
                                stmt.parent ?? null,
                                stmt.meta?.line ?? null,
                                fragment.type,
                                fragment.value !== undefined ? JSON.stringify(fragment.value) : null,
                                fragment.behavior ?? null,
                            ]);
                        }
                    } else {
                        // Statement without fragments
                        rows.push([
                            stmt.id,
                            stmt.parent ?? null,
                            stmt.meta?.line ?? null,
                            null,
                            null,
                            null,
                        ]);
                    }
                }
            }
        }
    }

    if (rows.length === 0) {
        return arrayToCSV(headers, [['No statements found', null, null, null, null, null]]);
    }

    return arrayToCSV(headers, rows);
}

/**
 * Convert workout results to CSV format
 */
function resultsToCSV(entry: HistoryEntry): string {
    const headers = [
        'Start Time',
        'End Time',
        'Duration (ms)',
        'Rounds Completed',
        'Total Rounds',
        'Reps Completed',
        'Completed',
        'Fragment Type',
        'Fragment Value',
        'Metric Behavior',
        'Metric Timestamp'
    ];

    const rows: (string | number | boolean | null)[][] = [];

    if (entry.results) {
        const result = entry.results;

        // If there are metrics, create a row for each metric
        if (result.metrics && result.metrics.length > 0) {
            for (const metric of result.metrics) {
                rows.push([
                    result.startTime,
                    result.endTime,
                    result.duration,
                    result.roundsCompleted ?? null,
                    result.totalRounds ?? null,
                    result.repsCompleted ?? null,
                    result.completed,
                    metric.fragment.type,
                    metric.fragment.value !== undefined ? JSON.stringify(metric.fragment.value) : null,
                    metric.behavior ?? null,
                    metric.timestamp ?? null,
                ]);
            }
        } else {
            // No metrics, just the result summary
            rows.push([
                result.startTime,
                result.endTime,
                result.duration,
                result.roundsCompleted ?? null,
                result.totalRounds ?? null,
                result.repsCompleted ?? null,
                result.completed,
                null,
                null,
                null,
                null,
            ]);
        }
    }

    if (rows.length === 0) {
        return arrayToCSV(headers, [['No results found', null, null, null, null, null, null, null, null, null, null]]);
    }

    return arrayToCSV(headers, rows);
}

// ──────────────────────────────────────────────────────────────
// Export Functions
// ──────────────────────────────────────────────────────────────

/**
 * Export all notes from the provider as a ZIP file
 */
export async function exportAllNotes(provider: IContentProvider): Promise<void> {
    const zip = new JSZip();

    // Get all entries
    const entries = await provider.getEntries();

    if (entries.length === 0) {
        throw new Error('No notes to export');
    }

    // Create README
    const readme = [
        '# WOD Wiki Export',
        '',
        `Export Date: ${new Date().toISOString()}`,
        `Total Notes: ${entries.length}`,
        '',
        '## File Structure',
        '',
        'Each note is exported with the following files:',
        '- `{noteId}.md` - Markdown representation with metadata',
        '- `{noteId}_statements.csv` - Parsed code statements and fragments',
        '- `{noteId}_results.csv` - Workout results for all versions',
        '',
        '## Notes',
        '',
        ...entries.map(e => `- ${e.title} (${e.id})`),
    ].join('\n');

    zip.file('README.md', readme);

    // Add each note
    for (const entry of entries) {
        const noteId = entry.id.replace(/[^a-zA-Z0-9-_]/g, '_');

        // Add markdown file
        zip.file(`${noteId}.md`, noteToMarkdown(entry));

        // Add statements CSV
        zip.file(`${noteId}_statements.csv`, statementsToCSV(entry));

        // Add results CSV
        zip.file(`${noteId}_results.csv`, resultsToCSV(entry));
    }

    // Generate and download the ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `wod-wiki-export-${Date.now()}.zip`);
}

/**
 * Export a single note as a ZIP file
 */
export async function exportNote(entry: HistoryEntry): Promise<void> {
    const zip = new JSZip();
    const noteId = entry.id.replace(/[^a-zA-Z0-9-_]/g, '_');

    // Add markdown file
    zip.file(`${noteId}.md`, noteToMarkdown(entry));

    // Add statements CSV
    zip.file(`${noteId}_statements.csv`, statementsToCSV(entry));

    // Add results CSV
    zip.file(`${noteId}_results.csv`, resultsToCSV(entry));

    // Add README
    const readme = [
        `# ${entry.title}`,
        '',
        `Export Date: ${new Date().toISOString()}`,
        '',
        '## Files',
        '',
        `- \`${noteId}.md\` - Markdown representation with metadata`,
        `- \`${noteId}_statements.csv\` - Parsed code statements and fragments`,
        `- \`${noteId}_results.csv\` - Workout results`,
    ].join('\n');

    zip.file('README.md', readme);

    // Generate and download the ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `${entry.title.replace(/[^a-zA-Z0-9-_]/g, '_')}-${Date.now()}.zip`;
    downloadBlob(blob, filename);
}

// ──────────────────────────────────────────────────────────────
// Import Functions
// ──────────────────────────────────────────────────────────────

/**
 * Import notes from a ZIP file
 */
export async function importFromZip(
    file: File,
    provider: IContentProvider
): Promise<{ imported: number; errors: string[] }> {
    const zip = await JSZip.loadAsync(file);
    const errors: string[] = [];
    let imported = 0;

    // Find all markdown files
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

/**
 * Parse exported markdown back into an entry
 */
function parseMarkdownToEntry(markdown: string): Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> | null {
    try {
        // Extract metadata section
        const metadataMatch = markdown.match(/## Metadata\s+(.*?)\s+## Content/s);
        if (!metadataMatch) return null;

        const metadataLines = metadataMatch[1].split('\n').filter(line => line.trim());

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
        const tags = metadata['Tags'] && metadata['Tags'] !== 'None'
            ? metadata['Tags'].split(',').map(t => t.trim())
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
            result.clonedIds = metadata['Cloned To'].split(',').map(id => id.trim());
        }

        return result;
    } catch (err) {
        console.error('Failed to parse markdown:', err);
        return null;
    }
}

/**
 * Create a note from pasted markdown text
 */
export function createNoteFromMarkdown(markdown: string): Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'> {
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
        targetDate: Date.now(),
        sections: [],
    };
}

// ──────────────────────────────────────────────────────────────
// Utility Functions
// ──────────────────────────────────────────────────────────────

/**
 * Trigger a browser download for a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Trigger file picker and return selected file
 */
export function pickFile(accept: string = '*'): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = () => {
            const file = input.files?.[0];
            resolve(file ?? null);
        };
        input.oncancel = () => resolve(null);
        input.click();
    });
}
