import { describe, it, expect } from 'vitest';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { FragmentType } from '../../src/core/models/CodeFragment';
import { RoundsFragment } from '../../src/fragments/RoundsFragment';

describe('Syntax Features Regression Tests', () => {
  const parser = new MdTimerRuntime();

  const parse = (code: string) => {
    return parser.read(code);
  };

  describe('Actions', () => {
    it('parses action with colon [:Rest]', () => {
      const result = parse('[:Rest]');
      expect(result.errors).toHaveLength(0);
      expect(result.statements[0].fragments[0].fragmentType).toBe(FragmentType.Action);
      expect(result.statements[0].fragments[0].value).toBe('Rest');
    });

    it('parses action with space [: Rest]', () => {
      const result = parse('[: Rest]');
      expect(result.errors).toHaveLength(0);
      expect(result.statements[0].fragments[0].value).toBe('Rest');
    });

    // Documenting that [Rest] is invalid without colon
    it('fails to parse action without colon [Rest]', () => {
      const result = parse('[Rest]');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Timers', () => {
    it('parses simple timer 20:00', () => {
      const result = parse('20:00');
      expect(result.errors).toHaveLength(0);
      expect(result.statements[0].fragments[0].fragmentType).toBe(FragmentType.Timer);
      // 20 minutes = 1200000 ms
      expect(result.statements[0].fragments[0].value).toBe(1200000);
    });

    it('parses timer with text', () => {
      const result = parse('20:00 Run');
      expect(result.errors).toHaveLength(0);
      const fragments = result.statements[0].fragments;
      expect(fragments.some(f => f.fragmentType === FragmentType.Timer)).toBe(true);
      expect(fragments.some(f => f.fragmentType === FragmentType.Effort && f.value === 'Run')).toBe(true);
    });
  });

  describe('Groupings & Rounds', () => {
    it('parses simple rounds (3 rounds)', () => {
      const result = parse('(3 rounds)');
      expect(result.errors).toHaveLength(0);
      const fragment = result.statements[0].fragments[0] as RoundsFragment;
      expect(fragment.fragmentType).toBe(FragmentType.Rounds);
      expect(fragment.count).toBe(3);
    });

    it('parses rep schemes (21-15-9)', () => {
      const result = parse('(21-15-9)');
      expect(result.errors).toHaveLength(0);
      const fragments = result.statements[0].fragments;
      const roundFrag = fragments.find(f => f.fragmentType === FragmentType.Rounds) as RoundsFragment;
      expect(roundFrag).toBeDefined();
      expect(roundFrag.count).toBe(3);

      const repFrags = fragments.filter(f => f.fragmentType === FragmentType.Rep);
      expect(repFrags).toHaveLength(3);
      expect(repFrags[0].value).toBe(21);
      expect(repFrags[1].value).toBe(15);
      expect(repFrags[2].value).toBe(9);
    });

    it('parses named rounds (EMOM)', () => {
      const result = parse('(EMOM)');
      expect(result.errors).toHaveLength(0);
      const fragment = result.statements[0].fragments[0] as RoundsFragment;
      expect(fragment.fragmentType).toBe(FragmentType.Rounds);
      expect(fragment.value).toBe('EMOM');
    });

    it('parses named rounds (AMRAP)', () => {
        const result = parse('(AMRAP)');
        expect(result.errors).toHaveLength(0);
        const fragment = result.statements[0].fragments[0] as RoundsFragment;
        expect(fragment.fragmentType).toBe(FragmentType.Rounds);
        expect(fragment.value).toBe('AMRAP');
      });
  });

  describe('Metrics', () => {
    it('parses weight 135lb', () => {
      const result = parse('135lb');
      expect(result.errors).toHaveLength(0);
      const fragment = result.statements[0].fragments[0];
      expect(fragment.fragmentType).toBe(FragmentType.Resistance);
      expect(fragment.value).toEqual({ amount: "135", units: "lb" });
    });

    it('parses weight with at-sign @135lb', () => {
      const result = parse('@135lb');
      expect(result.errors).toHaveLength(0);
      const fragment = result.statements[0].fragments[0];
      expect(fragment.fragmentType).toBe(FragmentType.Resistance);
    });

    it('parses distance 400m', () => {
      const result = parse('400m');
      expect(result.errors).toHaveLength(0);
      const fragment = result.statements[0].fragments[0];
      expect(fragment.fragmentType).toBe(FragmentType.Distance);
      expect(fragment.value).toEqual({ amount: "400", units: "m" });
    });

    it('parses trend ^', () => {
        const result = parse('^');
        expect(result.errors).toHaveLength(0);
        const fragment = result.statements[0].fragments[0];
        expect(fragment.fragmentType).toBe(FragmentType.Increment);
    });
  });
});
