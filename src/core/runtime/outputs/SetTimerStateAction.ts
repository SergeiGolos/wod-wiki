import { OutputAction } from '../OutputAction';

export enum TimerState {
  STOPPED = 'STOPPED',
  RUNNING_COUNTDOWN = 'RUNNING_COUNTDOWN',
  RUNNING_COUNTUP = 'RUNNING_COUNTUP',
  PAUSED = 'PAUSED'
}

export class SetTimerStateAction extends OutputAction {
  constructor(public state: TimerState, public name: string) {
    super('SET_TIMER_STATE');
  }

  getData() {
    return {
      name: this.name,
      state: this.state
    };
  }
}