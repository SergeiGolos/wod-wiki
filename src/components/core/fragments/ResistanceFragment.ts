import { SourceCodeMetadata, StatementFragment } from "@/types/timer.types";

export class DistanceFragment implements StatementFragment {
  constructor(public value: string, public units: string, public meta?: SourceCodeMetadata) { }
  type: string = "distance";
  toPart: () => string = () => `${this.value}${this.units}`;
}
export class ResistanceFragment implements StatementFragment {
  constructor(public value: string, public units: string, public meta?: SourceCodeMetadata) { }
  type: string = "resistance";
  toPart: () => string = () => `${this.value}${this.units}`;
}
