import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../md-timer';
import { ResistanceFragment } from '../../fragments/ResistanceFragment';
import { FragmentType } from '../../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Resistance fragment parsing', () => {
  it('parses resistance with @ prefix (@135lb) with amount, units, and parser origin', () => {
    const script = parse('@135lb');
    const resistance = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Resistance) as ResistanceFragment;

    expect(resistance).toBeDefined();
    expect(resistance.value.amount).toBe(135);
    expect(resistance.value.units).toBe('lb');
    expect(resistance.image).toBe('135 lb');
    expect(resistance.origin).toBe('parser');
  });

  it('parses resistance with default amount (lb) as amount=1', () => {
    const script = parse('lb');
    const resistance = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Resistance) as ResistanceFragment;

    expect(resistance).toBeDefined();
    expect(resistance.value.amount).toBe(1);
    expect(resistance.value.units).toBe('lb');
    expect(resistance.image).toBe('1 lb');
    expect(resistance.origin).toBe('parser');
  });

  it('parses collectible resistance (?kg) with undefined amount and user origin', () => {
    const script = parse('?kg');
    const resistance = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Resistance) as ResistanceFragment;

    expect(resistance).toBeDefined();
    expect(resistance.value.amount).toBeUndefined();
    expect(resistance.value.units).toBe('kg');
    expect(resistance.image).toBe('? kg');
    expect(resistance.origin).toBe('user');
  });
});
