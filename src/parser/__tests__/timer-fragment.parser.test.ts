import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../md-timer';
import { TimerFragment } from '../../fragments/TimerFragment';
import { FragmentType } from '../../core/models/CodeFragment';

/**
 * Timer Fragment Parser Contract
 */

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Timer Fragment Parser Contract', () => {
  describe('Valid Formats', () => {
    it.each([
      ['5:00', 300000, 5, 0, 'down'],
      ['0:00', 0, 0, 0, 'up'],
      ['1:30:00', 5400000, 30, 0, 'down'],
    ])('should parse "%s" correctly', (input, ms, min, sec, dir) => {
      const script = parse(input);
      const timer = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment;

      expect(timer).toBeDefined();
      expect(timer.value).toBe(ms);
      expect(timer.minutes).toBe(min);
      expect(timer.seconds).toBe(sec);
      expect(timer.direction).toBe(dir as any);
    });
  });

  describe('Semantic Errors', () => {
    it('should report error for invalid seconds (>59) when other parts are present', () => {
      const script = parse('10:65');
      expect(script.errors!.length).toBeGreaterThan(0);
      expect(script.errors![0].message).toContain('Invalid seconds component');
    });

    it('should report error for invalid minutes (>59) when hours are present', () => {
      const script = parse('1:65:00');
      expect(script.errors!.length).toBeGreaterThan(0);
      expect(script.errors![0].message).toContain('Invalid minutes component');
    });
  });

  describe('Placeholders', () => {
    it('should parse ":?" placeholder', () => {
      const script = parse(':?');
      const timer = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment;
      expect(timer.origin).toBe('runtime');
    });
  });
});
