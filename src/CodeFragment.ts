import { CodeMetadata } from "./CodeMetadata";


export interface CodeFragment {
  readonly type: string; // Retained for now, will be replaced by fragmentType
  readonly meta?: CodeMetadata;
  readonly fragmentType: FragmentType;
  // Pure data interface - no metric methods
}

export enum FragmentType {
  Timer = 'timer',
  Rep = 'rep',
  Effort = 'effort',
  Distance = 'distance',
  Rounds = 'rounds',
  Action = 'action',
  Increment = 'increment',
  Lap = 'lap',
  Text = 'text',
  Resistance = 'resistance'
}
