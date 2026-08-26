/**
 * WqlSuffix — Unified WQL suffix parser and adapter (issue #870).
 *
 * Encapsulates suffix parsing order, regexes, depth-0 brace-aware splitting,
 * and AST extraction for all WQL suffix clauses:
 *   - Outer join: `where <joinClause>`
 *   - Display unit: `in <unit>` (analytics queries only — C2 de-overloaded `in`)
 *   - Rollup period: `.rollup(<size><unit>)`
 *   - Group-by: `by {<dims>}`
 *   - Time window: `last <n><unit>` or `from <YYYY-MM-DD> [to <YYYY-MM-DD>]`
 *     (C1 — one window per query, every family)
 */

export interface ParsedWqlRollupSuffix {
  size: number;
  unit: string;
  raw: string;
}

/** A window clause (C1): relative (`last 8w`) or civil-date range
 *  (`from 2026-01-01 [to 2026-03-31]`). One window per query — `last` and
 *  `from` are mutually exclusive (validated as a C3-style conflict). */
export type ParsedWqlWindowSuffix =
  | { kind: 'relative'; size: number; unit: 'd' | 'w'; raw: string }
  | { kind: 'range'; start: string; end?: string; raw: string };

export interface ParsedWqlSuffixes {
  /** Outer cross-store join clause text (`where ...`). */
  where?: string;
  /** Display unit directive (`in kg`). */
  displayUnit?: string;
  /** Rollup period (`.rollup(1w)`). */
  rollup?: ParsedWqlRollupSuffix;
  /** Group-by dimensions (`by {week, effort}`). */
  groupBy?: string[];
  /** Time window — relative or civil-date range, legal on every family (C1). */
  window?: ParsedWqlWindowSuffix;
  /** Legacy scope clause (`in journal` / `in all`) stripped for the C2 compatibility normalizer. */
  legacyScope?: string;
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
const FROM_TO_RE = /\s+from\s+(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?\s*$/i;
const IN_SCOPE_RE = /\s+in\s+(\w+)\s*$/;

/**
 * Extract suffixes from a raw WQL query string.
 * Strips outer join (`where`), display unit (`in kg`), rollup (`.rollup(1w)`),
 * group-by (`by {week}`), time window (`last 8w` / `from … [to …]`), and
 * legacy scope (`in journal`).
 */
export function parseWqlSuffixes(raw: string): ParsedWqlSuffixes {
  const { primary, where } = splitAtWhere(raw);
  let text = primary.trim();

  let displayUnit: string | undefined;
  let rollup: ParsedWqlRollupSuffix | undefined;
  let groupBy: string[] | undefined;
  let window: ParsedWqlWindowSuffix | undefined;
  let legacyScope: string | undefined;
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
    // Lockstep across six call sites: one conflict line naming both spans.
    if (ms.length > 1) {
      conflicts.push(
        `Duplicate '${label}' clause: '${ms[0][0].trim()}' conflicts with '${ms[ms.length - 1][0].trim()}'`,
      );
    }
  };

  // Window (C1) — one clause per query, every family. `from/to` strips
  // first (it is the rightmost window form when both appear), then `last`;
  // any second occurrence — same kind or cross-kind — is a C3 conflict.
  const froms = stripRepeated(FROM_TO_RE);
  const lasts = stripRepeated(LAST_RE);
  {
    const windows = [
      ...froms.map((m) => ({
        kind: 'range' as const,
        start: m[1],
        end: m[2],
        raw: m[0].trim(),
        at: m.index,
      })),
      ...lasts.map((m) => ({
        kind: 'relative' as const,
        size: parseInt(m[1], 10),
        unit: m[2].toLowerCase() as 'd' | 'w',
        raw: m[0].trim(),
        at: m.index,
      })),
    ].sort((a, b) => a.at - b.at);
    if (windows.length > 1) {
      conflicts.push(
        `Duplicate 'window' clause: '${windows[0].raw}' conflicts with '${windows[windows.length - 1].raw}'`,
      );
    }
    if (windows.length === 1) {
      const w = windows[0];
      window = w.kind === 'range' ? { kind: 'range', start: w.start, end: w.end, raw: w.raw } : { kind: 'relative', size: w.size, unit: w.unit, raw: w.raw };
    }
  }

  if (isFind || isRows) {
    // Content/rows families: legacy `in <scope>` stripped for the C2 compat
    // normalizer; aggregation suffixes on rows surface as loud errors
    // downstream — rows never aggregates.
    const scopes = stripRepeated(IN_SCOPE_RE);
    conflictFrom('scope', scopes);
    if (scopes.length) legacyScope = scopes[scopes.length - 1][1];

    if (isRows) {
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
    window,
    legacyScope,
    conflicts: conflicts.length ? conflicts : undefined,
    primaryText: text,
  };
}
