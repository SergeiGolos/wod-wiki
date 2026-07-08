/**
 * featureGate — the single source of truth for which features require auth.
 *
 * ADR-0010 (Reciprocity Guardrail): wod.wiki's competitive advantage is that
 * the entire playground works with no signup. That advantage is one careless
 * `useAuth()` import away from eroding. This module is the *only* sanctioned
 * path to authentication state.
 *
 * Rules (enforced by review, documented here):
 *  - No feature component may import an `useAuth()` hook directly. Consume
 *    `useOptionalAuth()` and consult `featureGate` first.
 *  - A PR that adds an auth dependency to package.json must also add at least
 *    one entry here with `requiresAuth: true` and a non-empty `fallback`.
 *  - Features that must stay free forever are recorded with
 *    `requiresAuth: false` so the intent is explicit, not implied by omission.
 */

export interface GatedFeature {
  /** Whether this feature needs a signed-in user to function. */
  requiresAuth: boolean;
  /** What the feature falls back to when there is no user. */
  fallback?: string;
}

/**
 * Static config. Changing it is a deploy, not a runtime state update — which
 * is why this is a module-level `const` and not a React context (see ADR-0010,
 * "Reject: Use useContext for featureGate").
 */
export const featureGate = {
  /** Cloud sync of playground content — the first plausibly-gated feature. */
  cloudSync: { requiresAuth: true, fallback: 'export-zip' },
  /** Sharing a workout via a link — currently export-zip until auth exists. */
  sharing: { requiresAuth: true, fallback: 'export-zip' },
  /** The review grid stays free forever. */
  reviewGrid: { requiresAuth: false },
} as const satisfies Record<string, GatedFeature>;

export type FeatureName = keyof typeof featureGate;

/** Minimal user shape. No auth provider exists yet, so this is forward-looking. */
export interface User {
  id: string;
}

export interface OptionalAuth {
  user: User | null;
}

/**
 * The sanctioned way for any feature to learn who (if anyone) the user is.
 *
 * There is no auth provider yet, so this always returns `{ user: null }`. When
 * auth is introduced, this is the single place that changes — every call site
 * already handles the null case because that's all this ever returned.
 */
export function useOptionalAuth(): OptionalAuth {
  return { user: null };
}

/**
 * Whether a feature can run for the current (possibly anonymous) user.
 * Free features always pass; gated features pass only with a user.
 */
export function canUseFeature(feature: FeatureName, auth: OptionalAuth): boolean {
  const gate = featureGate[feature];
  if (!gate.requiresAuth) return true;
  return auth.user !== null;
}
