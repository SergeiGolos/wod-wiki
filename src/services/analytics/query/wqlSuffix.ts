/**
 * WqlSuffix — Unified WQL suffix parser and adapter (issue #870).
 *
 * Encapsulates suffix parsing order, regexes, depth-0 brace-aware splitting,
 * and AST extraction for all WQL suffix clauses:
 *   - Outer join: `where <joinClause>`
 *   - Display unit: `in <unit>`
 *   - Rollup period: `.rollup(<size><unit>)`
 *   - Group-by: `by {<dims>}`
 *   - Time window: `last <n><unit>`
 *   - Scope: `in <scope>`
 *
 * Consumed by wql.ts (parseQuery), queryClauses.ts (wqlToClauses AST mapper),
 * and CM6 / editor tools.
 */

export interface ParsedWqlRollupSuffix {
  size: number;
  unit: string;
  raw: string;
}

export interface ParsedWqlLastSuffix {
  size: number;
  unit: 'd' | 'w';
  raw: string;
}

export interface ParsedWqlSuffixes {
  /** Outer cross-store join clause text (`where ...`). */
  where?: string;
  /** Display unit directive (`in kg`). */
  displayUnit?: string;
  /** Rollup period (`.rollup(1w)`). */
  rollup?: ParsedWqlRollupSuffix;
  /** Group-by dimensions (`by {week, effort}`). */
  groupBy?: string[];
  /** Content time window (`last 8w`). */
  last?: ParsedWqlLastSuffix;
  /** Content scope (`in journal` / `in all`). */
  scope?: string;
  /** Primary query text with suffixes removed. */
  primaryText: string;
}

/**
 * Split a query at the first top-level `where` keyword (depth-0, word-bounded).
 * Returns the primary half and, when present, the join clause text.
 */
export function splitAtWhere(text: string): { primary: string; where?: string } {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
    else if (
      depth === 0 &&
      c === 'w' &&
      text.slice(i, i + 5) === 'where' &&
      (i === 0 || /\s/.test(text[i - 1])) &&
      (i + 5 >= text.length || /\s/.test(text[i + 5]))
    ) {
      return { primary: text.slice(0, i).trim(), where: text.slice(i + 5).trim() };
    }
  }
  return { primary: text.trim() };
}

const DISPLAY_UNIT_RE = /\s+in\s+([a-zA-Z0-9_-]+)\s*$/;
const ROLLUP_RE = /\.rollup\((\d+)?([a-zA-Z]*)\)\s*$/;
const BY_RE = /\s+by\s+\{([^}]*)\}\s*$/;
const LAST_RE = /\s+last\s+(\d+)([dw])\s*$/i;
const IN_SCOPE_RE = /\s+in\s+(\w+)\s*$/;

/**
 * Extract suffixes from a raw WQL query string.
 * Strips outer join (`where`), display unit (`in kg`), rollup (`.rollup(1w)`),
 * group-by (`by {week}`), time window (`last 8w`), and scope (`in journal`).
 */
export function parseWqlSuffixes(raw: string): ParsedWqlSuffixes {
  const { primary, where } = splitAtWhere(raw);
  let text = primary.trim();

  let displayUnit: string | undefined;
  let rollup: ParsedWqlRollupSuffix | undefined;
  let groupBy: string[] | undefined;
  let last: ParsedWqlLastSuffix | undefined;
  let scope: string | undefined;

  const isFind = text.startsWith('find:');

  if (isFind) {
    // Content find queries strip `last <n><unit>` then `in <scope>`
    const lastMatch = LAST_RE.exec(text);
    if (lastMatch) {
      last = {
        size: parseInt(lastMatch[1], 10),
        unit: lastMatch[2].toLowerCase() as 'd' | 'w',
        raw: lastMatch[0].trim(),
      };
      text = text.slice(0, lastMatch.index).trim();
    }

    const scopeMatch = IN_SCOPE_RE.exec(text);
    if (scopeMatch) {
      scope = scopeMatch[1];
      text = text.slice(0, scopeMatch.index).trim();
    }
  } else {
    // Analytics queries strip `in <unit>`, `.rollup(<period>)`, `by {<dims>}`
    const unitMatch = DISPLAY_UNIT_RE.exec(text);
    if (unitMatch) {
      displayUnit = unitMatch[1];
      text = text.slice(0, unitMatch.index).trim();
    }

    const rollupMatch = ROLLUP_RE.exec(text);
    if (rollupMatch) {
      const rawRollup = rollupMatch[1] + rollupMatch[2];
      const size = rollupMatch[1] ? parseInt(rollupMatch[1], 10) : 1;
      const unit = rollupMatch[2] || '';
      rollup = { size, unit, raw: rawRollup };
      text = text.slice(0, rollupMatch.index).trim();
    }

    const byMatch = BY_RE.exec(text);
    if (byMatch) {
      groupBy = byMatch[1]
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      text = text.slice(0, byMatch.index).trim();
    }
  }

  return {
    where,
    displayUnit,
    rollup,
    groupBy,
    last,
    scope,
    primaryText: text,
  };
}
