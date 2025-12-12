import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../md-timer';
import { ActionFragment } from '../../fragments/ActionFragment';
import { FragmentType } from '../../core/models/CodeFragment';

const parse = (source: string) => new MdTimerRuntime().read(source);

describe('Action fragment parsing', () => {
  it('parses unpinned action and preserves name/raw', () => {
    const script = parse('[:start]');
    const action = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Action) as ActionFragment;

    expect(action).toBeDefined();
    expect(action.isPinned).toBe(false);
    expect(action.name).toBe('start');
    expect(action.raw).toBe('start');
    expect(action.value).toBe('start');
    expect(action.sourceLine).toBe(1);
  });

  it('parses pinned action ([:!action]) and strips pin marker from name', () => {
    const script = parse('[:!reset]');
    const action = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Action) as ActionFragment;

    expect(action).toBeDefined();
    expect(action.isPinned).toBe(true);
    expect(action.name).toBe('reset');
    expect(action.raw).toBe('!reset');
  });

  it('keeps word spacing and hyphens intact inside action fence', () => {
    const script = parse('[:for time-fast]');
    const action = script.statements[0].fragments.find(f => f.fragmentType === FragmentType.Action) as ActionFragment;

    expect(action.raw).toBe('for time-fast');
    expect(action.name).toBe('for time-fast');
    expect(action.isPinned).toBe(false);
  });
});