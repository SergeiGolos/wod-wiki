import { ITimerDisplayEntry } from '@/clock/types/DisplayTypes';

export interface CastSyncState {
  execution: {
    elapsedTime: number;
    status: string;
    stepCount: number;
  };
  display: {
    primaryTimer?: ITimerDisplayEntry;
    subLabel?: string;
    secondaryTimers?: ITimerDisplayEntry[];
    isRunning: boolean;
    // Serialized versions of stack items if needed
    stackLabels?: string[];
  };
}
