import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from './md-timer';
import { RoundsFragment } from '../runtime/compiler/fragments/RoundsFragment';
import { RepFragment } from '../runtime/compiler/fragments/RepFragment';
import { FragmentType } from '../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Rounds fragment parsing', () => {
  it('parses label form (amrap) as string value', () => {
    const script = parse('(amrap)');
    const rounds = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rounds) as RoundsFragment;

    expect(rounds).toBeDefined();
    expect(rounds.value).toBe('amrap');
    expect(rounds.image).toBe('amrap');
  });

  it('parses single number (5) as numeric value without additional RepFragments', () => {
    const script = parse('(5)');
    const rounds = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rounds) as RoundsFragment;
    const repFragments = script.statements[0].fragments.filter(f => f.fragmentType === FragmentType.Rep);

    expect(rounds).toBeDefined();
    expect(rounds.value).toBe(5);
    expect(rounds.image).toBe('5');
    expect(repFragments.length).toBe(0); // No additional RepFragments for single number
  });

  it('parses sequence (5-10-15) as RoundsFragment with count=3 plus three RepFragments', () => {
    const script = parse('(5-10-15)');
    const rounds = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Rounds) as RoundsFragment;
    const repFragments = script.statements[0].fragments.filter(f => f.fragmentType === FragmentType.Rep) as RepFragment[];

    expect(rounds).toBeDefined();
    expect(rounds.value).toBe(3); // Number of groups in sequence
    expect(repFragments.length).toBe(3);
    expect(repFragments[0].value).toBe(5);
    expect(repFragments[1].value).toBe(10);
    expect(repFragments[2].value).toBe(15);
  });
});
