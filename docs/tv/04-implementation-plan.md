# WOD Wiki TV Casting - Implementation Plan

## Overview

This document provides a detailed implementation roadmap for the WOD Wiki TV Casting feature, incorporating industry best practices gathered from research on Android TV development, WebSocket communication, BLE heart rate integration, and fitness app patterns.

---

## Research Summary & Best Practices Applied

### React Native for TV (react-native-tvos)

**Key Findings**:
- Official React Native TV support has moved to `react-native-tvos` repository
- Hermes JS engine is fully supported and enabled by default
- Focus management is built-in with `onFocus`, `onBlur`, `onPress` events on Pressable/Touchable components
- `TVFocusGuideView` component handles complex focus navigation scenarios
- `useTVEventHandler` hook provides clean TV remote event handling
- Expo SDK 54+ supports TV builds via Expo Dev Client
- Latest stable version: 0.76.5-0

**Best Practices to Apply**:
- Use `TVFocusGuideView` with `trapFocus*` properties to prevent focus escaping critical UI areas
- Implement TV-specific file extensions (`.android.tv.tsx`) for platform-specific optimizations
- Leverage `BackHandler` for menu button navigation consistency
- Use `additionalRenderRegions` in VirtualizedList for smooth scrolling with focus

### WebSocket Communication

**Key Findings from MDN & Socket.IO**:
- Use JSON serialization for human-readable debugging during development
- Handle `pagehide` event to close connections for browser bfcache compatibility
- Implement heartbeat mechanism to detect broken connections
- Socket.IO provides automatic reconnection with exponential backoff, but adds protocol overhead
- Native WebSocket is sufficient with custom reconnection logic
- `bufferedAmount` property useful for monitoring send queue

**Best Practices to Apply**:
- Implement exponential backoff reconnection (Socket.IO pattern: 1s → 2s → 4s → 8s, max 30s)
- Use heartbeat/ping messages every 25 seconds (under typical 30s timeout)
- Buffer events during reconnection, replay on reconnect
- Close WebSocket on page hide, reconnect on page show
- Track sequence numbers for state reconciliation

### Google Cast Architecture Insights

**Key Findings**:
- Cast SDK supports multiple Senders connecting to same Receiver session
- Sender initiates session, controls playback; Receiver handles media
- Web Sender requires HTTPS for Presentation API compatibility
- Custom Receiver needed for custom business logic (our case)
- Cast Connect provides native experience on Android TV

**Best Practices to Apply**:
- Follow Sender/Receiver mental model (Web = Sender, TV = Receiver)
- Design for multiple Sender support from the start
- Implement session handoff capability
- Use custom message channels for workout-specific data

### BLE Heart Rate Integration

**Key Findings**:
- Android BLE supports central role for connecting to heart rate monitors
- Heart Rate Service (0x180D) is Bluetooth SIG standard
- Health Connect SDK (1.1.0 stable) provides unified health data access
- Permission model: `READ_HEART_RATE`, `WRITE_HEART_RATE`
- Support both real-time streaming and batch storage

**Best Practices to Apply**:
- Use standard Heart Rate Service UUID (0x180D) and Heart Rate Measurement characteristic (0x2A37)
- Request minimum connection interval (7.5ms to 15ms) for real-time streaming
- Store data to Health Connect for cross-app accessibility
- Handle multiple simultaneous BLE connections (up to 7 on most devices)
- Implement graceful degradation when Bluetooth unavailable

### Android TV Design Guidelines

**Key Findings**:
- Android TV design system includes Figma design kits
- TV components: Buttons, Cards, Featured carousel, Navigation drawer, Tabs
- 10-foot UI paradigm requires larger touch targets and text
- D-pad navigation is primary input method

**Best Practices to Apply**:
- Minimum touch target: 48dp (increased to 54dp for TV)
- Text minimum: 16sp for body, 24sp for headers
- High contrast ratios for readability
- Clear focus states with scale/glow effects

---

## Implementation Phases

### Phase 1: Foundation & Infrastructure (Weeks 1-2)

#### 1.1 Shared Types Package

Create a shared TypeScript package for protocol types:

```
cast-types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── messages.ts        # All WebSocket message types
    ├── display-state.ts   # IDisplayStackState adapters
    ├── heart-rate.ts      # HeartRateDataPoint types
    └── session.ts         # Session & device types
```

**Tasks**:
- [ ] Initialize npm package with TypeScript
- [ ] Copy and adapt types from `03-communication-contract.md`
- [ ] Add JSON schema validation (optional but recommended)
- [ ] Publish to npm or use local linking

**Estimated Time**: 2 days

#### 1.2 WebSocket Relay Server

Build the relay server for NAT traversal:

```
server/
├── package.json
├── src/
│   ├── index.ts
│   ├── server.ts           # Express + WebSocket setup
│   ├── session-manager.ts  # Active sessions tracking
│   ├── connection-pool.ts  # Device connections
│   └── message-router.ts   # Message forwarding logic
└── Dockerfile
```

**Implementation Details**:

```typescript
// server.ts - Core relay logic
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface Connection {
  ws: WebSocket;
  deviceId: string;
  deviceType: 'sender' | 'receiver';
  lastPing: number;
}

const connections = new Map<string, Connection>();
const sessions = new Map<string, Set<string>>(); // sessionId -> deviceIds

// Heartbeat every 25 seconds
const HEARTBEAT_INTERVAL = 25000;
const HEARTBEAT_TIMEOUT = 30000;

function startHeartbeat() {
  setInterval(() => {
    const now = Date.now();
    connections.forEach((conn, deviceId) => {
      if (now - conn.lastPing > HEARTBEAT_TIMEOUT) {
        console.log(`Terminating stale connection: ${deviceId}`);
        conn.ws.terminate();
        connections.delete(deviceId);
      } else {
        conn.ws.ping();
      }
    });
  }, HEARTBEAT_INTERVAL);
}
```

**Tasks**:
- [ ] Set up Node.js project with TypeScript
- [ ] Implement WebSocket server with `ws` package
- [ ] Add session management (create, join, leave, destroy)
- [ ] Implement message routing between sender/receiver
- [ ] Add heartbeat/ping mechanism
- [ ] Add reconnection token generation
- [ ] Create Docker container for deployment
- [ ] Deploy to cloud provider (Railway, Fly.io, or AWS)

**Estimated Time**: 4 days

#### 1.3 React Native TV Project Setup

Initialize the Android TV application:

```bash
# Using react-native-tvos template
npx @react-native-community/cli@latest init tv \
  --template @react-native-tvos/template-tv

# Project structure
tv/
├── android/                    # Android TV native code
├── src/
│   ├── App.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx     # Device registration, session list
│   │   ├── WorkoutScreen.tsx  # Main workout display
│   │   └── SettingsScreen.tsx # HR monitor config
│   ├── components/
│   │   ├── Timer/
│   │   ├── ActivityCard/
│   │   └── HeartRate/
│   ├── services/
│   │   ├── WebSocketService.ts
│   │   ├── BLEService.ts
│   │   └── StateManager.ts
│   └── hooks/
│       ├── useTVRemote.ts
│       └── useHeartRate.ts
├── metro.config.js            # Enable .android.tv.tsx extensions
└── package.json               # react-native: npm:react-native-tvos@latest
```

**Tasks**:
- [ ] Create project using TV template
- [ ] Configure Metro for TV file extensions
- [ ] Set up navigation with `@react-navigation/native`
- [ ] Configure Android Manifest for Leanback launcher
- [ ] Add required dependencies (BLE, WebSocket)
- [ ] Set up Hermes debugging

**Estimated Time**: 3 days

---

### Phase 2: Web Application Integration (Weeks 2-3)

#### 2.1 CastManager Service

```typescript
// src/services/cast/CastManager.ts
import { EventEmitter } from 'events';

export class CastManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private deviceId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: number | null = null;
  private eventBuffer: any[] = [];
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
  private getReconnectDelay(): number {
    const base = Math.min(30, Math.pow(2, this.reconnectAttempts));
    const jitter = Math.random() * 0.3 * base; // 30% jitter
    return (base + jitter) * 1000;
  }
  
  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.flushEventBuffer();
        this.registerDevice();
        resolve();
      };
      
      this.ws.onclose = (event) => {
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(serverUrl);
        }
        this.emit('connectionClosed', event);
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
      
      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }
  
  private scheduleReconnect(serverUrl: string): void {
    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect(serverUrl).catch(() => {});
    }, delay);
  }
  
  // Buffer events during reconnection
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.eventBuffer.push(message);
    }
  }
  
  private flushEventBuffer(): void {
    while (this.eventBuffer.length > 0) {
      const message = this.eventBuffer.shift();
      this.send(message);
    }
  }
}
```

**Tasks**:
- [ ] Implement CastManager with reconnection logic
- [ ] Add CastSession class for active sessions
- [ ] Create event buffering for offline resilience
- [ ] Implement discovery protocol
- [ ] Add state synchronization with sequence numbers
- [ ] Handle page visibility changes (pagehide/pageshow)

**Estimated Time**: 3 days

#### 2.2 React Hooks & Context

```typescript
// src/hooks/useCastManager.ts
export function useCastManager() {
  const [isConnected, setIsConnected] = useState(false);
  const [availableReceivers, setAvailableReceivers] = useState<CastTarget[]>([]);
  const [activeSession, setActiveSession] = useState<CastSession | null>(null);
  const managerRef = useRef<CastManager | null>(null);
  
  useEffect(() => {
    const manager = new CastManager();
    managerRef.current = manager;
    
    manager.on('connectionOpened', () => setIsConnected(true));
    manager.on('connectionClosed', () => setIsConnected(false));
    manager.on('targetDiscovered', (target) => {
      setAvailableReceivers(prev => [...prev, target]);
    });
    
    // Connect on mount
    manager.connect(RELAY_SERVER_URL).catch(console.error);
    
    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        manager.disconnect();
      } else {
        manager.connect(RELAY_SERVER_URL).catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      manager.disconnect();
    };
  }, []);
  
  return {
    isConnected,
    availableReceivers,
    activeSession,
    startCast: (targetId: string, workoutScript: string) => 
      managerRef.current?.startCast(targetId, workoutScript),
    stopCast: () => managerRef.current?.stopCast(),
  };
}
```

**Tasks**:
- [ ] Create `useCastManager` hook
- [ ] Create `useCastSession` hook for active session
- [ ] Add CastContext provider
- [ ] Integrate with RuntimeProvider for state forwarding
- [ ] Add metrics collection hook for incoming data

**Estimated Time**: 2 days

#### 2.3 UI Components

```tsx
// src/components/cast/CastButton.tsx
export function CastButton() {
  const { isConnected, availableReceivers, activeSession, startCast, stopCast } = useCastManager();
  const { script } = useWorkbenchContext();
  const [showTargets, setShowTargets] = useState(false);
  
  if (!isConnected) {
    return (
      <Button variant="ghost" disabled>
        <CastIconDisconnected />
      </Button>
    );
  }
  
  if (activeSession) {
    return (
      <Button variant="primary" onClick={stopCast}>
        <CastIconActive className="animate-pulse" />
        <span>Casting...</span>
      </Button>
    );
  }
  
  return (
    <>
      <Button variant="ghost" onClick={() => setShowTargets(true)}>
        <CastIcon />
      </Button>
      {showTargets && (
        <CastTargetList
          targets={availableReceivers}
          onSelect={(target) => {
            startCast(target.deviceId, script);
            setShowTargets(false);
          }}
          onClose={() => setShowTargets(false)}
        />
      )}
    </>
  );
}
```

**Tasks**:
- [ ] Create CastButton component with states (disconnected, ready, casting)
- [ ] Create CastTargetList dropdown/modal
- [ ] Create CastingStatusIndicator for toolbar
- [ ] Add Cast button to Track View toolbar
- [ ] Style components with Tailwind

**Estimated Time**: 2 days

---

### Phase 3: Android TV Application (Weeks 3-5)

#### 3.1 TV-Optimized UI Components

```tsx
// src/components/Timer/Timer.android.tv.tsx
import { useTVEventHandler, TVFocusGuideView } from 'react-native';

export function Timer({ displayState }: { displayState: ITimerDisplayEntry }) {
  const { timer, label, isPrimary, showProgress } = displayState;
  
  return (
    <View style={styles.container}>
      {/* Large timer text optimized for 10-foot viewing */}
      <Text style={[
        styles.timerText,
        isPrimary && styles.primaryTimer
      ]}>
        {formatTime(timer.remaining)}
      </Text>
      
      {label && (
        <Text style={styles.labelText}>{label}</Text>
      )}
      
      {showProgress && (
        <ProgressBar 
          progress={timer.elapsed / timer.total}
          style={styles.progressBar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48, // Larger padding for TV
  },
  timerText: {
    fontSize: 120, // Very large for TV
    fontFamily: 'RobotoMono-Bold',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  primaryTimer: {
    fontSize: 180,
  },
  labelText: {
    fontSize: 36,
    color: '#AAAAAA',
    marginTop: 16,
  },
  progressBar: {
    width: '80%',
    height: 8,
    marginTop: 32,
    borderRadius: 4,
  },
});
```

**Tasks**:
- [ ] Port Timer component with TV-specific sizing
- [ ] Port ActivityCard component for workout details
- [ ] Create WorkoutControlBar (Play/Pause/Stop indicators)
- [ ] Implement HeartRateDisplay component
- [ ] Add focus states with scale animations
- [ ] Create loading/connecting states

**Estimated Time**: 4 days

#### 3.2 TV Remote Control Integration

```tsx
// src/hooks/useTVRemote.ts
import { useTVEventHandler, BackHandler } from 'react-native';
import { useEffect, useCallback } from 'react';

type TVEventType = 
  | 'select' | 'longSelect'
  | 'up' | 'down' | 'left' | 'right'
  | 'play' | 'pause' | 'playPause'
  | 'menu';

interface WorkoutControls {
  onPlayPause: () => void;
  onStop: () => void;
  onNext: () => void;
}

export function useTVRemoteForWorkout(controls: WorkoutControls) {
  const { onPlayPause, onStop, onNext } = controls;
  
  const handleTVEvent = useCallback((evt: { eventType: TVEventType }) => {
    switch (evt.eventType) {
      case 'select':
      case 'playPause':
        onPlayPause();
        break;
      case 'right':
        onNext();
        break;
      case 'longSelect':
        onStop();
        break;
    }
  }, [onPlayPause, onNext, onStop]);
  
  useTVEventHandler(handleTVEvent);
  
  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Show exit confirmation or go back
      return true;
    });
    return () => backHandler.remove();
  }, []);
}
```

**Tasks**:
- [ ] Implement `useTVRemote` hook
- [ ] Map remote buttons to workout actions
- [ ] Add visual feedback for button presses
- [ ] Implement long-press for stop confirmation
- [ ] Handle back button navigation

**Estimated Time**: 2 days

#### 3.3 WebSocket Client Service

```typescript
// src/services/WebSocketService.ts
import { EventEmitter } from 'events';
import { NetInfo } from '@react-native-community/netinfo';

export class TVWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private deviceId: string;
  private isReconnecting = false;
  private stateSequence = 0;
  
  async connect(serverUrl: string): Promise<void> {
    // Check network availability first
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No network connection');
    }
    
    this.ws = new WebSocket(serverUrl);
    
    this.ws.onopen = () => {
      this.register();
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
      this.emit('disconnected');
      if (!this.isReconnecting) {
        this.scheduleReconnect(serverUrl);
      }
    };
  }
  
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'state-update':
        // Only process if sequence is newer
        if (message.payload.sequence > this.stateSequence) {
          this.stateSequence = message.payload.sequence;
          this.emit('stateUpdate', message.payload.displayState);
        }
        break;
      case 'cast-request':
        this.emit('castRequest', message.payload);
        break;
      case 'cast-stop':
        this.emit('castStop');
        break;
    }
  }
  
  sendEvent(event: IEvent): void {
    this.send({
      type: 'event-from-receiver',
      payload: { event }
    });
  }
}
```

**Tasks**:
- [ ] Implement WebSocket service for React Native
- [ ] Add sequence number tracking for state updates
- [ ] Implement reconnection with network state awareness
- [ ] Add event sending for remote control actions
- [ ] Handle session lifecycle messages

**Estimated Time**: 2 days

---

### Phase 4: Heart Rate Integration (Weeks 5-6)

#### 4.1 BLE Heart Rate Service

```typescript
// src/services/BLEService.ts
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';

// Bluetooth SIG standard UUIDs
const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

interface HeartRateReading {
  bpm: number;
  timestamp: number;
  deviceId: string;
  deviceName: string;
}

export class BLEHeartRateService {
  private manager: BleManager;
  private connectedDevices: Map<string, Device> = new Map();
  private onReadingCallback?: (reading: HeartRateReading) => void;
  
  constructor() {
    this.manager = new BleManager();
  }
  
  async startScanning(): Promise<Device[]> {
    const devices: Device[] = [];
    
    return new Promise((resolve) => {
      this.manager.startDeviceScan(
        [HEART_RATE_SERVICE],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            return;
          }
          if (device && !devices.find(d => d.id === device.id)) {
            devices.push(device);
          }
        }
      );
      
      // Stop scanning after 10 seconds
      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(devices);
      }, 10000);
    });
  }
  
  async connectToDevice(deviceId: string): Promise<void> {
    const device = await this.manager.connectToDevice(deviceId, {
      autoConnect: false,
      requestMTU: 256,
    });
    
    await device.discoverAllServicesAndCharacteristics();
    
    // Monitor heart rate characteristic
    device.monitorCharacteristicForService(
      HEART_RATE_SERVICE,
      HEART_RATE_MEASUREMENT,
      (error, characteristic) => {
        if (error) {
          console.error('Monitor error:', error);
          return;
        }
        if (characteristic?.value) {
          const bpm = this.parseHeartRateValue(characteristic.value);
          this.onReadingCallback?.({
            bpm,
            timestamp: Date.now(),
            deviceId: device.id,
            deviceName: device.name || 'Unknown',
          });
        }
      }
    );
    
    this.connectedDevices.set(deviceId, device);
  }
  
  private parseHeartRateValue(base64Value: string): number {
    const data = Buffer.from(base64Value, 'base64');
    const flags = data[0];
    
    // Check if heart rate value is 16-bit or 8-bit
    if (flags & 0x01) {
      // 16-bit value
      return data.readUInt16LE(1);
    } else {
      // 8-bit value
      return data[1];
    }
  }
  
  onReading(callback: (reading: HeartRateReading) => void): void {
    this.onReadingCallback = callback;
  }
  
  async disconnectAll(): Promise<void> {
    for (const [id, device] of this.connectedDevices) {
      await device.cancelConnection();
    }
    this.connectedDevices.clear();
  }
}
```

**Tasks**:
- [ ] Implement BLE service with `react-native-ble-plx`
- [ ] Add device scanning for HR monitors
- [ ] Implement HR characteristic parsing (8-bit and 16-bit values)
- [ ] Support multiple simultaneous device connections
- [ ] Add device pairing persistence
- [ ] Handle BLE permission requests

**Estimated Time**: 3 days

#### 4.2 Heart Rate Data Batching

```typescript
// src/services/HeartRateCollector.ts
export class HeartRateCollector {
  private readings: HeartRateReading[] = [];
  private batchInterval: number;
  private onBatchCallback?: (batch: HeartRateReading[]) => void;
  private intervalId?: NodeJS.Timeout;
  
  constructor(batchIntervalMs: number = 5000) {
    this.batchInterval = batchIntervalMs;
  }
  
  start(): void {
    this.intervalId = setInterval(() => {
      if (this.readings.length > 0) {
        const batch = [...this.readings];
        this.readings = [];
        this.onBatchCallback?.(batch);
      }
    }, this.batchInterval);
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      // Flush remaining readings
      if (this.readings.length > 0 && this.onBatchCallback) {
        this.onBatchCallback([...this.readings]);
        this.readings = [];
      }
    }
  }
  
  addReading(reading: HeartRateReading): void {
    this.readings.push(reading);
  }
  
  onBatch(callback: (batch: HeartRateReading[]) => void): void {
    this.onBatchCallback = callback;
  }
  
  // For workout completion
  getAllReadings(): HeartRateReading[] {
    return [...this.readings];
  }
}
```

**Tasks**:
- [ ] Implement batching collector (5-second intervals)
- [ ] Add readings aggregation for workout summary (avg, max, zones)
- [ ] Implement Health Connect storage (optional)
- [ ] Send batches via WebSocket to web app

**Estimated Time**: 2 days

#### 4.3 Multi-Monitor Support

```typescript
// src/hooks/useMultipleHeartRateMonitors.ts
export function useMultipleHeartRateMonitors() {
  const [monitors, setMonitors] = useState<Map<string, MonitorState>>(new Map());
  const bleService = useRef(new BLEHeartRateService());
  
  const connectMonitor = async (deviceId: string, userId?: string) => {
    await bleService.current.connectToDevice(deviceId);
    setMonitors(prev => new Map(prev).set(deviceId, {
      deviceId,
      userId,
      isConnected: true,
      currentBpm: 0,
    }));
  };
  
  useEffect(() => {
    bleService.current.onReading((reading) => {
      setMonitors(prev => {
        const updated = new Map(prev);
        const monitor = updated.get(reading.deviceId);
        if (monitor) {
          updated.set(reading.deviceId, {
            ...monitor,
            currentBpm: reading.bpm,
            lastUpdate: reading.timestamp,
          });
        }
        return updated;
      });
    });
  }, []);
  
  return {
    monitors,
    connectMonitor,
    disconnectMonitor: (id: string) => bleService.current.disconnectDevice(id),
    scanForMonitors: () => bleService.current.startScanning(),
  };
}
```

**Tasks**:
- [ ] Implement multi-monitor hook
- [ ] Create UI for monitor selection/assignment
- [ ] Add user assignment for group workouts
- [ ] Display individual HR for each connected monitor

**Estimated Time**: 2 days

---

### Phase 5: Testing & Polish (Weeks 6-7)

#### 5.1 End-to-End Testing

**Test Scenarios**:

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Basic Cast | 1. Load workout in web 2. Click Cast 3. Select TV | TV shows workout, web shows "Casting" |
| Remote Control | 1. Cast workout 2. Press Play/Pause on remote | Workout toggles state, web reflects change |
| Network Disconnect | 1. Cast workout 2. Disconnect TV wifi 3. Reconnect | Session resumes, state synchronized |
| HR Monitor Connect | 1. Cast workout 2. Connect HR monitor on TV | HR appears on both TV and web |
| Workout Complete | 1. Run workout to completion | All metrics sync to web, HR data included |

**Tasks**:
- [ ] Create E2E test suite with Detox (TV app)
- [ ] Add integration tests for WebSocket relay
- [ ] Test network failure scenarios
- [ ] Test BLE reconnection scenarios
- [ ] Load testing with multiple simultaneous sessions

**Estimated Time**: 3 days

#### 5.2 Performance Optimization

**Metrics to Track**:
- State update latency (target: <100ms)
- HR data sync latency (target: <500ms)
- Memory usage on TV app
- WebSocket message throughput

**Tasks**:
- [ ] Profile TV app rendering performance
- [ ] Optimize state diff calculation
- [ ] Implement state compression for large workouts
- [ ] Add telemetry for latency tracking

**Estimated Time**: 2 days

#### 5.3 Error Handling & Recovery

```typescript
// Error recovery strategies

// 1. Session recovery after disconnect
interface SessionRecoveryStrategy {
  maxAttempts: 3;
  backoffMs: [1000, 3000, 10000];
  action: 'reconnect-and-sync';
}

// 2. State recovery after reconnect
interface StateRecoveryStrategy {
  requestFullState: true;
  validateSequence: true;
  maxDrift: 5000; // ms
}

// 3. HR monitor reconnect
interface HRRecoveryStrategy {
  autoReconnect: true;
  scanOnDisconnect: true;
  maxScanDuration: 30000;
}
```

**Tasks**:
- [ ] Implement graceful degradation
- [ ] Add user-facing error messages
- [ ] Create recovery dialogs
- [ ] Log errors for debugging

**Estimated Time**: 2 days

---

## Resource Requirements

### Team Composition (Ideal)

| Role | Allocation | Responsibilities |
|------|------------|------------------|
| Full-Stack Developer | 100% | Relay server, Web integration |
| React Native Developer | 100% | Android TV app |
| QA Engineer | 50% | Testing, automation |

### Minimum Viable Team

- 1 Developer with React + React Native experience: Full-time for 7 weeks

### Infrastructure Costs

| Service | Purpose | Est. Cost/Month |
|---------|---------|-----------------|
| Relay Server (Railway/Fly.io) | WebSocket relay | $10-25 |
| Redis (optional) | Session persistence | $10-15 |
| CI/CD (GitHub Actions) | Build & Test | Free tier |
| Play Store | App distribution | $25 one-time |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| BLE compatibility issues | Medium | High | Test on multiple device models early |
| WebSocket reliability | Medium | Medium | Robust reconnection, message buffering |
| React Native TV bugs | Low | High | Use stable RNTV version, avoid bleeding edge |
| Network latency | Medium | Medium | Optimistic UI updates, delta sync |
| Play Store rejection | Low | High | Follow Leanback guidelines strictly |

---

## Success Metrics

### Phase 1 Completion Criteria
- [ ] Relay server deployed and stable
- [ ] Types package published
- [ ] TV app builds and runs on emulator

### Phase 2 Completion Criteria
- [ ] Cast button visible in Track View
- [ ] Can discover TV receivers
- [ ] State syncs to TV display

### Phase 3 Completion Criteria
- [ ] TV displays workout correctly
- [ ] Remote control operates workout
- [ ] Focus navigation works properly

### Phase 4 Completion Criteria
- [ ] HR monitors connect successfully
- [ ] HR data displays on both screens
- [ ] Metrics sync on completion

### Phase 5 Completion Criteria
- [ ] All E2E tests pass
- [ ] <100ms state sync latency
- [ ] Handles network interruptions gracefully

---

## Appendix: Key Dependencies

### Web Application
```json
{
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
```

### Android TV Application
```json
{
  "dependencies": {
    "react-native": "npm:react-native-tvos@0.76.5-0",
    "react-native-ble-plx": "^3.1.0",
    "@react-navigation/native": "^6.0.0",
    "@react-navigation/native-stack": "^6.0.0",
    "react-native-screens": "^3.0.0",
    "react-native-safe-area-context": "^4.0.0"
  }
}
```

### Relay Server
```json
{
  "dependencies": {
    "ws": "^8.18.0",
    "express": "^4.21.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/ws": "^8.5.0",
    "@types/express": "^4.17.0"
  }
}
```

---

## References

- [react-native-tvos Documentation](https://github.com/react-native-tvos/react-native-tvos)
- [Android TV Design Guidelines](https://developer.android.com/design/ui/tv)
- [Bluetooth Heart Rate Service Specification](https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/)
- [Health Connect SDK](https://developer.android.com/health-and-fitness/guides/health-connect)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Google Cast SDK Overview](https://developers.google.com/cast/docs/overview)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
