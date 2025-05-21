import { IRuntimeEvent } from "./IRuntimeEvent";


export interface IRuntimeLog extends IRuntimeEvent {
  blockId: string;
  blockKey: string;
}
