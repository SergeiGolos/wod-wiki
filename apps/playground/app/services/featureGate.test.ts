import { describe, expect, it } from 'bun:test';
import { featureGate, canUseFeature, useOptionalAuth } from './featureGate';

describe('featureGate', () => {
  it('has a stable, explicit shape (reciprocity guardrail)', () => {
    // Snapshot the invariant: every entry declares requiresAuth, and every
    // auth-gated feature has a non-empty fallback (ADR-0010).
    expect(featureGate).toEqual({
      cloudSync: { requiresAuth: true, fallback: 'export-zip' },
      sharing: { requiresAuth: true, fallback: 'export-zip' },
      reviewGrid: { requiresAuth: false },
    });

    for (const [name, gate] of Object.entries(featureGate)) {
      if (gate.requiresAuth) {
        expect(gate.fallback, `${name} must declare a fallback`).toBeTruthy();
      }
    }
  });

  it('useOptionalAuth returns no user (no auth provider yet)', () => {
    expect(useOptionalAuth()).toEqual({ user: null });
  });

  it('free features are usable anonymously; gated features are not', () => {
    const anon = { user: null };
    expect(canUseFeature('reviewGrid', anon)).toBe(true);
    expect(canUseFeature('cloudSync', anon)).toBe(false);
    expect(canUseFeature('cloudSync', { user: { id: 'u1' } })).toBe(true);
  });
});
