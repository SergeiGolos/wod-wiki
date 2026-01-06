import { ICodeStatement } from '@/core/models/CodeStatement';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { FragmentType } from '@/core/models/CodeFragment';
import {
  IBehaviorProvider,
  IBehaviorContribution,
  ICompilationContext,
  BehaviorProviderPriority,
} from '../IBehaviorProvider';
import { SoundBehavior } from '../../../behaviors/SoundBehavior';
import { PREDEFINED_SOUNDS, SoundCue } from '../../../models/SoundModels';
import { TimerFragment } from '../../fragments/TimerFragment';

/**
 * Creates default countdown sound cues for a timer with specified duration.
 * Includes: 3-2-1 tick countdown and final buzzer.
 */
function createCountdownSoundCues(durationMs: number): SoundCue[] {
  const cues: SoundCue[] = [];
  if (durationMs >= 3000)
    cues.push({ id: '3-sec', threshold: 3000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
  if (durationMs >= 2000)
    cues.push({ id: '2-sec', threshold: 2000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
  if (durationMs >= 1000)
    cues.push({ id: '1-sec', threshold: 1000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
  cues.push({ id: 'complete', threshold: 0, sound: PREDEFINED_SOUNDS.BUZZER, volume: 1.0 });
  return cues;
}

/**
 * Creates default count-up sound cues for a timer.
 */
function createCountUpSoundCues(): SoundCue[] {
  return [{ id: 'start', threshold: 0, sound: PREDEFINED_SOUNDS.START, volume: 1.0 }];
}

/**
 * Provides SoundBehavior for blocks with timers.
 */
export class AudioProvider implements IBehaviorProvider {
  readonly id = 'audio';
  readonly name = 'Audio Provider';
  readonly priority = BehaviorProviderPriority.AUDIO;

  canProvide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    context: ICompilationContext
  ): boolean {
    if (context.isExcluded('SoundBehavior')) {
      return false;
    }
    return statement.hasFragment(FragmentType.Timer);
  }

  provide(
    statement: ICodeStatement,
    _runtime: IScriptRuntime,
    _context: ICompilationContext
  ): IBehaviorContribution {
    const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
    const direction = timerFragment?.direction || 'up';
    const durationMs = (timerFragment?.value as number) || 0;

    let config: any;

    if (direction === 'down' && durationMs > 0) {
      config = {
        direction: 'down' as const,
        durationMs,
        cues: createCountdownSoundCues(durationMs),
      };
    } else {
      config = {
        direction: 'up' as const,
        cues: createCountUpSoundCues(),
      };
    }

    return {
      behaviors: [new SoundBehavior(config)],
    };
  }
}
