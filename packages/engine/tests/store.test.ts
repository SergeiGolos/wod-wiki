import { describe, it, expect } from 'vitest';
import { inMemoryEventStoreFromFacts, QueryService } from '../src/index';
import type { AnalyticsDataPoint } from '../src/index';

describe('inMemoryEventStore (from legacy fact fixtures)', () => {
  const sampleFacts: AnalyticsDataPoint[] = [
    {
      id: 'fact-1',
      noteId: 'note-1',
      blockContentId: 'blk-1',
      segmentId: 'seg-1',
      segmentVersion: 1,
      resultId: 'res-1',
      origin: 'journal',
      grain: 'summary',
      type: 'totalVolume',
      value: 1500,
      unit: 'lb',
      label: 'Total Volume',
      metricKey: 'totalVolume',
      metricLabel: 'Total Volume',
      metricUnit: 'lb',
      timestamp: 1000,
      createdAt: 1000,
    },
    {
      id: 'fact-2',
      noteId: 'note-2',
      blockContentId: 'blk-2',
      segmentId: 'seg-2',
      segmentVersion: 1,
      resultId: 'res-2',
      origin: 'journal',
      grain: 'summary',
      type: 'totalVolume',
      value: 2500,
      unit: 'lb',
      label: 'Total Volume',
      metricKey: 'totalVolume',
      metricLabel: 'Total Volume',
      metricUnit: 'lb',
      timestamp: 2000,
      createdAt: 2000,
    },
    {
      id: 'fact-3',
      noteId: 'note-3',
      blockContentId: 'blk-3',
      segmentId: 'seg-3',
      segmentVersion: 1,
      resultId: 'res-3',
      origin: 'journal',
      grain: 'summary',
      type: 'tis',
      value: 45,
      unit: 'pts',
      label: 'TIS',
      metricKey: 'tis',
      metricLabel: 'TIS',
      metricUnit: 'pts',
      timestamp: 3000,
      createdAt: 3000,
    },
  ];


  it('projects facts through the event seam when queried by metric', async () => {
    const store = inMemoryEventStoreFromFacts(sampleFacts);
    const service = new QueryService(store);

    const allFacts = await service.getFactsByTimeRange(0, 10_000);
    const volume = allFacts.filter((f) => f.metricKey === 'totalVolume');
    expect(volume).toHaveLength(2);
    expect(volume[0].value).toBe(1500);
    expect(volume[1].value).toBe(2500);

    const tis = allFacts.filter((f) => f.metricKey === 'tis');
    expect(tis).toHaveLength(1);
    expect(tis[0].value).toBe(45);
  });

  it('windows facts by time range through the event seam', async () => {
    const store = inMemoryEventStoreFromFacts(sampleFacts);
    const service = new QueryService(store);
    const inRange = await service.getFactsByTimeRange(1500, 2500);
    expect(inRange).toHaveLength(1);
    expect(inRange[0].id).toBe('fact:res-2:totalVolume:1:0');
  });

  it('integrates seamlessly with QueryService for WQL execution', async () => {
    const store = inMemoryEventStoreFromFacts(sampleFacts);
    const service = new QueryService(store);

    const result = await service.runQuery('sum:totalVolume{}');
    expect(result.series).toHaveLength(1);
    expect(result.series[0].points[0].value).toBe(4000);
  });
});
