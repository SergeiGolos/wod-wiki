import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../md-timer';
import { RepFragment } from '../../fragments/RepFragment';
import { FragmentType, FragmentCollectionState } from '../../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Rep fragment parsing', () => {
  it('parses defined reps (10) with value and Defined state', () => {
    const script = parse('10');
    const rep = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rep) as RepFragment;

    expect(rep).toBeDefined();
    expect(rep.value).toBe(10);
    expect(rep.image).toBe('10');
    expect(rep.collectionState).toBe(FragmentCollectionState.Defined);
  });

  it('parses collectible reps (?) with undefined value and UserCollected state', () => {
    const script = parse('?');
    const rep = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rep) as RepFragment;

    expect(rep).toBeDefined();
    expect(rep.value).toBeUndefined();
    expect(rep.image).toBe('?');
    expect(rep.collectionState).toBe(FragmentCollectionState.UserCollected);
  });
});
