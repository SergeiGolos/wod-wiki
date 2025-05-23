import { SetTimerStateAction, TimerState } from '../../outputs/SetTimerStateAction';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { Subject } from 'rxjs';

describe('SetTimerStateAction', () => {
  const mockRuntime = {} as ITimerRuntime;
  const mockSubject = {} as Subject<any>;

  test('creates SET_TIMER_STATE event with correct state and target', () => {
    // Test each timer state
    const states = [
      TimerState.RUNNING_COUNTDOWN,
      TimerState.RUNNING_COUNTUP,
      TimerState.PAUSED,
      TimerState.STOPPED
    ];

    states.forEach(state => {
      const action = new SetTimerStateAction(state, 'primary');
      const events = action.write(mockRuntime, mockSubject);

      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe('SET_TIMER_STATE');
      expect(events[0].bag.state).toBe(state);
      expect(events[0].bag.target).toBe('primary');
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });
  });

  test('uses default target when not specified', () => {
    const action = new SetTimerStateAction(TimerState.RUNNING_COUNTDOWN);
    const events = action.write(mockRuntime, mockSubject);

    expect(events[0].bag.target).toBe('primary');
  });
});