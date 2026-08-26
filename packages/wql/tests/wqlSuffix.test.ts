import { describe, expect, it } from 'vitest';
import { parseWqlSuffixes, splitAtWhere } from '../src/wqlSuffix';

describe('wqlSuffix', () => {
  describe('splitAtWhere', () => {
    it('splits at depth-0 where keyword', () => {
      expect(splitAtWhere('sum:totalVolume{} where find:note{tags:me}')).toEqual({
        primary: 'sum:totalVolume{}',
        where: 'find:note{tags:me}',
      });
    });

    it('ignores where inside filter braces', () => {
      expect(splitAtWhere('find:note{text:where} in journal')).toEqual({
        primary: 'find:note{text:where} in journal',
      });
    });

    it('handles query without where', () => {
      expect(splitAtWhere('avg:tis by {week}')).toEqual({
        primary: 'avg:tis by {week}',
      });
    });
  });

  describe('parseWqlSuffixes', () => {
    it('parses analytics suffixes (groupBy, rollup, displayUnit, where)', () => {
      const parsed = parseWqlSuffixes('avg:tis{discipline:strength} by {week, effort}.rollup(1w) in kg where find:note{tags:pr}');
      expect(parsed.primaryText).toBe('avg:tis{discipline:strength}');
      expect(parsed.groupBy).toEqual(['week', 'effort']);
      expect(parsed.rollup).toEqual({ size: 1, unit: 'w', raw: '1w' });
      expect(parsed.displayUnit).toBe('kg');
      expect(parsed.where).toBe('find:note{tags:pr}');
    });

    it('parses find query suffixes (legacyScope, last, where)', () => {
      const parsed = parseWqlSuffixes('find:note{tags:pr} in journal last 8w where sum:totalVolume{} > 5000');
      expect(parsed.primaryText).toBe('find:note{tags:pr}');
      expect(parsed.legacyScope).toBe('journal');
      expect(parsed.window).toEqual({ kind: 'relative', size: 8, unit: 'w', raw: 'last 8w' });
      expect(parsed.where).toBe('sum:totalVolume{} > 5000');
    });

    it('handles query with no suffixes', () => {
      const parsed = parseWqlSuffixes('count:sessionLoad');
      expect(parsed.primaryText).toBe('count:sessionLoad');
      expect(parsed.groupBy).toBeUndefined();
      expect(parsed.rollup).toBeUndefined();
      expect(parsed.displayUnit).toBeUndefined();
      expect(parsed.where).toBeUndefined();
    });
  });

  describe('suffix conflicts (C3)', () => {
    it('flags duplicate by clauses naming both spans', () => {
      const parsed = parseWqlSuffixes('sum:tis{} by {week} by {effort}');
      expect(parsed.conflicts).toEqual([
        "Duplicate 'by' clause: 'by {week}' conflicts with 'by {effort}'",
      ]);
    });

    it('flags duplicate rollup clauses', () => {
      const parsed = parseWqlSuffixes('sum:tis{}.rollup(1w).rollup(2w)');
      expect(parsed.conflicts).toEqual([
        "Duplicate '.rollup' clause: '.rollup(1w)' conflicts with '.rollup(2w)'",
      ]);
    });

    it('flags duplicate display-unit clauses on analytics', () => {
      const parsed = parseWqlSuffixes('sum:tis{} in kg in lb');
      expect(parsed.conflicts).toEqual([
        "Duplicate 'display-unit' clause: 'in kg' conflicts with 'in lb'",
      ]);
    });

    it('flags duplicate scope clauses on find', () => {
      const parsed = parseWqlSuffixes('find:note{tags:pr} in journal in feeds');
      expect(parsed.conflicts).toEqual([
        "Duplicate 'scope' clause: 'in journal' conflicts with 'in feeds'",
      ]);
    });

    it('flags duplicate window clauses on rows', () => {
      const parsed = parseWqlSuffixes('rows:{note:a} last 4w last 8w');
      expect(parsed.conflicts).toEqual([
        "Duplicate 'window' clause: 'last 4w' conflicts with 'last 8w'",
      ]);
    });

    it('reports one conflict per duplicated kind (peel order)', () => {
      const parsed = parseWqlSuffixes('sum:tis{}.rollup(1w).rollup(2w) in kg in lb');
      expect(parsed.conflicts).toHaveLength(2);
    });

    it('names first and last of three occurrences', () => {
      const parsed = parseWqlSuffixes('sum:tis{} by {a} by {b} by {c}');
      expect(parsed.conflicts).toEqual([
        "Duplicate 'by' clause: 'by {a}' conflicts with 'by {c}'",
      ]);
    });
    it('leaves valid queries conflict-free', () => {
      const parsed = parseWqlSuffixes(
        'avg:tis{discipline:strength} by {week}.rollup(1w) in kg',
      );
      expect(parsed.conflicts).toBeUndefined();
    });
  });
});
