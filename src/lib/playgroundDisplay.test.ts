import { describe, expect, it } from 'bun:test';
import {
  formatPlaygroundPageTitle,
  formatPlaygroundTimestampId,
  formatPlaygroundTimestampLabel,
} from './playgroundDisplay';

describe('playgroundDisplay', () => {
  const timestamp = Date.UTC(2026, 3, 27, 14, 30, 22, 481);

  it('formats timestamp IDs for playground URLs', () => {
    expect(formatPlaygroundTimestampId(timestamp)).toBe('2026-04-27-14-30-22-481');
  });

  it('formats playground timestamp labels', () => {
    expect(formatPlaygroundTimestampLabel(timestamp)).toBe('Playground – Apr 27, 2026 2:30 PM');
  });

  it('formats timestamp route IDs as readable playground titles', () => {
    expect(formatPlaygroundPageTitle('2026-04-27-14-30-22-481'))
      .toBe('Playground – Apr 27, 2026 2:30 PM');
  });

  it('hides legacy UUID playground IDs behind a generic title', () => {
    expect(formatPlaygroundPageTitle('123e4567-e89b-12d3-a456-426614174000')).toBe('Playground');
  });

  it('falls back to raw names when route decoding fails', () => {
    expect(formatPlaygroundPageTitle('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('formats timestamp route IDs with collision suffixes as readable titles', () => {
    expect(formatPlaygroundPageTitle('2026-04-27-14-30-22-481-1'))
      .toBe('Playground – Apr 27, 2026 2:30 PM');
  });
});
