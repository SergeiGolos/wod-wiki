import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../md-timer';
import { LapFragment } from '../../fragments/LapFragment';
import { FragmentType } from '../../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Lap fragment parsing', () => {
  it('parses compose marker (+) with group=compose', () => {
    const script = parse('+ 5:00');
    const lap = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Lap) as LapFragment;

    expect(lap).toBeDefined();
    expect(lap.group).toBe('compose');
    expect(lap.value).toBe('compose');
    expect(lap.image).toBe('+');
  });

  it('parses round marker (-) with group=round', () => {
    const script = parse('- 5:00');
    const lap = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Lap) as LapFragment;

    expect(lap).toBeDefined();
    expect(lap.group).toBe('round');
    expect(lap.value).toBe('round');
    expect(lap.image).toBe('-');
  });
});
