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
      // New CSS-variable-backed classes use metric-* tokens, not Tailwind color scale names
      expect(getMetricColorClasses('time')).toContain('metric-time');
      expect(getMetricColorClasses('rep')).toContain('metric-rep');
      expect(getMetricColorClasses('effort')).toContain('metric-effort');
      expect(getMetricColorClasses('distance')).toContain('metric-distance');
      expect(getMetricColorClasses('rounds')).toContain('metric-rounds');
      expect(getMetricColorClasses('action')).toContain('metric-action');
      expect(getMetricColorClasses('increment')).toContain('metric-rounds');
      expect(getMetricColorClasses('lap')).toContain('metric-rep');
      expect(getMetricColorClasses('text')).toContain('muted');
      expect(getMetricColorClasses('resistance')).toContain('metric-resistance');
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
