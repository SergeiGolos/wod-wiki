import { IRuntimeAction } from "./IRuntimeAction";

export class NextChildAction implements IRuntimeAction {
  constructor(public sourceId: number) { }
}
