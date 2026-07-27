import { describe, expect, it } from 'bun:test';
import { DEMO_WIDGETS } from './dashboardDefinition';

describe('AnalyticsDashboardPage demo queries', () => {
  // Dynamic import with ?real bypasses the Dashboard page test's module mock
  // of @/services/analytics/query so we exercise the real parser.
  it('every demo query parses without error', async () => {
    // @ts-expect-error — bun-only ?real specifier bypasses the mocked registry.
    const { parseQuery } = await import('@/services/analytics/query/wql?real');
    for (const widget of DEMO_WIDGETS) {
      const parsed = parseQuery(widget.query);
      expect(parsed.error).toBeUndefined();
      if (parsed.error) {
        throw new Error(`Query "${widget.query}" for "${widget.title}" failed: ${parsed.error}`);
      }
    }
  });

  it('demo queries use shipped metric keys', async () => {
    // @ts-expect-error — bun-only ?real specifier bypasses the mocked registry.
    const { parseQuery } = await import('@/services/analytics/query/wql?real');
    const shippedKeys = ['totalVolume', 'totalReps', 'sessionLoad', 'totalDistance', 'tis'];
    for (const widget of DEMO_WIDGETS) {
      const parsed = parseQuery(widget.query);
      expect(shippedKeys).toContain(parsed.metric);
    }
  });
});
