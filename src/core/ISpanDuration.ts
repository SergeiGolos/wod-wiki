import { IDuration } from "./IDuration";
import { ITimeSpan } from "./ITimeSpan";
import { DurationSign } from "./types/DurationSign";


export interface ISpanDuration extends IDuration {
  spans: ITimeSpan[];
  sign: DurationSign;
  elapsed(): IDuration;
  remaining(): IDuration | undefined;
}
