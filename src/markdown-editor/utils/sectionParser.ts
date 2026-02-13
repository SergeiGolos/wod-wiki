import { v4 as uuidv4 } from 'uuid';
import type { Section, SectionType } from '../types/section';
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
 * Parse a markdown document into an ordered list of sections.
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

  while (currentLine < lines.length) {
    // Check if current line is start of a WOD block
    const wodBlock = blocks.find(b => b.startLine === currentLine);

    if (wodBlock) {
      // WOD section: includes fence lines (```wod through ```)
      const { metadata, cleanText } = extractMetadata(wodBlock.content);
      // Reconstruct rawContent without metadata: ```wod\n<clean content>\n```
      const cleanRawContent = `\`\`\`wod\n${cleanText}\n\`\`\``;
      const cleanLineCount = cleanRawContent.split('\n').length;

      sections.push({
        id: metadata?.id || generateSectionId('wod', wodBlock.startLine, cleanText),
        type: 'wod',
        rawContent: cleanRawContent,
        displayContent: cleanText,
        startLine: wodBlock.startLine,
        endLine: wodBlock.startLine + cleanLineCount - 1,
        lineCount: cleanLineCount,
        wodBlock: {
          ...wodBlock,
          id: metadata?.id || wodBlock.id,
          content: cleanText,
          version: metadata?.version || 1,
          createdAt: metadata?.createdAt || now,
        },
        version: metadata?.version || 1,
        createdAt: metadata?.createdAt || now,
      });

      currentLine = wodBlock.endLine + 1;
      continue;
    }

    const lineContent = lines[currentLine];
    const trimmedLine = lineContent.trim();

    // Empty line — attach to previous section as trailing whitespace
    if (trimmedLine === '') {
      if (sections.length > 0) {
        const prev = sections[sections.length - 1];
        prev.rawContent += '\n' + lineContent;
        prev.endLine = currentLine;
        prev.lineCount = prev.endLine - prev.startLine + 1;
      } else {
        const newId = uuidv4();
        sections.push({
          id: newId,
          type: 'empty',
          rawContent: lineContent,
          displayContent: '',
          startLine: currentLine,
          endLine: currentLine,
          lineCount: 1,
          version: 1,
          createdAt: now,
        });
      }
      currentLine++;
      continue;
    }

    // Check for headers
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const { metadata, cleanText } = extractMetadata(headerMatch[2]);
      // Reconstruct rawContent without metadata comment
      const cleanRawContent = `${headerMatch[1]} ${cleanText}`;

      sections.push({
        id: metadata?.id || generateSectionId('heading', currentLine, cleanText),
        type: 'heading',
        rawContent: cleanRawContent,
        displayContent: cleanText,
        startLine: currentLine,
        endLine: currentLine,
        lineCount: 1,
        level: headerMatch[1].length,
        version: metadata?.version || 1,
        createdAt: metadata?.createdAt || now,
      });
      currentLine++;
      continue;
    }

    // Paragraph: group consecutive non-empty, non-header, non-wod lines
    const paragraphStartLine = currentLine;
    const paragraphLines: string[] = [lineContent];

    let nextLine = currentLine + 1;
    while (nextLine < lines.length) {
      // Stop if next line is start of WOD block
      if (blocks.some(b => b.startLine === nextLine)) break;

      const nextLineContent = lines[nextLine];
      const nextTrimmed = nextLineContent.trim();

      // Stop if empty line (paragraph break)
      if (nextTrimmed === '') break;

      // Stop if header
      if (nextTrimmed.match(/^(#{1,6})\s+(.+)$/)) break;

      paragraphLines.push(nextLineContent);
      nextLine++;
    }

    const paragraphEndLine = nextLine - 1;
    const paragraphContent = paragraphLines.join('\n');
    const { metadata, cleanText } = extractMetadata(paragraphContent);
    // lineCount based on clean text (without metadata lines)
    const cleanLineCount = cleanText.split('\n').length;

    sections.push({
      id: metadata?.id || generateSectionId('paragraph', paragraphStartLine, cleanText),
      type: 'paragraph',
      rawContent: cleanText,
      displayContent: cleanText,
      startLine: paragraphStartLine,
      endLine: paragraphStartLine + cleanLineCount - 1,
      lineCount: cleanLineCount,
      version: metadata?.version || 1,
      createdAt: metadata?.createdAt || now,
    });

    currentLine = paragraphEndLine + 1;
  }

  return sections;
}

/**
 * Rebuild the full rawContent from a section list.
 * This is the inverse of parseDocumentSections. 
 * ensures that metadata comment is attached to the rawContent if present.
 */
export function buildRawContent(sections: Section[]): string {
  return sections.map(s => {
    // If it's a paragraph or heading, metadata is usually inside displayContent if we stripped it,
    // but we want it appended to the rawContent for persistence.
    // Actually, updateSectionContent will handle appending metadata to rawContent.
    // buildRawContent should simply join sections as they are.
    return s.rawContent;
  }).join('\n');
}

/**
 * Calculate the total line count from a section list.
 */
export function calculateTotalLines(sections: Section[]): number {
  if (sections.length === 0) return 0;
  const last = sections[sections.length - 1];
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
      return { ...newSec, id: metadata.id, version: metadata.version, createdAt: metadata.createdAt };
    }

    // First try: exact match by type + startLine + content hash
    const exactMatch = oldSections.find(
      old => old.type === newSec.type && old.startLine === newSec.startLine && old.displayContent === newSec.displayContent
    );
    if (exactMatch) {
      return { ...newSec, id: exactMatch.id, version: exactMatch.version, createdAt: exactMatch.createdAt };
    }

    // Second try: match by type + startLine only (content changed but position same)
    const positionMatch = oldSections.find(
      old => old.type === newSec.type && old.startLine === newSec.startLine
    );
    if (positionMatch) {
      return { ...newSec, id: positionMatch.id, version: positionMatch.version, createdAt: positionMatch.createdAt };
    }

    // No match — keep new ID (which was generated in parseDocumentSections)
    return newSec;
  });
}
