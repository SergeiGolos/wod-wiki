import { describe, it, expect } from 'bun:test';
import { getMetricColorClasses, getMetricIcon, metricColorMap } from '../../views/runtime/metricColorMap';

describe('Visual Fragment Colors Test Suite', () => {
  describe('metricColorMap constant', () => {
    it('should have color classes for all core metric types', () => {
      const expectedTypes = [
        'time', 'rep', 'effort', 'distance', 'rounds',
        'action', 'increment', 'lap', 'text', 'resistance',
        'duration', 'spans', 'elapsed', 'total', 'system-time',
        'metric', 'rest',
      ];

      expectedTypes.forEach(type => {
        expect(metricColorMap[type as keyof typeof metricColorMap]).toBeDefined();
        expect(metricColorMap[type as keyof typeof metricColorMap]).toContain('bg-');
        expect(metricColorMap[type as keyof typeof metricColorMap]).toContain('border-');
        expect(metricColorMap[type as keyof typeof metricColorMap]).toContain('text-');
      });
    });

    it('allows semantically-related types to share color families', () => {
      // The design system has 7 metric color families; newer types map to
      // existing families (e.g., volume → rep, load → resistance).
      const colors = Object.values(metricColorMap);
      const uniqueColors = new Set(colors);
      // With 24+ entries and intentional reuse, uniqueness is < length.
      expect(uniqueColors.size).toBeGreaterThanOrEqual(7);
      expect(colors.length).toBeGreaterThanOrEqual(24);
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

  // UX-04: Rest blocks must be visually distinct from work sets.
  // Rest is parsed as an `effort` metric whose value is "Rest"; the
  // helpers should detect this and return rest visuals instead of the
  // running-figure (🏃) used for work sets.
  describe('rest detection (UX-04)', () => {
    it('should return the rest icon for effort metrics whose value is "Rest"', () => {
      expect(getMetricIcon('effort', 'Rest')).toBe('⏸️');
      expect(getMetricIcon('effort', 'rest')).toBe('⏸️');
      expect(getMetricIcon('effort', '  REST  ')).toBe('⏸️');
    });

    it('should still return the effort icon for normal work-set effort metrics', () => {
      expect(getMetricIcon('effort', 'Pushups')).toBe('🏃');
      expect(getMetricIcon('effort')).toBe('🏃');
    });

    it('should return rest color classes for effort metrics whose value is "Rest"', () => {
      const restClasses = getMetricColorClasses('effort', 'Rest');
      expect(restClasses).toBe(metricColorMap.rest ?? '');
      expect(restClasses).not.toContain('metric-effort');
    });

    it('should still return effort color classes for normal effort metrics', () => {
      expect(getMetricColorClasses('effort', 'Pushups')).toContain('metric-effort');
      expect(getMetricColorClasses('effort')).toContain('metric-effort');
    });
  });
});
