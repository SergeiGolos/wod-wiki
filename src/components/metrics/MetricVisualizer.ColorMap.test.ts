import { describe, it, expect } from 'bun:test';
import { getMetricColorClasses, metricColorMap } from '../../views/runtime/metricColorMap';

describe('Visual Fragment Colors Test Suite', () => {
  describe('metricColorMap constant', () => {
    it('should have color classes for all 10 metric types', () => {
      const expectedTypes = [
        'time', 'rep', 'effort', 'distance', 'rounds',
        'action', 'increment', 'lap', 'text', 'resistance'
      ];

      expectedTypes.forEach(type => {
        expect(metricColorMap[type as keyof typeof metricColorMap]).toBeDefined();
        expect(metricColorMap[type as keyof typeof metricColorMap]).toContain('bg-');
        expect(metricColorMap[type as keyof typeof metricColorMap]).toContain('border-');
        expect(metricColorMap[type as keyof typeof metricColorMap]).toContain('text-');
      });
    });

    it('should have unique colors for each metric type', () => {
      const colors = Object.values(metricColorMap);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('getMetricColorClasses function', () => {
    it('should return correct color classes for all 10 metric types', () => {
      expect(getMetricColorClasses('time')).toContain('blue');
      expect(getMetricColorClasses('rep')).toContain('green');
      expect(getMetricColorClasses('effort')).toContain('yellow');
      expect(getMetricColorClasses('distance')).toContain('teal');
      expect(getMetricColorClasses('rounds')).toContain('purple');
      expect(getMetricColorClasses('action')).toContain('pink');
      expect(getMetricColorClasses('increment')).toContain('indigo');
      expect(getMetricColorClasses('lap')).toContain('orange');
      expect(getMetricColorClasses('text')).toContain('gray');
      expect(getMetricColorClasses('resistance')).toContain('red');
    });

    it('should return fallback color for unknown metric types', () => {
      const fallbackClasses = getMetricColorClasses('unknown');
      expect(fallbackClasses).toContain('bg-gray-200 border-gray-300 text-gray-800');
    });

    it('should be case-insensitive', () => {
      expect(getMetricColorClasses('TIMER')).toBe(getMetricColorClasses('timer'));
      expect(getMetricColorClasses('Timer')).toBe(getMetricColorClasses('timer'));
      expect(getMetricColorClasses('tImEr')).toBe(getMetricColorClasses('timer'));
    });

    it('should handle empty string input', () => {
      const fallbackClasses = getMetricColorClasses('');
      expect(fallbackClasses).toContain('bg-gray-200 border-gray-300 text-gray-800');
    });

    it('should return valid Tailwind CSS class strings', () => {
      const timerClasses = getMetricColorClasses('timer');
      expect(timerClasses).toContain('bg-');
      expect(timerClasses).toContain('border-');
      expect(timerClasses).toContain('text-');
    });
  });
});
