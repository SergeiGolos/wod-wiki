import { describe, it, expect } from 'bun:test';
import { ownershipRank } from '../OwnershipResolver';
import { IMetric } from '../../../models/Metric';

const parser: IMetric = { type: 'rep' as any, origin: 'parser', value: 10, image: '10' } as IMetric;
const runtime: IMetric = { type: 'rep' as any, origin: 'runtime', value: 15, image: '15' } as IMetric;

describe('rank', () => {
  it('runtime > parser', () => {
    console.log('parser rank:', ownershipRank(parser));
    console.log('runtime rank:', ownershipRank(runtime));
    expect(ownershipRank(runtime)).toBeGreaterThan(ownershipRank(parser));
  });
});
