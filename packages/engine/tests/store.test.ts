import { describe, it, expect } from 'vitest';
import { inMemoryFactStore, QueryService } from '../src/index';
import type { AnalyticsDataPoint } from '../src/index';

describe('inMemoryFactStore', () => {
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

  const noteTags = {
    'note-1': ['benchmark', 'fran'],
    'note-2': ['strength'],
  };

  it('filters facts by metric key', async () => {
    const store = inMemoryFactStore(sampleFacts, noteTags);
    const volumeFacts = await store.getFactsByMetric('totalVolume');
    expect(volumeFacts).toHaveLength(2);
    expect(volumeFacts[0].value).toBe(1500);
    expect(volumeFacts[1].value).toBe(2500);

    const tisFacts = await store.getFactsByMetric('tis');
    expect(tisFacts).toHaveLength(1);
    expect(tisFacts[0].value).toBe(45);
  });

  it('filters facts by time range', async () => {
    const store = inMemoryFactStore(sampleFacts, noteTags);
    const inRange = await store.getFactsByTimeRange(1500, 2500);
    expect(inRange).toHaveLength(1);
    expect(inRange[0].id).toBe('fact-2');
  });

  it('returns note tags for note ID', async () => {
    const store = inMemoryFactStore(sampleFacts, noteTags);
    const tags = await store.getNoteTagLabels('note-1');
    expect(tags).toEqual(['benchmark', 'fran']);

    const emptyTags = await store.getNoteTagLabels('unknown-note');
    expect(emptyTags).toEqual([]);
  });

  it('integrates seamlessly with QueryService for WQL execution', async () => {
    const store = inMemoryFactStore(sampleFacts, noteTags);
    const service = new QueryService(store);

    const result = await service.runQuery('sum:totalVolume{}');
    expect(result.series).toHaveLength(1);
    expect(result.series[0].points[0].value).toBe(4000);
  });
});
