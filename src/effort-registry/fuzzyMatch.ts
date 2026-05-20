/**
 * Fuzzy Alias Matching — Levenshtein Distance
 *
 * Edit-distance based fuzzy matching for effort alias resolution.
 * Default threshold: ≤ 2 (configurable per instance).
 *
 * @see ADR-0008 Decision 4
 * @see PRD-EFFORT-REGISTRY FR4
 */

/**
 * Compute the Levenshtein edit distance between two strings.
 * Time: O(m × n), Space: O(min(m, n))
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure 'a' is the shorter string for space optimization
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const m = a.length;
  const n = b.length;

  // Early exit: if length difference exceeds threshold, we can still compute,
  // but callers typically short-circuit. Keep full correctness here.
  let prev = new Uint32Array(m + 1);
  let curr = new Uint32Array(m + 1);

  for (let i = 0; i <= m; i++) {
    prev[i] = i;
  }

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1,      // deletion
        curr[i - 1] + 1,  // insertion
        prev[i - 1] + cost // substitution
      );
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }

  return prev[m];
}

/**
 * Normalise a string for fuzzy comparison:
 * - lower-case
 * - trim whitespace
 * - collapse multiple spaces
 */
export function normalizeForFuzzy(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Check whether two strings are within a given edit-distance threshold.
 */
export function isWithinThreshold(a: string, b: string, threshold: number): boolean {
  const na = normalizeForFuzzy(a);
  const nb = normalizeForFuzzy(b);

  // Fast path: exact match
  if (na === nb) return true;

  // Fast path: length difference already exceeds threshold
  if (Math.abs(na.length - nb.length) > threshold) return false;

  return levenshteinDistance(na, nb) <= threshold;
}

/**
 * Score a fuzzy match candidate. Lower is better (0 = exact).
 */
export interface FuzzyCandidate {
  readonly target: string;
  readonly distance: number;
}

/**
 * Find the best fuzzy match for `query` among `candidates`.
 * Returns `null` if no candidate is within `threshold`.
 */
export function findBestFuzzyMatch(
  query: string,
  candidates: readonly string[],
  threshold: number
): FuzzyCandidate | null {
  const nq = normalizeForFuzzy(query);
  let best: FuzzyCandidate | null = null;

  for (const candidate of candidates) {
    const nc = normalizeForFuzzy(candidate);

    // Length-difference fast path
    if (Math.abs(nq.length - nc.length) > threshold) continue;

    const distance = levenshteinDistance(nq, nc);
    if (distance > threshold) continue;

    if (!best || distance < best.distance) {
      best = { target: candidate, distance };
      // Can't get better than exact
      if (distance === 0) break;
    }
  }

  return best;
}
