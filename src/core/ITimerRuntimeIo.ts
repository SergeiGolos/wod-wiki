import { Subject, Observable } from "rxjs";
import { IRuntimeEvent } from "./IRuntimeEvent";
import { ITimerRuntime } from "./ITimerRuntime";
import { OutputEvent } from "./OutputEvent";

export interface ITimerRuntimeIo extends ITimerRuntime {
  input$: Subject<IRuntimeEvent>;
  tick$: Observable<IRuntimeEvent>;
  output$: Observable<OutputEvent>;
}
