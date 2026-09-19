import { blockContentId } from '../models/blockContentId';
import type {
  FenceDialect,
  FrontMatterSubtype,
  ScriptBlock,
  Section,
  SectionType,
} from '../types/section';
import { detectScriptBlocks } from './blockDetection';

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
 * Generate a deterministic section ID from type, startLine (0-indexed), and a content hash.
 * Stable across re-parses when structure doesn't change.
 */
export function generateSectionId(type: SectionType | string, startLine: number, content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length && i < 64; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  }
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${type}-${startLine}-${hashHex}`;
}

export { blockContentId };

export function detectUrlSubtype(url: string): FrontMatterSubtype | null {
  if (!url) return null;
  const withoutScheme = url.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const host = withoutScheme.split(/[/?#:]/, 1)[0].toLowerCase();
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return 'youtube';
  if (host === 'strava.com' || host.endsWith('.strava.com')) return 'strava';
  if (host === 'amazon.com' || host.endsWith('.amazon.com') || host === 'amzn.to') return 'amazon';
  return null;
}

export function resolveFrontMatterSubtype(props: Record<string, string>): FrontMatterSubtype {
  const typeValue = (props['type'] || '').toLowerCase();
  if (typeValue === 'youtube') return 'youtube';
  if (typeValue === 'strava') return 'strava';
  if (typeValue === 'amazon') return 'amazon';
  if (typeValue === 'file') return 'file';
  if (typeValue === 'effort') return 'effort';

  const url = props['url'] || props['link'] || '';
  if (url) {
    const detected = detectUrlSubtype(url);
    if (detected) return detected;
  }

  if (
    props['baseAttributes'] !== undefined ||
    props['discipline'] !== undefined ||
    props['effortType'] !== undefined ||
    props['targetRPE'] !== undefined ||
    props['equipment'] !== undefined ||
    props['aliases'] !== undefined ||
    props['derivation'] !== undefined
  ) {
    return 'effort';
  }

  return 'default';
}

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

export function matchMarkdownEmbed(trimmed: string): {
  type: 'image' | 'link' | 'youtube';
  label: string;
  url: string;
  isImage: boolean;
} | null {
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

interface FrontMatterRange {
  startLine: number;
  endLine: number;
}

function detectFrontMatterBlocks(lines: string[], scriptBlocks: ScriptBlock[]): FrontMatterRange[] {
  const ranges: FrontMatterRange[] = [];
  let i = 0;

  while (i < lines.length) {
    const inScript = scriptBlocks.some((b) => i >= b.startLine && i <= b.endLine);
    if (inScript) {
      i++;
      continue;
    }

    if (lines[i].trim() === '---') {
      const openLine = i;
      let j = i + 1;
      while (j < lines.length) {
        const inScriptInner = scriptBlocks.some((b) => j >= b.startLine && j <= b.endLine);
        if (inScriptInner) {
          j++;
          continue;
        }
        if (lines[j].trim() === '---') {
          ranges.push({ startLine: openLine, endLine: j });
          i = j + 1;
          break;
        }
        j++;
      }
      if (j >= lines.length) {
        i++;
      }
    } else {
      i++;
    }
  }
  return ranges;
}

export function parseDocumentSections(content: string, scriptBlocks?: ScriptBlock[]): Section[] {
  if (!content) return [];

  const blocks = scriptBlocks ?? detectScriptBlocks(content);
  const lines = content.split('\n');
  const sections: Section[] = [];
  const fmRanges = detectFrontMatterBlocks(lines, blocks);

  const now = Date.now();
  let currentLine = 0;
  let isFirstTextBlock = true;

  function flushMarkdownLines(mdLines: string[], startLine: number) {
    if (mdLines.length === 0) return;

    let currentGroup: string[] = [];
    let groupStartLine = startLine;

    const flushGroup = () => {
      if (currentGroup.length > 0) {
        const raw = currentGroup.join('\n');
        const { metadata, cleanText } = extractMetadata(raw);
        const trimmed = cleanText.trim();
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
      currentGroup = [];
    };

    for (let i = 0; i < mdLines.length; i++) {
      const line = mdLines[i];
      if (line.trim().length === 0) {
        flushGroup();
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
        groupStartLine = startLine + i + 1;
      } else {
        currentGroup.push(line);
      }
    }

    flushGroup();
  }

  let mdBuffer: string[] = [];
  let mdBufferStart = 0;

  while (currentLine < lines.length) {
    const scriptBlock = blocks.find((b) => b.startLine === currentLine);

    if (scriptBlock) {
      flushMarkdownLines(mdBuffer, mdBufferStart);
      mdBuffer = [];

      const dialect: FenceDialect = scriptBlock.dialect ?? 'time';
      const { metadata, cleanText } = extractMetadata(scriptBlock.content);
      const fenceTag = scriptBlock.sport ? `${dialect}:${scriptBlock.sport}` : dialect;
      const cleanRawContent = `\`\`\`${fenceTag}\n${cleanText}\n\`\`\``;
      const cleanLineCount = cleanRawContent.split('\n').length;

      const sectionId = metadata?.id || generateSectionId(dialect, scriptBlock.startLine, cleanText);
      const contentId = blockContentId(cleanText);

      sections.push({
        id: sectionId,
        contentId,
        type: dialect,
        sport: scriptBlock.sport,
        rawContent: cleanRawContent,
        displayContent: cleanText,
        startLine: scriptBlock.startLine,
        endLine: scriptBlock.startLine + cleanLineCount - 1,
        lineCount: cleanLineCount,
        scriptBlock: {
          ...scriptBlock,
          id: sectionId,
          contentId,
          content: cleanText,
          dialect,
          version: metadata?.version || 1,
          createdAt: metadata?.createdAt || now,
        },
        version: metadata?.version || 1,
        createdAt: metadata?.createdAt || now,
      });

      currentLine = scriptBlock.endLine + 1;
      mdBufferStart = currentLine;
      continue;
    }

    const fmRange = fmRanges.find((r) => r.startLine === currentLine);

    if (fmRange) {
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

    if (mdBuffer.length === 0) {
      mdBufferStart = currentLine;
    }
    mdBuffer.push(lines[currentLine]);
    currentLine++;
  }

  flushMarkdownLines(mdBuffer, mdBufferStart);

  return sections;
}

export function buildRawContent(sections: Section[]): string {
  return sections
    .filter((s) => !s.deleted)
    .map((s) => s.rawContent)
    .join('\n');
}

export function calculateTotalLines(sections: Section[]): number {
  const visible = sections.filter((s) => !s.deleted);
  if (visible.length === 0) return 0;
  const last = visible[visible.length - 1];
  return last.endLine + 1;
}

export function matchSectionIds(oldSections: Section[], newSections: Section[]): Section[] {
  return newSections.map((newSec) => {
    const { metadata } = extractMetadata(newSec.rawContent);
    if (metadata) {
      const updated = { ...newSec, id: metadata.id, version: metadata.version, createdAt: metadata.createdAt };
      if (updated.scriptBlock) {
        updated.scriptBlock = { ...updated.scriptBlock, id: metadata.id };
      }
      return updated;
    }

    const exactMatch = oldSections.find(
      (old) =>
        old.type === newSec.type &&
        old.startLine === newSec.startLine &&
        old.displayContent === newSec.displayContent
    );
    if (exactMatch) {
      const updated = { ...newSec, id: exactMatch.id, version: exactMatch.version, createdAt: exactMatch.createdAt };
      if (updated.scriptBlock) {
        updated.scriptBlock = { ...updated.scriptBlock, id: exactMatch.id };
      }
      return updated;
    }

    const positionMatch = oldSections.find(
      (old) => old.type === newSec.type && old.startLine === newSec.startLine
    );
    if (positionMatch) {
      const newVersion = (positionMatch.version || 1) + 1;
      const updated = {
        ...newSec,
        id: positionMatch.id,
        version: newVersion,
        createdAt: positionMatch.createdAt,
      };
      if (updated.scriptBlock) {
        updated.scriptBlock = { ...updated.scriptBlock, id: positionMatch.id, version: newVersion };
      }
      return updated;
    }

    return newSec;
  });
}
