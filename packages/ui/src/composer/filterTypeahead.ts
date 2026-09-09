/**
 * filterTypeahead — matches free text typed into the WqlComposer's input
 * against the filter-clause vocabulary (queryClauses). While the user types
 * a filter key ('so', 'inten', 'eff'…) the composer proposes adding that
 * filter — or, when a pill of that type is already on the query, editing it.
 * Accept (Tab or tap) adds/activates the pill and opens its condition
 * editor; the composer owns candidates (source-plane allowlist, existing
 * pills, hidden types) and the accept behavior.
 *
 * Pure module: no React.
 */

export interface FilterTypeaheadCandidate {
  /** Clause type key, e.g. 'source' | 'effort' | 'catalog'. */
  type: string
  label: string
  /** Placeholder describing the condition, e.g. 'journal, notes, metrics…'. */
  hint: string
  icon: string
  /** True when a pill of this type is already on the query — accept edits it. */
  present: boolean
  /** Index of the existing pill when `present`. */
  pillIdx?: number
}

export interface FilterTypeaheadMatch extends FilterTypeaheadCandidate {}

/**
 * Match the typed text against candidate filter keys/labels: prefix match on
 * the type key first, then the display label; shorter keys rank first within
 * the same class. Mid-WQL text (whitespace, braces, or a `:` — the
 * composer's query/raw/invalid pending paths own that) proposes nothing.
 */
export function matchFilterTypeahead(
  freeText: string,
  candidates: FilterTypeaheadCandidate[],
): FilterTypeaheadMatch[] {
  const raw = freeText.trim();
  if (!raw) return [];
  if (/[\s:{}]/.test(raw)) return [];
  const needle = raw.toLowerCase();
  return candidates
    .filter(
      (c) =>
        c.type.toLowerCase().startsWith(needle) ||
        c.label.toLowerCase().startsWith(needle),
    )
    .sort((a, b) => rank(a, needle) - rank(b, needle));
}

function rank(c: FilterTypeaheadCandidate, needle: string): number {
  const typeHit = c.type.toLowerCase().startsWith(needle) ? 0 : 10;
  return typeHit + c.type.length;
}
