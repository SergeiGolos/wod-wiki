import { ResultSpan } from "./Timespan";

export type ElapsedState = {
  elapsed: number;
  duration: number;
  remaining?: number;
  spans?: ResultSpan[];
  state: string;
};
