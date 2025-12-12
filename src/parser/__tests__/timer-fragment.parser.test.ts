import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../md-timer';
import { TimerFragment } from '../../fragments/TimerFragment';
import { FragmentType, FragmentCollectionState } from '../../core/models/CodeFragment';
import { IncrementFragment } from '../../fragments/IncrementFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Timer fragment parsing', () => {
  it('parses explicit timer (5:00) into minutes/seconds with milliseconds value', () => {
    const script = parse('5:00');
    const timer = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment;

    expect(timer).toBeDefined();
    expect(timer.minutes).toBe(5);
    expect(timer.seconds).toBe(0);
    expect(timer.hours).toBe(0);
    expect(timer.days).toBe(0);
    expect(timer.original).toBe(5 * 60 * 1000); // 5 minutes in ms
    expect(timer.value).toBe(5 * 60 * 1000);
    expect(timer.collectionState).toBe(FragmentCollectionState.Defined);
    expect(timer.direction).toBe('down');
  });

  it('parses zero duration (0:00) with value=0 and direction=up', () => {
    const script = parse('0:00');
    const timer = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment;

    expect(timer).toBeDefined();
    expect(timer.value).toBe(0);
    expect(timer.direction).toBe('up');
    expect(timer.collectionState).toBe(FragmentCollectionState.Defined);
  });

  it('parses collectible timer (:?) with undefined value and RuntimeGenerated state', () => {
    const script = parse(':?');
    const timer = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment;

    expect(timer).toBeDefined();
    expect(timer.value).toBeUndefined();
    expect(timer.original).toBeUndefined();
    expect(timer.collectionState).toBe(FragmentCollectionState.RuntimeGenerated);
    expect(timer.direction).toBe('up');
  });

  // Note: ^ is parsed as a separate increment fragment, not a timer modifier (see parser grammar)
  it('parses ^5:00 as separate increment and timer fragments', () => {
    const script = parse('^5:00');
    
    // The ^ creates an IncrementFragment
    const increment = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Increment);
    expect(increment).toBeDefined();
    
    // The 5:00 creates a TimerFragment without forceCountUp
    const timer = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Timer) as TimerFragment;
    expect(timer).toBeDefined();
    expect(timer.forceCountUp).toBe(false);
    expect(timer.value).toBe(5 * 60 * 1000);
    expect(timer.direction).toBe('down');
  });
});
