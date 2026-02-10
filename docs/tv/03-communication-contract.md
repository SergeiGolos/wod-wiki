# Communication Contract: Web ↔ Android TV

## Overview

This document defines the communication protocol between the WOD Wiki web application (caster) and the Android TV application (receiver). The protocol uses WebSocket for real-time bidirectional communication through a relay server.

---

## 1. Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Web App       │◀──────▶│  Relay Server   │◀──────▶│   Android TV    │
│   (Caster)      │   WS   │                 │   WS   │   (Receiver)    │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                                                       │
        │                   ┌─────────────────┐                │
        │                   │   Message       │                │
        └──────────────────▶│   Protocol      │◀───────────────┘
                            │                 │
                            └─────────────────┘
```

### Why a Relay Server?

1. **NAT Traversal**: TV devices are typically behind NAT; direct connections are difficult
2. **Discovery**: Centralized discovery of available receivers
3. **Session Management**: Track active sessions and handle reconnections
4. **Future Scaling**: Support multiple casters/receivers and cloud sync

---

## 2. Protocol Types

### 2.1 Base Message Structure

```typescript
// src/services/cast/CastProtocol.ts

/**
 * Base message structure for all cast protocol messages
 */
export interface CastMessage {
  /** Message type identifier */
  type: CastMessageType;
  
  /** Unique message ID for request/response correlation */
  messageId: string;
  
  /** Session ID (if within a session) */
  sessionId?: string;
  
  /** Timestamp when message was created */
  timestamp: number;
  
  /** Message payload (varies by type) */
  payload: unknown;
}

/**
 * All possible message types in the cast protocol
 */
export type CastMessageType = 
  // Connection & Discovery
  | 'register'              // Client registers with relay
  | 'register-ack'          // Relay acknowledges registration
  | 'discover'              // Caster requests available receivers
  | 'target-discovered'     // Relay reports available receiver
  | 'target-lost'           // Receiver disconnected from relay
  
  // Session Lifecycle
  | 'cast-request'          // Caster requests to start casting
  | 'cast-accepted'         // Receiver accepts cast request
  | 'cast-rejected'         // Receiver rejects cast request
  | 'cast-stop'             // Either party stops the session
  | 'session-ended'         // Relay confirms session ended
  
  // Runtime State Sync
  | 'state-update'          // Caster sends display state
  | 'state-ack'             // Receiver acknowledges state update
  
  // Event Forwarding
  | 'event-from-receiver'   // Receiver sends user input event
  | 'event-ack'             // Caster acknowledges event
  
  // Metrics & Heart Rate
  | 'metrics-update'        // Receiver sends metrics (including HR)
  | 'metrics-batch'         // Receiver sends batched metrics
  
  // Workout Completion
  | 'workout-complete'      // Receiver signals workout done
  | 'completion-ack'        // Caster acknowledges completion
  
  // Health & Error
  | 'ping'                  // Keep-alive ping
  | 'pong'                  // Keep-alive response
  | 'error'                 // Error message
  | 'reconnect';            // Request to reconnect session
```

---

## 3. Message Definitions

### 3.1 Connection & Discovery

#### Register

Client (web or TV) registers with the relay server.

```typescript
interface RegisterMessage {
  type: 'register';
  messageId: string;
  timestamp: number;
  payload: {
    /** Client type */
    clientType: 'caster' | 'receiver';
    
    /** Client identifier (persistent across sessions) */
    clientId: string;
    
    /** Human-readable name */
    clientName: string;
    
    /** Client capabilities */
    capabilities: ClientCapabilities;
    
    /** Protocol version */
    protocolVersion: string;
  };
}

interface ClientCapabilities {
  /** Supports heart rate monitor data */
  heartRateMonitor: boolean;
  
  /** Maximum heart rate monitors supported */
  maxHeartRateDevices?: number;
  
  /** Supports multiple users in single session */
  multiUser: boolean;
  
  /** Supported workout features */
  features: string[];
}

// Example:
{
  type: 'register',
  messageId: 'msg-001',
  timestamp: 1701345600000,
  payload: {
    clientType: 'receiver',
    clientId: 'android-tv-living-room',
    clientName: 'Living Room TV',
    capabilities: {
      heartRateMonitor: true,
      maxHeartRateDevices: 4,
      multiUser: false,
      features: ['basic-timer', 'rounds', 'amrap', 'emom']
    },
    protocolVersion: '1.0.0'
  }
}
```

#### Register Acknowledgment

```typescript
interface RegisterAckMessage {
  type: 'register-ack';
  messageId: string;
  timestamp: number;
  payload: {
    /** Registration successful */
    success: boolean;
    
    /** Assigned relay ID */
    relayId: string;
    
    /** Error if failed */
    error?: string;
    
    /** Server capabilities */
    serverCapabilities: {
      maxSessionDuration: number;  // ms
      maxMetricsBatchSize: number;
      heartbeatInterval: number;   // ms
    };
  };
}
```

#### Discover

Caster requests available receivers.

```typescript
interface DiscoverMessage {
  type: 'discover';
  messageId: string;
  timestamp: number;
  payload: {
    /** Filter by required capabilities */
    requiredCapabilities?: Partial<ClientCapabilities>;
  };
}
```

#### Target Discovered

Relay reports an available receiver.

```typescript
interface TargetDiscoveredMessage {
  type: 'target-discovered';
  messageId: string;
  timestamp: number;
  payload: {
    /** Target identifier */
    targetId: string;
    
    /** Target name */
    name: string;
    
    /** Target type */
    type: 'android-tv' | 'web-receiver';
    
    /** Target capabilities */
    capabilities: ClientCapabilities;
    
    /** Whether currently in a session */
    inSession: boolean;
  };
}
```

---

### 3.2 Session Lifecycle

#### Cast Request

Caster requests to start casting to a receiver.

```typescript
interface CastRequestMessage {
  type: 'cast-request';
  messageId: string;
  timestamp: number;
  payload: {
    /** Target receiver ID */
    targetId: string;
    
    /** Proposed session ID */
    sessionId: string;
    
    /** Workout definition */
    workout: WorkoutDefinition;
    
    /** Caster information */
    caster: {
      id: string;
      name: string;
    };
    
    /** Session configuration */
    config: SessionConfig;
  };
}

interface WorkoutDefinition {
  /** Raw workout script (WOD syntax) */
  script: string;
  
  /** Parsed workout name/title */
  name?: string;
  
  /** Pre-parsed display state (optional, for quick start) */
  initialState?: IDisplayStackState;
}

interface SessionConfig {
  /** Allow receiver to control workout (play/pause/next) */
  receiverControlEnabled: boolean;
  
  /** Sync heart rate data */
  heartRateSyncEnabled: boolean;
  
  /** Metrics sync interval (ms) */
  metricsSyncInterval: number;
  
  /** Auto-stop on caster disconnect */
  autoStopOnDisconnect: boolean;
}
```

#### Cast Accepted

Receiver accepts the cast request.

```typescript
interface CastAcceptedMessage {
  type: 'cast-accepted';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Receiver is ready */
    ready: boolean;
    
    /** Connected heart rate devices (if any) */
    heartRateDevices?: HeartRateDeviceInfo[];
    
    /** Users on the receiver */
    users: ReceiverUser[];
  };
}

interface HeartRateDeviceInfo {
  id: string;
  name: string;
  assignedUserId?: string;
  batteryLevel?: number;
}

interface ReceiverUser {
  id: string;
  name: string;
  isHost: boolean;
  heartRateDeviceId?: string;
}
```

#### Cast Rejected

Receiver rejects the cast request.

```typescript
interface CastRejectedMessage {
  type: 'cast-rejected';
  messageId: string;
  timestamp: number;
  payload: {
    sessionId: string;
    reason: 'busy' | 'incompatible' | 'user-declined' | 'error';
    message?: string;
  };
}
```

#### Cast Stop

Either party requests to stop the session.

```typescript
interface CastStopMessage {
  type: 'cast-stop';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Who initiated the stop */
    initiatedBy: 'caster' | 'receiver';
    
    /** Reason for stopping */
    reason: 'user-requested' | 'workout-complete' | 'error' | 'timeout';
    
    /** Final metrics to sync (if stopping mid-workout) */
    finalMetrics?: ICodeFragment[];
  };
}
```

---

### 3.3 Runtime State Synchronization

#### State Update

Caster sends display state updates to receiver.

```typescript
interface StateUpdateMessage {
  type: 'state-update';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Complete display stack state */
    displayState: IDisplayStackState;
    
    /** Sequence number for ordering */
    sequenceNumber: number;
    
    /** Delta from last state (optional optimization) */
    delta?: DisplayStateDelta;
  };
}

interface DisplayStateDelta {
  /** Changed timer stack entries */
  timerStackChanges?: {
    added?: ITimerDisplayEntry[];
    removed?: string[];  // IDs
    modified?: Partial<ITimerDisplayEntry>[];
  };
  
  /** Changed card stack entries */
  cardStackChanges?: {
    added?: IDisplayCardEntry[];
    removed?: string[];  // IDs
    modified?: Partial<IDisplayCardEntry>[];
  };
  
  /** Changed workout state */
  workoutStateChanged?: boolean;
  
  /** Changed round info */
  roundChanged?: boolean;
}
```

#### State Acknowledgment

Receiver acknowledges state update.

```typescript
interface StateAckMessage {
  type: 'state-ack';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Acknowledged sequence number */
    sequenceNumber: number;
    
    /** Processing latency (ms) */
    processingTime: number;
  };
}
```

---

### 3.4 Event Forwarding

#### Event from Receiver

Receiver forwards user input events to caster.

```typescript
interface EventFromReceiverMessage {
  type: 'event-from-receiver';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Event data matching IEvent interface */
    event: {
      name: EventName;
      timestamp: number;
      data?: unknown;
    };
    
    /** User who triggered the event (for multi-user) */
    userId?: string;
  };
}

type EventName = 
  | 'start'       // Start/resume workout
  | 'pause'       // Pause workout
  | 'stop'        // Stop workout
  | 'next'        // Advance to next segment
  | 'reset'       // Reset current segment
  | 'tick';       // Timer tick (not typically sent)
```

---

### 3.5 Metrics & Heart Rate

#### Metrics Update

Receiver sends individual metric update.

```typescript
interface MetricsUpdateMessage {
  type: 'metrics-update';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Runtime metric */
    metric: ICodeFragment;
    
    /** Source user (for multi-user) */
    userId?: string;
  };
}
```

#### Metrics Batch

Receiver sends batched metrics (more efficient for high-frequency data like heart rate).

```typescript
interface MetricsBatchMessage {
  type: 'metrics-batch';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Batch of metrics */
    metrics: ICodeFragment[];
    
    /** Heart rate data points (high-frequency) */
    heartRateData: HeartRateDataPoint[];
    
    /** Batch start time */
    batchStartTime: number;
    
    /** Batch end time */
    batchEndTime: number;
  };
}

interface HeartRateDataPoint {
  /** Timestamp of reading */
  timestamp: number;
  
  /** Heart rate in BPM */
  bpm: number;
  
  /** Device that recorded this */
  deviceId: string;
  
  /** User this reading belongs to */
  userId?: string;
  
  /** RR intervals if available (for HRV) */
  rrIntervals?: number[];
}
```

---

### 3.6 Workout Completion

#### Workout Complete

Receiver signals workout completion with final data.

```typescript
interface WorkoutCompleteMessage {
  type: 'workout-complete';
  messageId: string;
  sessionId: string;
  timestamp: number;
  payload: {
    /** Completion status */
    status: 'completed' | 'stopped' | 'failed';
    
    /** Completion time */
    completionTime: number;
    
    /** Total workout duration (ms) */
    totalDuration: number;
    
    /** Final execution log */
    executionLog: ExecutionRecord[];
    
    /** All collected metrics */
    metrics: ICodeFragment[];
    
    /** Complete heart rate data */
    heartRateData: HeartRateDataPoint[];
    
    /** Summary statistics */
    summary: WorkoutSummary;
  };
}

interface WorkoutSummary {
  /** Total rounds completed */
  roundsCompleted: number;
  
  /** Total reps */
  totalReps?: number;
  
  /** Heart rate summary (per user if multi-user) */
  heartRateSummary?: HeartRateSummary[];
  
  /** Calories burned (estimated) */
  caloriesBurned?: number;
}

interface HeartRateSummary {
  userId?: string;
  deviceId: string;
  avgBpm: number;
  maxBpm: number;
  minBpm: number;
  timeInZones: {
    zone1: number;  // ms in zone
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
  };
}
```

---

### 3.7 Health & Error Messages

#### Ping/Pong

Keep-alive messages.

```typescript
interface PingMessage {
  type: 'ping';
  messageId: string;
  timestamp: number;
  payload: {
    /** Sender's current time */
    clientTime: number;
  };
}

interface PongMessage {
  type: 'pong';
  messageId: string;
  timestamp: number;
  payload: {
    /** Original ping timestamp */
    originalTime: number;
    
    /** Server time for latency calculation */
    serverTime: number;
  };
}
```

#### Error

Error notification.

```typescript
interface ErrorMessage {
  type: 'error';
  messageId: string;
  sessionId?: string;
  timestamp: number;
  payload: {
    /** Error code */
    code: ErrorCode;
    
    /** Human-readable message */
    message: string;
    
    /** Whether error is recoverable */
    recoverable: boolean;
    
    /** Suggested action */
    action?: 'retry' | 'reconnect' | 'abort';
    
    /** Additional context */
    context?: unknown;
  };
}

type ErrorCode = 
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'TARGET_NOT_FOUND'
  | 'TARGET_BUSY'
  | 'PROTOCOL_ERROR'
  | 'INVALID_MESSAGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';
```

#### Reconnect

Request to reconnect to an existing session.

```typescript
interface ReconnectMessage {
  type: 'reconnect';
  messageId: string;
  timestamp: number;
  payload: {
    /** Session to reconnect to */
    sessionId: string;
    
    /** Client's last known sequence number */
    lastSequenceNumber: number;
    
    /** Client ID for verification */
    clientId: string;
  };
}
```

---

## 4. Data Types Reference

### 4.1 Shared Types from Web App

These types are shared between web and TV apps:

```typescript
// From src/clock/types/DisplayTypes.ts
export interface IDisplayStackState {
  timerStack: ITimerDisplayEntry[];
  cardStack: IDisplayCardEntry[];
  workoutState: 'idle' | 'running' | 'paused' | 'complete';
  totalElapsedMs?: number;
  currentRound?: number;
  totalRounds?: number;
}

export interface ITimerDisplayEntry {
  id: string;
  ownerId: string;
  timerMemoryId: string;
  label?: string;
  format: 'countdown' | 'countup';
  durationMs?: number;
  buttons?: IDisplayButton[];
  priority?: number;
}

export interface IDisplayCardEntry {
  id: string;
  ownerId: string;
  type: DisplayCardType;
  title?: string;
  subtitle?: string;
  metrics?: IDisplayMetric[];
  componentId?: string;
  componentProps?: Record<string, unknown>;
  buttons?: IDisplayButton[];
  priority?: number;
}

// From src/core/models/CodeFragment.ts
export interface ICodeFragment {
  readonly fragmentType: FragmentType;
  readonly type: string;
  readonly value?: unknown;
  readonly image?: string;
  readonly origin?: FragmentOrigin;
  readonly behavior?: MetricBehavior;
  readonly meta?: CodeMetadata;
}

// From src/runtime/models/ExecutionRecord.ts
export interface ExecutionRecord {
  id: string;
  blockId: string;
  parentId: string | null;
  type: string;
  label: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'failed';
  metrics: ICodeFragment[];
}
```

---

## 5. Message Flow Diagrams

### 5.1 Connection & Discovery Flow

```
Caster                    Relay                    Receiver
   │                        │                         │
   │─── register ──────────▶│                         │
   │◀── register-ack ───────│                         │
   │                        │                         │
   │                        │◀──── register ──────────│
   │                        │───── register-ack ─────▶│
   │                        │                         │
   │─── discover ──────────▶│                         │
   │◀── target-discovered ──│                         │
   │                        │                         │
```

### 5.2 Session Start Flow

```
Caster                    Relay                    Receiver
   │                        │                         │
   │─── cast-request ──────▶│                         │
   │                        │─── cast-request ───────▶│
   │                        │                         │
   │                        │◀── cast-accepted ───────│
   │◀── cast-accepted ──────│                         │
   │                        │                         │
   │─── state-update ──────▶│                         │
   │                        │─── state-update ───────▶│
   │                        │◀── state-ack ───────────│
   │◀── state-ack ──────────│                         │
   │                        │                         │
```

### 5.3 Runtime Event Flow

```
Caster                    Relay                    Receiver
   │                        │                         │
   │                        │◀── event-from-receiver ─│  (User presses "Start")
   │◀── event-from-receiver │                         │
   │                        │                         │
   │    [Process event]     │                         │
   │                        │                         │
   │─── state-update ──────▶│                         │
   │                        │─── state-update ───────▶│
   │                        │◀── state-ack ───────────│
   │◀── state-ack ──────────│                         │
   │                        │                         │
```

### 5.4 Heart Rate Sync Flow

```
Caster                    Relay                    Receiver
   │                        │                         │
   │                        │                         │ [BLE: HR = 125]
   │                        │◀── metrics-batch ───────│
   │◀── metrics-batch ──────│                         │
   │                        │                         │
   │    [Store HR data]     │                         │
   │                        │                         │
   │                        │                         │ [BLE: HR = 128]
   │                        │◀── metrics-batch ───────│
   │◀── metrics-batch ──────│                         │
   │                        │                         │
```

### 5.5 Workout Completion Flow

```
Caster                    Relay                    Receiver
   │                        │                         │
   │                        │                         │ [Workout finishes]
   │                        │◀── workout-complete ────│
   │◀── workout-complete ───│                         │
   │                        │                         │
   │    [Merge metrics]     │                         │
   │    [Exit cast mode]    │                         │
   │                        │                         │
   │─── completion-ack ────▶│                         │
   │                        │─── completion-ack ─────▶│
   │                        │                         │
   │─── cast-stop ─────────▶│                         │
   │                        │─── session-ended ──────▶│
   │◀── session-ended ──────│                         │
   │                        │                         │
```

---

## 6. Relay Server Specification

### 6.1 Responsibilities

1. **Client Registration**: Track connected casters and receivers
2. **Discovery**: Match casters with available receivers
3. **Message Routing**: Forward messages between paired clients
4. **Session Management**: Track active sessions, handle timeouts
5. **Reconnection**: Support session recovery after disconnects

### 6.2 API Endpoints

```
WebSocket: wss://cast.wod.wiki/relay

Optional REST endpoints:
  GET  /health              - Server health check
  GET  /sessions            - List active sessions (admin)
  POST /sessions/:id/kill   - Force end a session (admin)
```

### 6.3 Session State Machine

```
     ┌──────────────────────────────────────────────┐
     │                                              │
     ▼                                              │
┌─────────┐    cast-request    ┌─────────────┐     │
│ IDLE    │───────────────────▶│ PENDING     │     │
└─────────┘                    └─────────────┘     │
                                     │             │
                          cast-accepted│             │
                                     ▼             │
                               ┌─────────────┐     │
                               │ ACTIVE      │     │
                               └─────────────┘     │
                                     │             │
                    ┌────────────────┼────────────┐│
                    │                │            ││
        workout-complete       cast-stop      error││
                    │                │            ││
                    ▼                ▼            ▼│
               ┌─────────┐    ┌─────────┐    ┌────┴────┐
               │COMPLETE │    │ STOPPED │    │ ERROR   │
               └─────────┘    └─────────┘    └─────────┘
                    │                │            │
                    └────────────────┴────────────┘
                                     │
                                     ▼
                               ┌─────────┐
                               │ ENDED   │
                               └─────────┘
```

### 6.4 Implementation Notes

```typescript
// Relay server session tracking
interface RelaySession {
  id: string;
  state: 'pending' | 'active' | 'complete' | 'stopped' | 'error' | 'ended';
  casterId: string;
  casterSocket: WebSocket;
  receiverId: string;
  receiverSocket: WebSocket;
  workoutScript: string;
  createdAt: number;
  lastActivityAt: number;
  sequenceNumber: number;
}

// Relay server configuration
const RELAY_CONFIG = {
  sessionTimeout: 4 * 60 * 60 * 1000,  // 4 hours max session
  idleTimeout: 30 * 60 * 1000,         // 30 min idle timeout
  heartbeatInterval: 30 * 1000,        // 30 sec ping interval
  maxMessageSize: 1024 * 1024,         // 1MB max message
  reconnectWindow: 60 * 1000,          // 1 min to reconnect
};
```

---

## 7. Protocol Versioning

### 7.1 Version Format

`MAJOR.MINOR.PATCH` (e.g., `1.0.0`)

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes

### 7.2 Version Negotiation

Clients include `protocolVersion` in registration. Server responds with supported versions.

```typescript
// In register-ack
{
  payload: {
    supportedVersions: ['1.0.0', '1.1.0'],
    recommendedVersion: '1.1.0'
  }
}
```

### 7.3 Backward Compatibility

- New optional fields can be added without version bump
- Clients must ignore unknown fields
- Relay should translate between compatible versions

---

## 8. Security Considerations

### 8.1 Transport Security

- **TLS Required**: All WebSocket connections must use `wss://`
- **Certificate Validation**: Clients must validate server certificates

### 8.2 Authentication (Future)

```typescript
interface AuthenticatedRegisterMessage extends RegisterMessage {
  payload: RegisterMessage['payload'] & {
    /** JWT or API key */
    authToken?: string;
    
    /** User ID if authenticated */
    userId?: string;
  };
}
```

### 8.3 Rate Limiting

- Message rate: 100 messages/second per client
- State updates: 10 updates/second max
- Metrics batches: 1 batch/second recommended

### 8.4 Data Privacy

- Heart rate data is personally identifiable
- Consider local-only option (no relay, direct connection)
- Implement data retention policies on relay server

---

## 9. Error Handling

### 9.1 Reconnection Strategy

```typescript
const RECONNECT_STRATEGY = {
  initialDelay: 1000,      // 1 sec
  maxDelay: 30000,         // 30 sec max
  multiplier: 1.5,         // Exponential backoff
  maxAttempts: 10,         // Give up after 10 attempts
  jitter: 0.2,             // 20% random jitter
};

function calculateReconnectDelay(attempt: number): number {
  const delay = Math.min(
    RECONNECT_STRATEGY.initialDelay * Math.pow(RECONNECT_STRATEGY.multiplier, attempt),
    RECONNECT_STRATEGY.maxDelay
  );
  const jitter = delay * RECONNECT_STRATEGY.jitter * (Math.random() - 0.5);
  return delay + jitter;
}
```

### 9.2 State Recovery

When reconnecting:
1. Send `reconnect` message with last known `sequenceNumber`
2. Relay replays any missed `state-update` messages
3. Resume normal operation

### 9.3 Graceful Degradation

If relay is unavailable:
- Show "Cast unavailable" in UI
- Allow local-only workout execution
- Queue metrics for later sync (if desired)

---

## 10. Implementation Checklist

### 10.1 Web Application (Caster)

- [ ] Implement `CastProtocol.ts` types
- [ ] Implement WebSocket connection management
- [ ] Implement message serialization/deserialization
- [ ] Implement state-to-message conversion
- [ ] Handle incoming events from receiver
- [ ] Implement reconnection logic
- [ ] Add error handling and UI feedback

### 10.2 Android TV Application (Receiver)

- [ ] Implement `CastProtocol` types (Kotlin/TypeScript)
- [ ] Implement WebSocket client
- [ ] Implement message parsing
- [ ] Implement state deserialization to display
- [ ] Implement event forwarding (button presses)
- [ ] Implement heart rate data batching
- [ ] Handle reconnection
- [ ] Implement workout completion packaging

### 10.3 Relay Server

- [ ] Set up WebSocket server (Node.js/Deno)
- [ ] Implement client registration
- [ ] Implement session management
- [ ] Implement message routing
- [ ] Implement heartbeat/timeout handling
- [ ] Implement reconnection support
- [ ] Add logging and monitoring
- [ ] Deploy with TLS

---

## 11. Testing

### 11.1 Unit Tests

- Message serialization/deserialization
- State delta calculation
- Reconnection delay calculation

### 11.2 Integration Tests

- Full message flow: discover → connect → sync → complete
- Error scenarios: timeout, disconnect, invalid messages
- Heart rate data batching accuracy

### 11.3 Load Tests

- Multiple concurrent sessions
- High-frequency state updates
- Large metric batches

---

## Appendix A: Example Messages

### A.1 Complete Session Transcript

```json
// 1. Caster registers
{"type":"register","messageId":"c1","timestamp":1701345600000,"payload":{"clientType":"caster","clientId":"web-123","clientName":"John's Browser","capabilities":{"heartRateMonitor":false,"multiUser":false,"features":["*"]},"protocolVersion":"1.0.0"}}

// 2. Relay acknowledges
{"type":"register-ack","messageId":"c1","timestamp":1701345600010,"payload":{"success":true,"relayId":"relay-001","serverCapabilities":{"maxSessionDuration":14400000,"maxMetricsBatchSize":1000,"heartbeatInterval":30000}}}

// 3. Receiver registers
{"type":"register","messageId":"r1","timestamp":1701345600100,"payload":{"clientType":"receiver","clientId":"android-tv-001","clientName":"Living Room TV","capabilities":{"heartRateMonitor":true,"maxHeartRateDevices":4,"multiUser":false,"features":["basic-timer","rounds","amrap"]},"protocolVersion":"1.0.0"}}

// 4. Caster discovers
{"type":"discover","messageId":"c2","timestamp":1701345600500,"payload":{}}

// 5. Relay reports receiver
{"type":"target-discovered","messageId":"r2","timestamp":1701345600510,"payload":{"targetId":"android-tv-001","name":"Living Room TV","type":"android-tv","capabilities":{"heartRateMonitor":true},"inSession":false}}

// 6. Caster requests cast
{"type":"cast-request","messageId":"c3","timestamp":1701345601000,"payload":{"targetId":"android-tv-001","sessionId":"session-001","workout":{"script":"3 Rounds\n  10 Pushups\n  10 Squats","name":"Quick AMRAP"},"caster":{"id":"web-123","name":"John"},"config":{"receiverControlEnabled":true,"heartRateSyncEnabled":true,"metricsSyncInterval":5000,"autoStopOnDisconnect":true}}}

// 7. Receiver accepts
{"type":"cast-accepted","messageId":"r3","sessionId":"session-001","timestamp":1701345601500,"payload":{"ready":true,"heartRateDevices":[{"id":"hr-001","name":"Garmin HRM","batteryLevel":85}],"users":[{"id":"host","name":"John","isHost":true}]}}

// 8. Caster sends initial state
{"type":"state-update","messageId":"c4","sessionId":"session-001","timestamp":1701345602000,"payload":{"displayState":{"timerStack":[],"cardStack":[{"id":"idle-start","ownerId":"runtime","type":"idle-start","title":"Quick AMRAP"}],"workoutState":"idle"},"sequenceNumber":1}}

// 9. Receiver starts workout (button press)
{"type":"event-from-receiver","messageId":"r4","sessionId":"session-001","timestamp":1701345610000,"payload":{"event":{"name":"start","timestamp":1701345610000}}}

// 10. Caster sends running state
{"type":"state-update","messageId":"c5","sessionId":"session-001","timestamp":1701345610100,"payload":{"displayState":{"timerStack":[{"id":"timer-1","ownerId":"block-1","timerMemoryId":"timer:block-1","format":"countup"}],"cardStack":[{"id":"effort-1","ownerId":"block-2","type":"active-block","title":"Pushups","metrics":[{"type":"reps","value":10}]}],"workoutState":"running","currentRound":1,"totalRounds":3},"sequenceNumber":2}}

// 11. Receiver sends heart rate
{"type":"metrics-batch","messageId":"r5","sessionId":"session-001","timestamp":1701345620000,"payload":{"metrics":[],"heartRateData":[{"timestamp":1701345615000,"bpm":95,"deviceId":"hr-001"},{"timestamp":1701345616000,"bpm":98,"deviceId":"hr-001"},{"timestamp":1701345617000,"bpm":102,"deviceId":"hr-001"}],"batchStartTime":1701345615000,"batchEndTime":1701345617000}}

// ... more state updates and heart rate batches ...

// 12. Workout completes
{"type":"workout-complete","messageId":"r10","sessionId":"session-001","timestamp":1701346200000,"payload":{"status":"completed","completionTime":1701346200000,"totalDuration":600000,"executionLog":[{"id":"span-1","blockId":"block-1","parentId":null,"type":"Rounds","label":"3 Rounds","startTime":1701345610000,"endTime":1701346200000,"status":"completed","metrics":[]}],"metrics":[{"exerciseId":"Pushups","values":[{"type":"repetitions","value":30,"unit":"reps"}],"timeSpans":[]}],"heartRateData":[...],"summary":{"roundsCompleted":3,"totalReps":60,"heartRateSummary":[{"deviceId":"hr-001","avgBpm":145,"maxBpm":172,"minBpm":95,"timeInZones":{"zone1":60000,"zone2":180000,"zone3":240000,"zone4":100000,"zone5":20000}}]}}}

// 13. Caster acknowledges and stops
{"type":"completion-ack","messageId":"c10","sessionId":"session-001","timestamp":1701346200100,"payload":{}}
{"type":"cast-stop","messageId":"c11","sessionId":"session-001","timestamp":1701346200200,"payload":{"initiatedBy":"caster","reason":"workout-complete"}}

// 14. Session ended
{"type":"session-ended","messageId":"s1","sessionId":"session-001","timestamp":1701346200300,"payload":{"reason":"workout-complete"}}
```

---

## Appendix B: TypeScript Package

For sharing types between web and TV apps, create a shared package:

```
@wod-wiki/cast-protocol/
├── src/
│   ├── messages.ts      # All message interfaces
│   ├── types.ts         # Shared types (display, metrics)
│   ├── constants.ts     # Protocol constants
│   └── index.ts         # Exports
├── package.json
└── tsconfig.json
```

This package can be:
- Imported directly in web app
- Used in React Native TV app
- Compiled to Kotlin for native Android (via TypeScript-to-Kotlin tooling)

---

## References

- [01-android-tv-application-spec.md](01-android-tv-application-spec.md) - Android TV app specification
- [02-web-application-updates.md](02-web-application-updates.md) - Web app updates specification
- [DisplayTypes.ts](../../src/clock/types/DisplayTypes.ts) - Display state types
- [CodeFragment.ts](../../src/core/models/CodeFragment.ts) - Fragment types
- [ExecutionRecord.ts](../../src/runtime/models/ExecutionRecord.ts) - Execution log types
