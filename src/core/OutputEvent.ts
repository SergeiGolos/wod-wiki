import { OutputEventType } from "./OutputEventType";



export interface OutputEvent {
  eventType: OutputEventType;
  timestamp: Date;
  bag: { [key: string]: any; };
}
