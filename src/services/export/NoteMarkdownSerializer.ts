import type { INowProvider } from '@/runtime/INowProvider';
import type { HistoryEntry } from '@/types/history';

export function noteToMarkdown(entry: HistoryEntry, clock?: INowProvider): string {
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
