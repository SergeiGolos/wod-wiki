import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from './md-timer';
import { IncrementFragment } from '../runtime/compiler/fragments/IncrementFragment';
import { FragmentType } from '../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Increment fragment parsing', () => {
  it('parses up trend (^) with increment=1 and value=1', () => {
    const script = parse('^');
    const increment = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Increment) as IncrementFragment;

    expect(increment).toBeDefined();
    expect(increment.image).toBe('^');
    expect(increment.increment).toBe(1);
    expect(increment.value).toBe(1);
  });
});
