import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getRuntimeNowMs } from '../runtimeNow';

describe('getRuntimeNowMs', () => {
  const originalNow = Date.now;

  beforeEach(() => {
    (globalThis as any).window = (globalThis as any).window ?? {};
  });

  afterEach(() => {
    Date.now = originalNow;
    if ((globalThis as any).window) {
      delete (globalThis as any).window.__chromecast_senderClockTimeMs;
    }
  });

  it('uses sender clock when available', () => {
    (globalThis as any).window.__chromecast_senderClockTimeMs = () => 12345;
    expect(getRuntimeNowMs()).toBe(12345);
  });

  it('falls back to Date.now when sender clock is missing', () => {
    Date.now = () => 67890;
    expect(getRuntimeNowMs()).toBe(67890);
  });

  it('falls back to Date.now when sender clock throws', () => {
    Date.now = () => 555;
    (globalThis as any).window.__chromecast_senderClockTimeMs = () => {
      throw new Error('boom');
    };
    expect(getRuntimeNowMs()).toBe(555);
  });
});
