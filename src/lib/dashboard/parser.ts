import { parseFrontmatter } from '../frontmatter';
import { parseQueryWidgetSuffix, type DashboardSectionInput, type DashboardMeta } from './model';

export interface DashboardParsedSection extends DashboardSectionInput {
  /** 0-indexed start line of the section in the raw content. */
  startLine: number;
  /** 0-indexed inclusive end line of the section in the raw content. */
  endLine: number;
}

/**
 * Parses a raw markdown note into sections suitable for `buildDashboardDocument`,
 * keeping track of line numbers so edits can write back to the source text.
 */
export function parseDashboardNote(rawContent: string): { meta: DashboardMeta; sections: DashboardParsedSection[] } {
  const { meta } = parseFrontmatter(rawContent);
  const lines = rawContent.split(/\r?\n/);
  const sections: DashboardParsedSection[] = [];

  // Find where the body starts (skip frontmatter)
  let i = 0;
  if (lines.length > 0 && lines[0].trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') {
      i++;
    }
    i++; // skip the closing ---
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Query block
    if (trimmed.startsWith('```query')) {
      const tag = trimmed.slice(3).split(/[\s\t]/)[0].toLowerCase();
      let widgetType;
      let spanCols;
      let spanFull;
      let widgetError;

      if (tag.startsWith('query:')) {
        const spec = parseQueryWidgetSuffix(tag.slice('query:'.length));
        widgetType = spec.type || undefined;
        spanCols = spec.spanCols;
        spanFull = spec.spanFull;
        widgetError = spec.error;
      }

      const startLine = i;
      i++;
      const bodyLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        bodyLines.push(lines[i]);
        i++;
      }
      const endLine = i; // The closing ``` line

      sections.push({
        type: 'query',
        content: bodyLines.join('\n'),
        widgetType,
        spanCols,
        spanFull,
        widgetError,
        startLine,
        endLine,
      });
      i++;
      continue;
    }

    // Heading
    if (trimmed.startsWith('#')) {
      sections.push({
        type: 'markdown',
        subtype: 'heading',
        content: trimmed,
        startLine: i,
        endLine: i,
      });
      i++;
      continue;
    }

    // Paragraph (contiguous non-empty, non-heading, non-fence lines)
    if (trimmed !== '') {
      const startLine = i;
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].trim().startsWith('#') &&
        !lines[i].trim().startsWith('```')
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      sections.push({
        type: 'markdown',
        subtype: 'paragraph',
        content: paraLines.join('\n'),
        startLine,
        endLine: i - 1,
      });
      continue;
    }

    // Blank lines
    i++;
  }

  return { meta, sections };
}
