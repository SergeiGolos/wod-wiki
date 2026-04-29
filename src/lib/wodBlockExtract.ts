
export interface WodBlockExtract {
  /** Index-based ID, e.g. "block-0" */
  id: string;
  /** Nearest preceding heading, or "Block N" if none found */
  label: string;
  /** Fence dialect: "wod", "crossfit", "amrap", "emom", "tabata" */
  dialect: string;
  /** Inner content of the fenced block (trimmed) */
  content: string;
}

const WOD_DIALECTS = ['wod', 'crossfit', 'amrap', 'emom', 'tabata'];

/**
 * Parse raw markdown and extract all WOD fenced code blocks.
 * Supports dialects: wod, crossfit, amrap, emom, tabata.
 */
export function extractWodBlocks(markdown: string): WodBlockExtract[] {
  const lines = markdown.split('\n');
  const blocks: WodBlockExtract[] = [];
  let lastHeading = '';
  let inFence = false;
  let fenceDialect = '';
  let fenceLines: string[] = [];
  let blockIndex = 0;

  for (const line of lines) {
    if (!inFence) {
      // Track the last heading we saw
      const headingMatch = line.match(/^#{1,6}\s+(.+)/);
      if (headingMatch) {
        lastHeading = headingMatch[1].trim();
        continue;
      }

      // Detect opening fence
      const fenceOpen = line.match(/^```(\w+)\s*$/);
      if (fenceOpen && WOD_DIALECTS.includes(fenceOpen[1].toLowerCase())) {
        inFence = true;
        fenceDialect = fenceOpen[1].toLowerCase();
        fenceLines = [];
        continue;
      }
    } else {
      // Detect closing fence
      if (line.trim() === '```') {
        blocks.push({
          id: `block-${blockIndex++}`,
          label: lastHeading || `Block ${blockIndex}`,
          dialect: fenceDialect,
          content: fenceLines.join('\n').trim(),
        });
        inFence = false;
        fenceDialect = '';
        fenceLines = [];
      } else {
        fenceLines.push(line);
      }
    }
  }

  return blocks;
}
