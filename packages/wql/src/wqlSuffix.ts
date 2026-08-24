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
  /** Duplicate-clause diagnostics (C3) — each names both conflicting spans. */
  conflicts?: string[];
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
  const conflicts: string[] = [];

  const isFind = text.startsWith('find:');
  const isRows = /^rows(?=[:{]|\s|$)/.test(text);

  // C3: a suffix kind may appear once. Each peel site strips its kind until
  // exhausted (right-to-left); more than one occurrence becomes a conflict
  // naming the first and last occurrences instead of silent rightmost-wins.
  // A duplicate hidden behind a different leftover kind still fails through
  // the normal cannot-parse path — single-occurrence parsing is unchanged.
  const stripRepeated = (re: RegExp): RegExpExecArray[] => {
    const matches: RegExpExecArray[] = [];
    for (let m = re.exec(text); m; m = re.exec(text)) {
      matches.unshift(m);
      text = text.slice(0, m.index).trim();
    }
    return matches;
  };
  const conflictFrom = (label: string, ms: RegExpExecArray[]) => {
    // Lockstep across five call sites: one conflict line naming both spans.
    if (ms.length > 1) {
      conflicts.push(
        `Duplicate '${label}' clause: '${ms[0][0].trim()}' conflicts with '${ms[ms.length - 1][0].trim()}'`,
      );
    }
  };

  if (isFind || isRows) {
    // Content find queries strip `last <n><unit>` then `in <scope>`;
    // rows queries (#949) strip `last` plus the aggregation suffixes
    // (surfaced as loud errors downstream — rows never aggregates).
    const lasts = stripRepeated(LAST_RE);
    conflictFrom('window', lasts);
    if (lasts.length) {
      const m = lasts[lasts.length - 1];
      last = { size: parseInt(m[1], 10), unit: m[2].toLowerCase() as 'd' | 'w', raw: m[0].trim() };
    }

    if (isFind) {
      const scopes = stripRepeated(IN_SCOPE_RE);
      conflictFrom('scope', scopes);
      if (scopes.length) scope = scopes[scopes.length - 1][1];
    } else {
      const rollups = stripRepeated(ROLLUP_RE);
      conflictFrom('.rollup', rollups);
      if (rollups.length) {
        const m = rollups[rollups.length - 1];
        rollup = { size: m[1] ? parseInt(m[1], 10) : 1, unit: m[2] || '', raw: m[1] + m[2] };
      }
      const bys = stripRepeated(BY_RE);
      conflictFrom('by', bys);
      if (bys.length) {
        groupBy = bys[bys.length - 1][1].split(',').map((d) => d.trim()).filter(Boolean);
      }
    }
  } else {
    // Analytics queries strip `in <unit>`, `.rollup(<period>)`, `by {<dims>}`
    const units = stripRepeated(DISPLAY_UNIT_RE);
    conflictFrom('display-unit', units);
    if (units.length) displayUnit = units[units.length - 1][1];

    const rollups = stripRepeated(ROLLUP_RE);
    conflictFrom('.rollup', rollups);
    if (rollups.length) {
      const m = rollups[rollups.length - 1];
      rollup = { size: m[1] ? parseInt(m[1], 10) : 1, unit: m[2] || '', raw: m[1] + m[2] };
    }

    const bys = stripRepeated(BY_RE);
    conflictFrom('by', bys);
    if (bys.length) {
      groupBy = bys[bys.length - 1][1]
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
    }
  }

  return {
    where,
    displayUnit,
    rollup,
    groupBy,
    last,
    scope,
    conflicts: conflicts.length ? conflicts : undefined,
    primaryText: text,
  };
}
