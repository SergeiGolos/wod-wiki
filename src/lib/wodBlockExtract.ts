
export interface WodBlockExtract {
  /** Index-based ID, e.g. "block-0" */
  id: string;
  /** Nearest preceding heading, or "Block N" if none found */
  label: string;
  /** Fence dialect as found in the source (wod/log/plan/crossfit/amrap/emom/tabata). Use normalizeDialect() before inserting. */
  dialect: string;
  /** Inner content of the fenced block (trimmed) */
  content: string;
}


/** The editor only recognizes wod/log/plan as runnable WOD fence dialects. */
const EDITOR_DIALECTS = ['wod', 'log', 'plan'] as const;

/** Dialects this extractor recognises when reading source markdown. */
const WOD_DIALECTS = ['wod', 'log', 'plan', 'crossfit', 'amrap', 'emom', 'tabata'];

/** Map any extracted dialect to a dialect the editor will actually run. */
export function normalizeDialect(dialect: string): 'wod' | 'log' | 'plan' {
  const d = dialect.toLowerCase() as 'wod' | 'log' | 'plan';
  return (EDITOR_DIALECTS as readonly string[]).includes(d) ? d : 'wod';
}

/**
 * Parse raw markdown and extract all WOD fenced code blocks.
 * Recognised opening fences: ```wod, ```log, ```plan, ```crossfit, ```amrap, ```emom, ```tabata
 * (all normalised to an editor-supported dialect on insert via normalizeDialect).
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

      // Detect opening fence — allow optional trailing whitespace/info after dialect
      // e.g. ```wod, ```wod my-label, ```WOD
      const fenceOpen = line.match(/^```(\w+)(?:\s|$)/);
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
          id: `block-${blockIndex}`,
          label: lastHeading || `Block ${blockIndex + 1}`,
          dialect: fenceDialect,
          content: fenceLines.join('\n').trim(),
        });
        blockIndex++;
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
