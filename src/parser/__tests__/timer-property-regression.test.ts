/**
 * Regression tests for the /run runtime-init hang (#699).
 *
 * Root cause: a line like `Timer: 1:00` double-parsed as a failed Property
 * (grammar leaves a ⚠ error node) plus a Block reparse of the value. Both
 * statements got the same line-number id, and the nesting pass made the
 * Block its own parent through the duplicate id — so id-walking consumers
 * (OutputEmitter.emitLoad's depth walk) looped forever and the runtime
 * never initialized.
 *
 * Fix: extractSyntaxFacts drops a Property statement when the parser's own
 * error node immediately follows it; emitLoad's depth walk has a visited-set
 * cycle guard as defense-in-depth.
 */

import { test, expect, describe } from 'bun:test';
import { createParser } from '@/parser/parserInstance';

describe('failed Property lines reparse as workout statements (#699)', () => {
  test('Timer: 1:00 yields exactly one statement — no duplicate line ids', () => {
    const { statements } = createParser().read('Timer: 1:00');
    expect(statements).toHaveLength(1);
    expect(statements[0]!.parent).toBeUndefined();
  });

  test('Timer: 1:00\\n10 Burpees yields two sibling statements', () => {
    const { statements } = createParser().read('Timer: 1:00\n10 Burpees');
    expect(statements).toHaveLength(2);
    expect(new Set(statements.map((s) => s.id)).size).toBe(statements.length);
    for (const s of statements) {
      expect(s.parent).not.toBe(s.id); // no statement may be its own parent
    }
  });

  test('Rest: 0:30 (also a failed property) yields one statement', () => {
    const { statements } = createParser().read('Rest: 0:30');
    expect(statements).toHaveLength(1);
  });

  test('legit properties still parse as property statements', () => {
    for (const script of ['met: 7', 'slug: rowing', 'label: Fran']) {
      const { statements } = createParser().read(script);
      expect(statements).toHaveLength(1);
      expect(statements[0]!.metrics.length).toBeGreaterThan(0);
    }
  });

  test('no statement in any of these scripts is its own ancestor', () => {
    for (const script of ['Timer: 1:00', 'Rest: 0:30', '(2)\n  5 Burpees\n  10 Squats']) {
      const { statements } = createParser().read(script);
      const byId = new Map(statements.map((s) => [s.id, s]));
      for (const s of statements) {
        const seen = new Set<number>();
        let parentId = s.parent;
        while (parentId !== undefined) {
          expect(seen.has(parentId)).toBe(false); // cycle = regression
          seen.add(parentId);
          parentId = byId.get(parentId)?.parent;
        }
      }
    }
  });
});
