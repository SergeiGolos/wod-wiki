import { describe, it, expect } from 'vitest';
import { getFragmentColorClasses, fragmentColorMap } from '../../views/runtime/fragmentColorMap';

describe('fragmentColorMap', () => {
  describe('fragmentColorMap constant', () => {
    it('should have color classes for all 10 fragment types', () => {
      const expectedTypes = [
        'timer', 'rep', 'effort', 'distance', 'rounds',
        'action', 'increment', 'lap', 'text', 'resistance'
      ];

      expectedTypes.forEach(type => {
        expect(fragmentColorMap[type as keyof typeof fragmentColorMap]).toBeDefined();
        expect(fragmentColorMap[type as keyof typeof fragmentColorMap]).toContain('bg-');
        expect(fragmentColorMap[type as keyof typeof fragmentColorMap]).toContain('border-');
        expect(fragmentColorMap[type as keyof typeof fragmentColorMap]).toContain('text-');
      });
    });

    it('should have unique colors for each fragment type', () => {
      const colors = Object.values(fragmentColorMap);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('getFragmentColorClasses function', () => {
    it('should return correct color classes for all 10 fragment types', () => {
      expect(getFragmentColorClasses('timer')).toContain('blue');
      expect(getFragmentColorClasses('rep')).toContain('green');
      expect(getFragmentColorClasses('effort')).toContain('yellow');
      expect(getFragmentColorClasses('distance')).toContain('teal');
      expect(getFragmentColorClasses('rounds')).toContain('purple');
      expect(getFragmentColorClasses('action')).toContain('pink');
      expect(getFragmentColorClasses('increment')).toContain('indigo');
      expect(getFragmentColorClasses('lap')).toContain('orange');
      expect(getFragmentColorClasses('text')).toContain('gray');
      expect(getFragmentColorClasses('resistance')).toContain('red');
    });

    it('should return fallback color for unknown fragment types', () => {
      const fallbackClasses = getFragmentColorClasses('unknown');
      expect(fallbackClasses).toContain('bg-gray-200 border-gray-300 text-gray-800');
    });

    it('should be case-insensitive', () => {
      expect(getFragmentColorClasses('TIMER')).toBe(getFragmentColorClasses('timer'));
      expect(getFragmentColorClasses('Timer')).toBe(getFragmentColorClasses('timer'));
      expect(getFragmentColorClasses('tImEr')).toBe(getFragmentColorClasses('timer'));
    });

    it('should handle empty string input', () => {
      const fallbackClasses = getFragmentColorClasses('');
      expect(fallbackClasses).toContain('bg-gray-200 border-gray-300 text-gray-800');
    });

    it('should return valid Tailwind CSS class strings', () => {
      const timerClasses = getFragmentColorClasses('timer');
      expect(timerClasses).toContain('bg-');
      expect(timerClasses).toContain('border-');
      expect(timerClasses).toContain('text-');
    });
  });
});
