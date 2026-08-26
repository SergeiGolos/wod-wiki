import { describe, expect, it } from 'bun:test';
import {
  formatPlaygroundPageTitle,
  formatPlaygroundTimestampId,
  formatPlaygroundTimestampLabel,
} from './playgroundDisplay';

function expectedTimestampId(date: Date): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3),
  ].join('-');
}

function expectedTimestampLabel(date: Date): string {
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Playground – ${dateStr} ${timeStr}`;
}

describe('playgroundDisplay', () => {
  const timestamp = Date.UTC(2026, 3, 27, 14, 30, 22, 481);
  const date = new Date(timestamp);

  it('formats timestamp IDs for playground URLs', () => {
    expect(formatPlaygroundTimestampId(timestamp)).toBe(expectedTimestampId(date));
  });

  it('formats playground timestamp labels', () => {
    expect(formatPlaygroundTimestampLabel(timestamp)).toBe(expectedTimestampLabel(date));
  });

  it('formats timestamp route IDs as readable playground titles', () => {
    expect(formatPlaygroundPageTitle('2026-04-27-14-30-22-481'))
      .toBe(expectedTimestampLabel(new Date(2026, 3, 27, 14, 30, 22, 481)));
  });

  it('hides legacy UUID playground IDs behind a generic title', () => {
    expect(formatPlaygroundPageTitle('123e4567-e89b-12d3-a456-426614174000')).toBe('Playground');
  });

  it('falls back to raw names when route decoding fails', () => {
    expect(formatPlaygroundPageTitle('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('formats timestamp route IDs with collision suffixes as readable titles', () => {
    expect(formatPlaygroundPageTitle('2026-04-27-14-30-22-481-1'))
      .toBe(expectedTimestampLabel(new Date(2026, 3, 27, 14, 30, 22, 481)));
  });
});
