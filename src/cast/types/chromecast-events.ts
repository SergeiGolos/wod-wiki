/**
 * Chromecast Event System - Type Definitions
 * 
 * This file defines the event types and interfaces used for communication between
 * the wod-wiki app (sender) and the Chromecast receiver application.
 */

import { OutputEvent, OutputEventType } from '@/core/timer.types';
export const CAST_NAMESPACE = "urn:x-cast:com.google.cast.wod-wiki";
/**
 * All supported Chromecast event types
 */
export type ChromecastEventType =
  | 'HANDSHAKE_ESTABLISHED'
  | 'HANDSHAKE_TERMINATED'
  | OutputEventType;


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
