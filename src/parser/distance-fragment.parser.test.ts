import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from './md-timer';
import { DistanceFragment } from '../runtime/compiler/fragments/DistanceFragment';
import { FragmentType } from '../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Distance fragment parsing', () => {
  it('parses distance with number (400m) with amount, units, and parser origin', () => {
    const script = parse('400m');
    const distance = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Distance) as DistanceFragment;

    expect(distance).toBeDefined();
    expect(distance.value.amount).toBe(400);
    expect(distance.value.units).toBe('m');
    expect(distance.image).toBe('400 m');
    expect(distance.origin).toBe('parser');
  });

  it('parses distance with default amount (m) as amount=1', () => {
    const script = parse('m');
    const distance = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Distance) as DistanceFragment;

    expect(distance).toBeDefined();
    expect(distance.value.amount).toBe(1);
    expect(distance.value.units).toBe('m');
    expect(distance.image).toBe('1 m');
    expect(distance.origin).toBe('parser');
  });

  it('parses collectible distance (?m) with undefined amount and user origin', () => {
    const script = parse('?m');
    const distance = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Distance) as DistanceFragment;

    expect(distance).toBeDefined();
    expect(distance.value.amount).toBeUndefined();
    expect(distance.value.units).toBe('m');
    expect(distance.image).toBe('? m');
    expect(distance.origin).toBe('user');
  });

  it('preserves case in distance units (400M)', () => {
    const script = parse('400M');
    const distance = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Distance) as DistanceFragment;

    expect(distance).toBeDefined();
    expect(distance.value.units).toBe('M'); // Preserves input case
  });
});
