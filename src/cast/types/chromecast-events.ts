/**
 * Chromecast Event System - Type Definitions
 * 
 * This file defines the event types and interfaces used for communication between
 * the wod-wiki app (sender) and the Chromecast receiver application.
 */

import { ResultSpan } from '@/core/timer.types';

export const CAST_NAMESPACE = "urn:x-cast:com.google.cast.wod-wiki";
/**
 * All supported Chromecast event types
 */
export enum ChromecastEventType {

  HANDSHAKE_ESTABLISHED = 'HANDSHAKE_ESTABLISHED',
  HANDSHAKE_TERMINATED = 'HANDSHAKE_TERMINATED',
  SET_DISPLAY = 'SET_DISPLAY',
  SET_SOUND = 'SET_SOUND',
  SET_DEBUG = 'SET_DEBUG',
  SET_ERROR = 'SET_ERROR',
  HEARTBEAT = 'HEARTBEAT',
  SET_IDLE = 'SET_IDLE',
  RESULT_UPDATED = "RESULT_UPDATED",
}

export class ReceiverEvent implements ChromecastReceiverEvent {
  status: string;
  message: OutputEvent;
  timestamp: Date;
  constructor(status: string, message: OutputEvent) {
    this.status = status;
    this.message = message;
    this.timestamp = new Date();
  }
}

export interface ChromecastReceiverEvent
{
    status: string;
    message: OutputEvent;
    timestamp: Date;
}
// ======== Base Event Interface ========
export interface OutputEvent {
  eventType: ChromecastEventType;
  timestamp: Date
  bag: { [key: string]: any };
}

export class SetDisplayEvent implements OutputEvent {
  constructor(spans: ResultSpan[]) {
    this.timestamp = new Date();    
    this.bag = { spans };
  }
  eventType = ChromecastEventType.SET_DISPLAY;
  timestamp: Date;  
  bag: { [key: string]: any; }  
}
export abstract class ToggleEvent implements OutputEvent {  
  constructor(type: ChromecastEventType, enabled: boolean) {
    this.timestamp = new Date();    
    this.eventType = type;
    this.bag = { enabled };
  }
  eventType: ChromecastEventType;
  timestamp: Date;  
  bag: { [key: string]: any; };
}
export class SetSoundEvent extends ToggleEvent {
  constructor(enabled: boolean) {    
    super(ChromecastEventType.SET_SOUND, enabled)
  }
}
export class SetDebugEvent extends ToggleEvent {
  constructor(enabled: boolean) {
    super(ChromecastEventType.SET_DEBUG, enabled)
  }
}

export class SetErrorEvent implements OutputEvent {
  constructor(errorCode: string, message: string) {
    this.timestamp = new Date();    
    this.eventType = ChromecastEventType.SET_ERROR;
    this.bag = { errorCode, message };
  }
  eventType: ChromecastEventType;
  timestamp: Date;  
  bag: { [key: string]: any; };
}