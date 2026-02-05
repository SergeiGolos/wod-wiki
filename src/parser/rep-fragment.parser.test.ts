import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from './md-timer';
import { RepFragment } from '../../fragments/RepFragment';
import { FragmentType } from '../core/models/CodeFragment';

/**
 * Rep Fragment Parser Contract
 * 
 * Verifies that the parser correctly identifies and classifies rep counts, 
 * including defined values, user-collected placeholders.
 */

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Rep Fragment Parser Contract', () => {
  describe('Valid Defined Reps', () => {
    it.each([
      ['10', 10],
      ['0', 0],
      ['999', 999],
      ['1', 1],
    ])('should parse "%s" as value %d', (input, expectedValue) => {
      const script = parse(input);
      const rep = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rep) as RepFragment;

      expect(rep).toBeDefined();
      expect(rep.value).toBe(expectedValue);
      expect(rep.origin).toBe('parser');
    });
  });

  describe('Placeholders', () => {
    it('should parse "?" as user origin placeholder', () => {
      const script = parse('?');
      const rep = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rep) as RepFragment;

      expect(rep).toBeDefined();
      expect(rep.value).toBeUndefined();
      expect(rep.origin).toBe('user');
    });
  });

  describe('Formatting', () => {
    it('should ignore surrounding whitespace', () => {
      const script = parse('  42  ');
      const rep = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rep) as RepFragment;
      expect(rep.value).toBe(42);
    });
  });

  describe('Semantic Validation (Errors)', () => {
    it('should report error for non-integer reps', () => {
      const script = parse('10.5');
      expect(script.errors).toBeDefined();
      expect(script.errors!.length).toBeGreaterThan(0);
      expect(script.errors![0].message).toContain('must be an integer');
    });
  });
});
