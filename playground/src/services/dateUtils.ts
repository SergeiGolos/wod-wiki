/** Returns 'YYYY-MM-DD' in local time. Avoids UTC timezone shift from toISOString(). */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getTodayDateKey(): string {
  return formatDateKey(new Date());
}

export function isDateToday(dateKey: string): boolean {
  return dateKey === getTodayDateKey();
}

export function isDateInPast(dateKey: string): boolean {
  return dateKey < getTodayDateKey();
}
