import { describe, expect, it } from 'bun:test';
import { formatPlaygroundPageTitle, formatPlaygroundTimestampId } from './playgroundIds';

describe('playgroundIds', () => {
  it('formats timestamp IDs for playground URLs', () => {
    expect(formatPlaygroundTimestampId(new Date('2026-04-27T14:30:22.481Z').getTime()))
      .toBe('2026-04-27-14-30-22-481');
  });

  it('formats timestamp route IDs as readable playground titles', () => {
    expect(formatPlaygroundPageTitle('2026-04-27-14-30-22-481'))
      .toBe('Playground – Apr 27, 2026 2:30 PM');
  });

  it('hides legacy UUID playground IDs behind a generic title', () => {
    expect(formatPlaygroundPageTitle('123e4567-e89b-12d3-a456-426614174000'))
      .toBe('Playground');
  });
});
