import { describe, it, expect } from 'vitest';
import { formatTimestamp, formatTime, calculateDuration, roundToTenth } from './timeUtils';

describe('timeUtils', () => {
  describe('formatTimestamp', () => {
    it('formats a date object correctly', () => {
      const date = new Date('2023-01-01T12:30:45');
      expect(formatTimestamp(date)).toBe('12:30:45');
    });

    it('formats a timestamp number correctly', () => {
      const date = new Date('2023-01-01T12:30:45').getTime();
      expect(formatTimestamp(date)).toBe('12:30:45');
    });

    it('returns "running" for undefined', () => {
      expect(formatTimestamp(undefined)).toBe('running');
    });
  });

  describe('formatTime', () => {
    it('formats milliseconds to MM:SS.ms', () => {
      // 1 minute, 5 seconds, 500ms
      const ms = 60000 + 5000 + 500;
      expect(formatTime(ms)).toBe('01:05.50');
    });

    it('handles zero', () => {
      expect(formatTime(0)).toBe('00:00.00');
    });

    it('pads single digits', () => {
        const ms = 1000 + 10;
        expect(formatTime(ms)).toBe('00:01.01');
    });
  });

  describe('calculateDuration', () => {
    it('calculates duration for closed spans', () => {
      const spans = [
        { start: 1000, stop: 2000 }, // 1000ms
        { start: 3000, stop: 5000 }, // 2000ms
      ];
      expect(calculateDuration(spans)).toBe(3000);
    });

    it('calculates duration for open span using "now"', () => {
      const now = 10000;
      const spans = [
        { start: 1000, stop: 2000 }, // 1000ms
        { start: 5000 },             // 10000 - 5000 = 5000ms
      ];
      expect(calculateDuration(spans, now)).toBe(6000);
    });

    it('handles Date objects', () => {
        const spans = [
            { start: new Date(1000), stop: new Date(2000) }
        ];
        expect(calculateDuration(spans)).toBe(1000);
    });
  });

  describe('roundToTenth', () => {
      it('rounds correctly', () => {
          expect(roundToTenth(1.23)).toBe(1.2);
          expect(roundToTenth(1.26)).toBe(1.3);
      });
  });
});
