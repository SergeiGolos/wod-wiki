import type { Section, SectionType, WodDialect, FrontMatterSubtype } from '../types/section';
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
 * Detect front matter blocks delimited by `---` lines.
 * Returns an array of { startLine, endLine } ranges (0-indexed, inclusive).
 */
interface FrontMatterRange {
  startLine: number;
  endLine: number;
}

function detectFrontMatterBlocks(lines: string[], wodBlocks: WodBlock[]): FrontMatterRange[] {
  const ranges: FrontMatterRange[] = [];
  let i = 0;

  while (i < lines.length) {
    // Skip lines that are inside a WOD block
    const inWod = wodBlocks.some(b => i >= b.startLine && i <= b.endLine);
    if (inWod) { i++; continue; }

    if (lines[i].trim() === '---') {
      const openLine = i;
      // Look for closing ---
      let j = i + 1;
      while (j < lines.length) {
        const inWodInner = wodBlocks.some(b => j >= b.startLine && j <= b.endLine);
        if (inWodInner) { j++; continue; }
        if (lines[j].trim() === '---') {
          ranges.push({ startLine: openLine, endLine: j });
          i = j + 1;
          break;
        }
        j++;
      }
      if (j >= lines.length) {
        // Unclosed --- block, skip
        i++;
      }
    } else {
      i++;
    }
  }
  return ranges;
}

/**
 * Parse YAML-like key: value pairs from front matter lines.
 */
export function parseFrontMatterProperties(innerLines: string[]): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of innerLines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      props[match[1].trim()] = match[2].trim();
    }
  }
  return props;
}

/**
 * Determine the front matter subtype from its properties.
 */
export function resolveFrontMatterSubtype(props: Record<string, string>): FrontMatterSubtype {
  const typeValue = (props['type'] || '').toLowerCase();
  if (typeValue === 'youtube') return 'youtube';
  if (typeValue === 'strava') return 'strava';
  if (typeValue === 'amazon') return 'amazon';
  if (typeValue === 'file') return 'file';

  // Auto-detect from url patterns
  const url = props['url'] || props['link'] || '';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/strava\.com/i.test(url)) return 'strava';
  if (/amazon\.com|amzn\.to/i.test(url)) return 'amazon';

  return 'default';
}

/**
 * Detect single-line Markdown embeds: ![label](url) or [label](url).
 */
function matchMarkdownEmbed(trimmed: string) {
  // Pattern: Optional ! for image, then [label](url)
  const match = trimmed.match(/^(!)?\[([^\]]*)\]\(([^)]+)\)$/);
  if (!match) return null;

  const isImage = !!match[1];
  const label = match[2];
  const url = match[3];

  let type: 'image' | 'link' | 'youtube' = isImage ? 'image' : 'link';
  if (/youtube\.com|youtu\.be/i.test(url)) {
    type = 'youtube';
  }

  return { type, label, url, isImage };
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
 *  - embed:    Single-line markdown links/images ![label](url) or [label](url).
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
  const fmRanges = detectFrontMatterBlocks(lines, blocks);

  const now = Date.now();
  let currentLine = 0;
  let isFirstTextBlock = true;

  /** Helper: flush accumulated markdown lines into a section */
  function flushMarkdownLines(mdLines: string[], startLine: number) {
    if (mdLines.length === 0) return;

    // Split accumulated markdown at blank-line boundaries
    let currentGroup: string[] = [];
    let groupStartLine = startLine;

    for (let i = 0; i <= mdLines.length; i++) {
      const isEnd = i === mdLines.length;
      const line = !isEnd ? mdLines[i] : null;
      const isBlank = line !== null && line.trim().length === 0;

      if (isEnd || isBlank) {
        // Flush current group
        if (currentGroup.length > 0) {
          const raw = currentGroup.join('\n');
          const { metadata, cleanText } = extractMetadata(raw);
          const trimmed = cleanText.trim();
          
          // Check for single-line embed
          const embed = currentGroup.length === 1 ? matchMarkdownEmbed(trimmed) : null;

          if (embed) {
            sections.push({
              id: metadata?.id || generateSectionId('embed', groupStartLine, trimmed),
              type: 'embed',
              rawContent: cleanText,
              displayContent: cleanText,
              startLine: groupStartLine,
              endLine: groupStartLine,
              lineCount: 1,
              embed,
              version: metadata?.version || 1,
              createdAt: metadata?.createdAt || now,
            });
          } else if (isFirstTextBlock) {
            isFirstTextBlock = false;
            sections.push({
              id: metadata?.id || generateSectionId('title', groupStartLine, cleanText),
              type: 'title',
              rawContent: cleanText,
              displayContent: cleanText,
              startLine: groupStartLine,
              endLine: groupStartLine + currentGroup.length - 1,
              lineCount: currentGroup.length,
              version: metadata?.version || 1,
              createdAt: metadata?.createdAt || now,
            });
          } else {
            sections.push({
              id: metadata?.id || generateSectionId('markdown', groupStartLine, cleanText),
              type: 'markdown',
              rawContent: cleanText,
              displayContent: cleanText,
              startLine: groupStartLine,
              endLine: groupStartLine + currentGroup.length - 1,
              lineCount: currentGroup.length,
              version: metadata?.version || 1,
              createdAt: metadata?.createdAt || now,
            });
          }
        }

        // Blank line itself (if not at end)
        if (isBlank) {
          sections.push({
            id: generateSectionId('markdown', startLine + i, ''),
            type: 'markdown',
            rawContent: '',
            displayContent: '',
            startLine: startLine + i,
            endLine: startLine + i,
            lineCount: 1,
            version: 1,
            createdAt: now,
          });
        }

        currentGroup = [];
        groupStartLine = startLine + i + 1;
      } else {
        currentGroup.push(line!);
      }
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

    // Check if current line is start of a front matter block
    const fmRange = fmRanges.find(r => r.startLine === currentLine);

    if (fmRange) {
      // Flush any accumulated markdown before this front matter block
      flushMarkdownLines(mdBuffer, mdBufferStart);
      mdBuffer = [];

      const rawLines = lines.slice(fmRange.startLine, fmRange.endLine + 1);
      const raw = rawLines.join('\n');
      const innerLines = lines.slice(fmRange.startLine + 1, fmRange.endLine);
      const { metadata, cleanText } = extractMetadata(innerLines.join('\n'));
      const properties = parseFrontMatterProperties(cleanText.split('\n'));
      const subtype = resolveFrontMatterSubtype(properties);
      const lineCount = fmRange.endLine - fmRange.startLine + 1;

      sections.push({
        id: metadata?.id || generateSectionId('frontmatter', fmRange.startLine, raw),
        type: 'frontmatter',
        rawContent: raw,
        displayContent: cleanText,
        startLine: fmRange.startLine,
        endLine: fmRange.endLine,
        lineCount,
        properties,
        frontmatterType: subtype,
        version: metadata?.version || 1,
        createdAt: metadata?.createdAt || now,
      });

      currentLine = fmRange.endLine + 1;
      mdBufferStart = currentLine;
      continue;
    }

    // Not a wod-block or front-matter line — accumulate for markdown
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
      // Content changed, so bump version
      const newVersion = (positionMatch.version || 1) + 1;
      const updated = {
        ...newSec,
        id: positionMatch.id,
        version: newVersion,
        createdAt: positionMatch.createdAt
      };
      if (updated.wodBlock) {
        updated.wodBlock = { ...updated.wodBlock, id: positionMatch.id, version: newVersion };
      }
      return updated;
    }

    // No match — keep new ID (which was generated in parseDocumentSections)
    return newSec;
  });
}
