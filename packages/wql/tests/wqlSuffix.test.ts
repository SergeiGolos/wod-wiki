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

    it('parses find query suffixes (scope, last, where)', () => {
      const parsed = parseWqlSuffixes('find:note{tags:pr} in journal last 8w where sum:totalVolume{} > 5000');
      expect(parsed.primaryText).toBe('find:note{tags:pr}');
      expect(parsed.scope).toBe('journal');
      expect(parsed.last).toEqual({ size: 8, unit: 'w', raw: 'last 8w' });
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
});
