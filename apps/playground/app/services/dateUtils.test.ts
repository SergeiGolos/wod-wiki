import { describe, expect, it } from 'bun:test';
import { formatDateKey, getTodayDateKey, isDateInPast, isDateToday } from './dateUtils';

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

describe('dateUtils', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(formatDateKey(new Date(2024, 5, 15))).toBe('2024-06-15');
    expect(formatDateKey(new Date(2024, 0, 5))).toBe('2024-01-05');
  });

  it('returns today in local YYYY-MM-DD format', () => {
    const todayKey = getTodayDateKey();

    expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayKey).toBe(formatDateKey(new Date()));
  });

  it('detects today correctly', () => {
    const todayKey = getTodayDateKey();

    expect(isDateToday(todayKey)).toBe(true);
    expect(isDateToday(shiftDateKey(todayKey, -1))).toBe(false);
  });

  it('detects past dates strictly before today', () => {
    const todayKey = getTodayDateKey();

    expect(isDateInPast(shiftDateKey(todayKey, -1))).toBe(true);
    expect(isDateInPast(todayKey)).toBe(false);
    expect(isDateInPast(shiftDateKey(todayKey, 1))).toBe(false);
  });
});
