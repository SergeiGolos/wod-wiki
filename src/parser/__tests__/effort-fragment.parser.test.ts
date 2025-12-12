import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../md-timer';
import { EffortFragment } from '../../fragments/EffortFragment';
import { FragmentType } from '../../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Effort fragment parsing', () => {
  it('parses multi-word effort (very hard) preserving spacing', () => {
    const script = parse('very hard');
    const effort = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Effort) as EffortFragment;

    expect(effort).toBeDefined();
    expect(effort.value).toBe('very hard');
    expect(effort.image).toBe('very hard');
  });

  it('parses single-word effort (hard)', () => {
    const script = parse('hard');
    const effort = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Effort) as EffortFragment;

    expect(effort).toBeDefined();
    expect(effort.value).toBe('hard');
    expect(effort.image).toBe('hard');
  });
});
