import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundBehavior, SOUND_MEMORY_TYPE } from './SoundBehavior';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeBlock } from '../RuntimeBlock';
import { WodScript } from '../../parser/WodScript';
import { JitCompiler } from '../JitCompiler';
import { TimerBehavior } from './TimerBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { PlaySoundAction } from '../actions/PlaySoundAction';

describe('SoundBehavior', () => {
  let runtime: ScriptRuntime;

  beforeEach(() => {
    const script = new WodScript('test', []);
    const compiler = new JitCompiler([]);
    runtime = new ScriptRuntime(script, compiler);
  });

  describe('Configuration Validation', () => {
    it('should throw if direction is invalid', () => {
      expect(() => new SoundBehavior({
        direction: 'invalid' as any,
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      })).toThrow(TypeError);
    });

    it('should throw if countdown timer missing durationMs', () => {
      expect(() => new SoundBehavior({
        direction: 'down',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      })).toThrow(RangeError);
    });

    it('should throw if no cues are provided', () => {
      expect(() => new SoundBehavior({
        direction: 'up',
        cues: []
      })).toThrow(RangeError);
    });

    it('should throw if cue has no id', () => {
      expect(() => new SoundBehavior({
        direction: 'up',
        cues: [{ id: '', threshold: 1000, sound: 'beep' }]
      })).toThrow(TypeError);
    });

    it('should throw if duplicate cue ids exist', () => {
      expect(() => new SoundBehavior({
        direction: 'up',
        cues: [
          { id: 'test', threshold: 1000, sound: 'beep' },
          { id: 'test', threshold: 2000, sound: 'buzzer' }
        ]
      })).toThrow(RangeError);
    });

    it('should throw if cue threshold is negative', () => {
      expect(() => new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: -100, sound: 'beep' }]
      })).toThrow(RangeError);
    });

    it('should throw if cue has no sound', () => {
      expect(() => new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: '' }]
      })).toThrow(TypeError);
    });

    it('should throw if cue volume is out of range', () => {
      expect(() => new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep', volume: 1.5 }]
      })).toThrow(RangeError);
    });

    it('should accept valid configuration', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [
          { id: 'test1', threshold: 1000, sound: 'beep' },
          { id: 'test2', threshold: 2000, sound: 'buzzer', volume: 0.5 }
        ]
      });
      expect(behavior).toBeDefined();
    });
  });

  describe('Memory Initialization', () => {
    it('should allocate sound state memory on push', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      const refs = runtime.memory.search({
        id: null,
        ownerId: block.key.toString(),
        type: `${SOUND_MEMORY_TYPE}-${block.key.toString()}`,
        visibility: 'private'
      });

      expect(refs.length).toBe(1);
    });

    it('should initialize all cues as not triggered', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [
          { id: 'cue1', threshold: 1000, sound: 'beep' },
          { id: 'cue2', threshold: 2000, sound: 'buzzer' }
        ]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      const states = behavior.getAllCueStates();
      expect(states.length).toBe(2);
      expect(states[0].triggered).toBe(false);
      expect(states[1].triggered).toBe(false);
    });
  });

  describe('Count-up Timer Sound Triggering', () => {
    it('should trigger sound when elapsed time >= threshold', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions (including event handler registration)
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // Simulate timer:tick event with elapsed time past threshold
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 1500,
          direction: 'up'
        }
      });

      const cueState = behavior.getCueState('test');
      expect(cueState?.triggered).toBe(true);
    });

    it('should not trigger sound before threshold is reached', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // Simulate timer:tick event before threshold
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 500,
          direction: 'up'
        }
      });

      const cueState = behavior.getCueState('test');
      expect(cueState?.triggered).toBe(false);
    });

    it('should not trigger same cue twice', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // First tick past threshold
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 1500,
          direction: 'up'
        }
      });

      const firstTriggeredAt = behavior.getCueState('test')?.triggeredAt;

      // Second tick
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 2000,
          direction: 'up'
        }
      });

      // Triggered time should not change
      expect(behavior.getCueState('test')?.triggeredAt).toBe(firstTriggeredAt);
    });
  });

  describe('Countdown Timer Sound Triggering', () => {
    it('should trigger sound when remaining time <= threshold', () => {
      const behavior = new SoundBehavior({
        direction: 'down',
        durationMs: 60000,
        cues: [{ id: 'warning', threshold: 10000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // Simulate timer:tick with 9 seconds remaining
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 51000,
          remainingMs: 9000,
          direction: 'down'
        }
      });

      const cueState = behavior.getCueState('warning');
      expect(cueState?.triggered).toBe(true);
    });

    it('should not trigger countdown sound before threshold', () => {
      const behavior = new SoundBehavior({
        direction: 'down',
        durationMs: 60000,
        cues: [{ id: 'warning', threshold: 10000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // Simulate timer:tick with 30 seconds remaining
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 30000,
          remainingMs: 30000,
          direction: 'down'
        }
      });

      const cueState = behavior.getCueState('warning');
      expect(cueState?.triggered).toBe(false);
    });
  });

  describe('Multiple Cues', () => {
    it('should trigger multiple cues in sequence', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [
          { id: 'cue1', threshold: 1000, sound: 'beep' },
          { id: 'cue2', threshold: 2000, sound: 'chime' },
          { id: 'cue3', threshold: 3000, sound: 'buzzer' }
        ]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // First tick at 1.5s
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 1500,
          direction: 'up'
        }
      });

      expect(behavior.getCueState('cue1')?.triggered).toBe(true);
      expect(behavior.getCueState('cue2')?.triggered).toBe(false);
      expect(behavior.getCueState('cue3')?.triggered).toBe(false);

      // Second tick at 2.5s
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 2500,
          direction: 'up'
        }
      });

      expect(behavior.getCueState('cue1')?.triggered).toBe(true);
      expect(behavior.getCueState('cue2')?.triggered).toBe(true);
      expect(behavior.getCueState('cue3')?.triggered).toBe(false);
    });
  });

  describe('Event Filtering', () => {
    it('should ignore events from other blocks', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // Simulate timer:tick event from different block
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: 'other-block-id',
          elapsedMs: 1500,
          direction: 'up'
        }
      });

      const cueState = behavior.getCueState('test');
      expect(cueState?.triggered).toBe(false);
    });

    it('should ignore non-timer:tick events', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // Simulate different event type
      runtime.handle({
        name: 'timer:complete',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 1500
        }
      });

      const cueState = behavior.getCueState('test');
      expect(cueState?.triggered).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all cue states', () => {
      const behavior = new SoundBehavior({
        direction: 'up',
        cues: [
          { id: 'cue1', threshold: 1000, sound: 'beep' },
          { id: 'cue2', threshold: 2000, sound: 'chime' }
        ]
      });
      const block = new RuntimeBlock(runtime, [1], [behavior], 'Timer');

      // Mount and execute returned actions
      const actions = block.mount(runtime);
      for (const action of actions) {
        action.do(runtime);
      }

      // Trigger both cues
      runtime.handle({
        name: 'timer:tick',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          elapsedMs: 3000,
          direction: 'up'
        }
      });

      expect(behavior.getCueState('cue1')?.triggered).toBe(true);
      expect(behavior.getCueState('cue2')?.triggered).toBe(true);

      // Reset
      behavior.reset();

      expect(behavior.getCueState('cue1')?.triggered).toBe(false);
      expect(behavior.getCueState('cue2')?.triggered).toBe(false);
    });
  });

  describe('Configuration Access', () => {
    it('should return a copy of the configuration', () => {
      const config = {
        direction: 'up' as const,
        cues: [{ id: 'test', threshold: 1000, sound: 'beep' }]
      };
      const behavior = new SoundBehavior(config);

      const returnedConfig = behavior.getConfig();
      
      expect(returnedConfig).toEqual(config);
      expect(returnedConfig).not.toBe(config); // Should be a copy
    });
  });
});

describe('PlaySoundAction', () => {
  it('should throw if volume is out of range', () => {
    expect(() => new PlaySoundAction('beep', 1.5)).toThrow(RangeError);
    expect(() => new PlaySoundAction('beep', -0.5)).toThrow(RangeError);
  });

  it('should accept valid volume', () => {
    expect(() => new PlaySoundAction('beep', 0)).not.toThrow();
    expect(() => new PlaySoundAction('beep', 0.5)).not.toThrow();
    expect(() => new PlaySoundAction('beep', 1)).not.toThrow();
  });

  it('should emit sound:play event on do()', () => {
    const script = new WodScript('test', []);
    const compiler = new JitCompiler([]);
    const runtime = new ScriptRuntime(script, compiler);

    const handleSpy = vi.spyOn(runtime, 'handle');
    
    const action = new PlaySoundAction('beep', 0.5, 'test-cue');
    action.do(runtime);

    expect(handleSpy).toHaveBeenCalledWith(expect.objectContaining({
      name: 'sound:play',
      data: {
        sound: 'beep',
        volume: 0.5,
        cueId: 'test-cue'
      }
    }));
  });
});
