import type { Section, SectionType, WodDialect } from '../types/section';
import type { WodBlock } from '../types';
import { detectWodBlocks } from './blockDetection';

/** Metadata regex: <!-- section-metadata id:UUID version:N created:TS --> */
const METADATA_REGEX = /<!--\s*section-metadata\s+id:(\S+)\s+version:(\d+)\s+created:(\d+)\s*-->/i;

export interface SectionMetadata {
  id: string;
  version: number;
  createdAt: number;
}

/**
 * Extract metadata from a string of text.
 * Returns the metadata and the text with metadata stripped.
 */
export function extractMetadata(text: string): { metadata: SectionMetadata | null; cleanText: string } {
  const match = text.match(METADATA_REGEX);
  if (!match) return { metadata: null, cleanText: text };

  return {
    metadata: {
      id: match[1],
      version: parseInt(match[2], 10),
      createdAt: parseInt(match[3], 10),
    },
    cleanText: text.replace(METADATA_REGEX, '').trim(),
  };
}

/**
 * Serialize metadata into an HTML comment.
 */
export function serializeMetadata(metadata: SectionMetadata): string {
  return `<!-- section-metadata id:${metadata.id} version:${metadata.version} created:${metadata.createdAt} -->`;
}

/**
 * Generate a deterministic section ID from type, startLine, and a content hash.
 * Stable across re-parses when structure doesn't change.
 */
function generateSectionId(type: SectionType, startLine: number, content: string): string {
  // Simple hash: sum of char codes modulo a large prime, hex-encoded
  let hash = 0;
  for (let i = 0; i < content.length && i < 64; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  }
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${type}-${startLine}-${hashHex}`;
}

/**
 * Detect the dialect from a WodBlock (fallback to 'wod').
 */
function blockDialect(block: WodBlock): WodDialect {
  return block.dialect ?? 'wod';
}

/**
 * Parse a markdown document into an ordered list of sections.
 *
 * Section model (simplified):
 *  - title:    First heading-like or text row becomes the title section.
 *  - markdown: All non-fenced text (headings, paragraphs, blanks) are
 *              grouped into contiguous markdown sections.
 *  - wod:      Each fenced dialect block (```wod / ```log / ```plan)
 *              becomes its own section with `dialect` set.
 * 
 * @param content - Full markdown content
 * @param wodBlocks - Pre-detected WOD blocks (optional; will be detected if omitted)
 * @returns Ordered array of Section objects
 */
export function parseDocumentSections(content: string, wodBlocks?: WodBlock[]): Section[] {
  if (!content) return [];

  const blocks = wodBlocks ?? detectWodBlocks(content);
  const lines = content.split('\n');
  const sections: Section[] = [];

  const now = Date.now();
  let currentLine = 0;
  let isFirstTextBlock = true;

  /** Helper: flush accumulated markdown lines into a section */
  function flushMarkdownLines(mdLines: string[], startLine: number) {
    if (mdLines.length === 0) return;

    const raw = mdLines.join('\n');
    const { metadata, cleanText } = extractMetadata(raw);
    const cleanLineCount = cleanText.split('\n').length;

    if (isFirstTextBlock) {
      // First text block → title section (renders as markdown, title extracted from first # line)
      isFirstTextBlock = false;

      sections.push({
        id: metadata?.id || generateSectionId('title', startLine, cleanText),
        type: 'title',
        rawContent: cleanText,
        displayContent: cleanText, // full markdown preserved — title extracted separately
        startLine,
        endLine: startLine + cleanLineCount - 1,
        lineCount: cleanLineCount,
        level: undefined,
        version: metadata?.version || 1,
        createdAt: metadata?.createdAt || now,
      });
    } else {
      sections.push({
        id: metadata?.id || generateSectionId('markdown', startLine, cleanText),
        type: 'markdown',
        rawContent: cleanText,
        displayContent: cleanText,
        startLine,
        endLine: startLine + cleanLineCount - 1,
        lineCount: cleanLineCount,
        version: metadata?.version || 1,
        createdAt: metadata?.createdAt || now,
      });
    }
  }

  // Accumulate markdown (non-wod) lines between wod blocks
  let mdBuffer: string[] = [];
  let mdBufferStart = 0;

  while (currentLine < lines.length) {
    // Check if current line is start of a WOD block
    const wodBlock = blocks.find(b => b.startLine === currentLine);

    if (wodBlock) {
      // Flush any accumulated markdown before this wod block
      flushMarkdownLines(mdBuffer, mdBufferStart);
      mdBuffer = [];

      // WOD section — includes fence lines
      const dialect = blockDialect(wodBlock);
      const { metadata, cleanText } = extractMetadata(wodBlock.content);
      const fenceTag = dialect;
      const cleanRawContent = `\`\`\`${fenceTag}\n${cleanText}\n\`\`\``;
      const cleanLineCount = cleanRawContent.split('\n').length;

      const sectionId = metadata?.id || generateSectionId('wod', wodBlock.startLine, cleanText);

      sections.push({
        id: sectionId,
        type: 'wod',
        dialect,
        rawContent: cleanRawContent,
        displayContent: cleanText,
        startLine: wodBlock.startLine,
        endLine: wodBlock.startLine + cleanLineCount - 1,
        lineCount: cleanLineCount,
        wodBlock: {
          ...wodBlock,
          id: sectionId, // Ensure WodBlock ID matches Section ID
          content: cleanText,
          dialect,
          version: metadata?.version || 1,
          createdAt: metadata?.createdAt || now,
        },
        version: metadata?.version || 1,
        createdAt: metadata?.createdAt || now,
      });

      currentLine = wodBlock.endLine + 1;
      mdBufferStart = currentLine;
      continue;
    }

    // Not a wod-block line — accumulate for markdown
    if (mdBuffer.length === 0) {
      mdBufferStart = currentLine;
    }
    mdBuffer.push(lines[currentLine]);
    currentLine++;
  }

  // Flush any trailing markdown
  flushMarkdownLines(mdBuffer, mdBufferStart);

  return sections;
}

/**
 * Rebuild the full rawContent from a section list.
 * This is the inverse of parseDocumentSections.
 * Skips soft-deleted sections.
 */
export function buildRawContent(sections: Section[]): string {
  return sections
    .filter(s => !s.deleted)
    .map(s => s.rawContent)
    .join('\n');
}

/**
 * Calculate the total line count from a section list (visible only).
 */
export function calculateTotalLines(sections: Section[]): number {
  const visible = sections.filter(s => !s.deleted);
  if (visible.length === 0) return 0;
  const last = visible[visible.length - 1];
  return last.endLine + 1;
}

/**
 * Match old section IDs to new sections after a re-parse.
 * Preserves IDs for structurally equivalent sections to avoid React key thrashing.
 */
export function matchSectionIds(oldSections: Section[], newSections: Section[]): Section[] {
  return newSections.map((newSec) => {
    // If new section already has a metadata ID from content, that wins
    const { metadata } = extractMetadata(newSec.rawContent);
    if (metadata) {
      const updated = { ...newSec, id: metadata.id, version: metadata.version, createdAt: metadata.createdAt };
      if (updated.wodBlock) {
        updated.wodBlock = { ...updated.wodBlock, id: metadata.id };
      }
      return updated;
    }

    // First try: exact match by type + startLine + content hash
    const exactMatch = oldSections.find(
      old => old.type === newSec.type && old.startLine === newSec.startLine && old.displayContent === newSec.displayContent
    );
    if (exactMatch) {
      const updated = { ...newSec, id: exactMatch.id, version: exactMatch.version, createdAt: exactMatch.createdAt };
      if (updated.wodBlock) {
        updated.wodBlock = { ...updated.wodBlock, id: exactMatch.id };
      }
      return updated;
    }

    // Second try: match by type + startLine only (content changed but position same)
    const positionMatch = oldSections.find(
      old => old.type === newSec.type && old.startLine === newSec.startLine
    );
    if (positionMatch) {
      const updated = { ...newSec, id: positionMatch.id, version: positionMatch.version, createdAt: positionMatch.createdAt };
      if (updated.wodBlock) {
        updated.wodBlock = { ...updated.wodBlock, id: positionMatch.id };
      }
      return updated;
    }

    // No match — keep new ID (which was generated in parseDocumentSections)
    return newSec;
  });
}
