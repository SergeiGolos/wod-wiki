import { useDisplayStack } from './useDisplayStack';
import { ITimerDisplayEntry } from '../types/DisplayTypes';

export interface ITimerHierarchy {
  root: ITimerDisplayEntry | undefined;
  segment: ITimerDisplayEntry | undefined;
  leaf: ITimerDisplayEntry | undefined;
}

export function useTimerHierarchy(): ITimerHierarchy {
  const displayState = useDisplayStack();
  const timerStack = displayState.timerStack;

  return {
    root: timerStack.find(t => t.role === 'root'),
    segment: timerStack.find(t => t.role === 'segment'),
    leaf: timerStack.find(t => t.role === 'leaf'),
  };
}
