import { OutputEvent } from "./OutputEvent";



export type IRuntimeSync = (runtimeBlock: OutputEvent) => void;
