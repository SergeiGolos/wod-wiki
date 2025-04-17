/**
 * Chromecast Event System - Type Definitions
 * 
 * This file defines the event types and interfaces used for communication between
 * the wod-wiki app (sender) and the Chromecast receiver application.
 */

import { MetricValue, TimerFromSeconds } from '@/core/timer.types';

// Protocol version for backward compatibility
export const CHROMECAST_PROTOCOL_VERSION = '1.0.0';

// Custom message namespace
export const CAST_NAMESPACE = 'urn:x-cast:com.google.cast.wod-wiki';

// ======== Clock Event Types ========

/**
 * All supported Chromecast event types
 */
export enum ChromecastEventType {
  // Clock state events
  CLOCK_RUNNING = 'CLOCK_RUNNING',
  CLOCK_PAUSED = 'CLOCK_PAUSED',
  CLOCK_IDLE = 'CLOCK_IDLE',
  
  // Connection events
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
  
  // Status events
  STATUS_REQUEST = 'STATUS_REQUEST',
  STATUS_RESPONSE = 'STATUS_RESPONSE',
}

// ======== Base Event Interface ========

/**
 * Base interface for all Chromecast events
 */
export interface ChromecastEventBase {
  eventType: ChromecastEventType;
  timestamp: string; // ISO timestamp
  version: string;   // Protocol version
}

// ======== Clock Running Event ========

/**
 * Data payload for a running clock event
 */
export interface ClockRunningPayload {
  timerValue: number;       // Current time in seconds
  timerDisplay: string;     // Formatted time string (mm:ss or hh:mm:ss)
  
  // Workout information
  effort: string;           // Current exercise name
  repetitions?: number;     // Current rep count if applicable
  resistance?: MetricValue; // Weight/resistance if applicable
  distance?: MetricValue;   // Distance if applicable
  
  // Round information
  roundCurrent: number;     // Current round number
  roundTotal?: number;      // Total rounds (may be undefined for AMRAP)
  isAMRAP: boolean;         // Whether this is an "As Many Rounds As Possible" workout
  
  // Progress information
  estimatedCompletionPercentage?: number; // 0-100 if known
}

/**
 * Event sent when the clock is actively running
 */
export interface ClockRunningEvent extends ChromecastEventBase {
  eventType: ChromecastEventType.CLOCK_RUNNING;
  data: ClockRunningPayload;
}

// ======== Clock Paused Event ========

/**
 * Data payload for a paused clock event
 */
export interface ClockPausedPayload extends Omit<ClockRunningPayload, 'estimatedCompletionPercentage'> {
  pauseDuration?: number;   // How long the clock has been paused in seconds
}

/**
 * Event sent when the clock is paused
 */
export interface ClockPausedEvent extends ChromecastEventBase {
  eventType: ChromecastEventType.CLOCK_PAUSED;
  data: ClockPausedPayload;
}

// ======== Clock Idle Event ========

/**
 * Data payload for an idle clock event
 */
export interface ClockIdlePayload {
  currentTime: string;      // Formatted current time (hh:mm)
  message?: string;         // Optional status or welcome message
}

/**
 * Event sent when the clock is idle (no active workout)
 */
export interface ClockIdleEvent extends ChromecastEventBase {
  eventType: ChromecastEventType.CLOCK_IDLE;
  data: ClockIdlePayload;
}

// ======== Connection Events ========

/**
 * Event sent when establishing a connection
 */
export interface ConnectEvent extends ChromecastEventBase {
  eventType: ChromecastEventType.CONNECT;
  data: {
    clientId: string;       // Unique identifier for the sender
    clientName?: string;    // Optional human-readable name
  }
}

/**
 * Event sent when disconnecting
 */
export interface DisconnectEvent extends ChromecastEventBase {
  eventType: ChromecastEventType.DISCONNECT;
  data: {
    clientId: string;
  }
}

// ======== Status Events ========

/**
 * Event sent to request current receiver status
 */
export interface StatusRequestEvent extends ChromecastEventBase {
  eventType: ChromecastEventType.STATUS_REQUEST;
}

/**
 * Data payload for status response
 */
export interface StatusResponsePayload {
  receiverState: 'RUNNING' | 'PAUSED' | 'IDLE';
  currentTime?: number;     // Current timer value in seconds if applicable
  isConnected: boolean;     // Whether the receiver is connected
  version: string;          // Receiver application version
}

/**
 * Event sent in response to a status request
 */
export interface StatusResponseEvent extends ChromecastEventBase {
  eventType: ChromecastEventType.STATUS_RESPONSE;
  data: StatusResponsePayload;
}

// ======== Union Type for All Events ========

/**
 * Union type of all possible Chromecast events
 */
export type ChromecastEvent = 
  | ClockRunningEvent 
  | ClockPausedEvent 
  | ClockIdleEvent
  | ConnectEvent
  | DisconnectEvent
  | StatusRequestEvent
  | StatusResponseEvent;

// ======== Helper Functions ========

/**
 * Creates a base event object with common fields
 */
export function createBaseEvent(type: ChromecastEventType): ChromecastEventBase {
  return {
    eventType: type,
    timestamp: new Date().toISOString(),
    version: CHROMECAST_PROTOCOL_VERSION
  };
}

/**
 * Creates a ClockRunningEvent with the given workout data
 */
export function createClockRunningEvent(
  timerValue: number, 
  timerDisplay: string,
  effort: string,
  roundCurrent: number,
  options?: Partial<Omit<ClockRunningPayload, 'timerValue' | 'timerDisplay' | 'effort' | 'roundCurrent'>>
): ClockRunningEvent {
  return {
    ...createBaseEvent(ChromecastEventType.CLOCK_RUNNING),
    data: {
      timerValue,
      timerDisplay,
      effort,
      roundCurrent,
      isAMRAP: options?.isAMRAP ?? false,
      ...options
    }
  };
}

/**
 * Creates a ClockPausedEvent with the given workout data
 */
export function createClockPausedEvent(
  timerValue: number,
  timerDisplay: string,
  effort: string,
  roundCurrent: number,
  options?: Partial<Omit<ClockPausedPayload, 'timerValue' | 'timerDisplay' | 'effort' | 'roundCurrent'>>
): ClockPausedEvent {
  return {
    ...createBaseEvent(ChromecastEventType.CLOCK_PAUSED),
    data: {
      timerValue,
      timerDisplay,
      effort,
      roundCurrent,
      isAMRAP: options?.isAMRAP ?? false,
      ...options
    }
  };
}

/**
 * Creates a ClockIdleEvent
 */
export function createClockIdleEvent(
  currentTime: string,
  message?: string
): ClockIdleEvent {
  return {
    ...createBaseEvent(ChromecastEventType.CLOCK_IDLE),
    data: {
      currentTime,
      message
    }
  };
}

/**
 * Type guard to check if an event is a ClockRunningEvent
 */
export function isClockRunningEvent(event: ChromecastEvent): event is ClockRunningEvent {
  return event.eventType === ChromecastEventType.CLOCK_RUNNING;
}

/**
 * Type guard to check if an event is a ClockPausedEvent
 */
export function isClockPausedEvent(event: ChromecastEvent): event is ClockPausedEvent {
  return event.eventType === ChromecastEventType.CLOCK_PAUSED;
}

/**
 * Type guard to check if an event is a ClockIdleEvent
 */
export function isClockIdleEvent(event: ChromecastEvent): event is ClockIdleEvent {
  return event.eventType === ChromecastEventType.CLOCK_IDLE;
}
