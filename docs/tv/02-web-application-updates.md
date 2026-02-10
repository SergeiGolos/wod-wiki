# Web Application Updates for TV Casting

## Overview

This document defines the modifications needed to the existing WOD Wiki web application to support casting workouts to an Android TV application. The primary changes involve adding a casting service, modifying the Track View for cast initiation, and handling workout completion with metric synchronization.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WOD Wiki Web Application                          │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ Track View   │───▶│ CastManager  │◀──▶│ WebSocket Server (Relay) │  │
│  │ (Caster)     │    │              │    │                          │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│         │                   │                         │                 │
│         ▼                   ▼                         │                 │
│  ┌──────────────┐    ┌──────────────┐                │                 │
│  │ ScriptRuntime│    │ SessionStore │                │                 │
│  │ (unchanged)  │    │ (new)        │                │                 │
│  └──────────────┘    └──────────────┘                │                 │
│                                                       │                 │
└───────────────────────────────────────────────────────│─────────────────┘
                                                        │
                                    WebSocket Connection│
                                                        │
┌───────────────────────────────────────────────────────│─────────────────┐
│                      Android TV Application           │                 │
│                                                       ▼                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ Track Screen │◀───│ CastSession  │◀──▶│ WebSocket Client         │  │
│  │ (Receiver)   │    │              │    │                          │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│         │                   │                                           │
│         ▼                   ▼                                           │
│  ┌──────────────┐    ┌──────────────┐                                  │
│  │ HR Monitors  │    │ Metrics Sync │                                  │
│  └──────────────┘    └──────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. New Services

### 2.1 CastManager Service

The `CastManager` orchestrates cast sessions, managing connections between the web app and TV receivers.

```typescript
// src/services/cast/CastManager.ts

import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { IDisplayStackState } from '../../clock/types/DisplayTypes';
import type { ICodeFragment } from '../../core/models/CodeFragment';
import { ExecutionRecord } from '../../runtime/models/ExecutionRecord';
import { CastSession, CastSessionConfig, CastSessionState } from './CastSession';
import { CastProtocol, CastMessage } from './CastProtocol';

export interface CastManagerConfig {
  /** WebSocket relay server URL */
  relayServerUrl: string;
  
  /** Timeout for cast discovery (ms) */
  discoveryTimeout?: number;
  
  /** Whether to auto-reconnect on disconnect */
  autoReconnect?: boolean;
}

export interface CastTarget {
  id: string;
  name: string;
  type: 'android-tv' | 'web-receiver';
  ipAddress?: string;
}

export interface CastState {
  isDiscovering: boolean;
  availableTargets: CastTarget[];
  activeSession: CastSession | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
}

type CastStateListener = (state: CastState) => void;

/**
 * CastManager - Singleton service managing cast sessions
 * 
 * Responsibilities:
 * - Discover available cast targets (Android TV devices)
 * - Establish and manage cast sessions
 * - Bridge runtime state to cast protocol messages
 * - Handle workout completion and metrics sync
 */
export class CastManager {
  private config: CastManagerConfig;
  private state: CastState;
  private listeners: Set<CastStateListener> = new Set();
  private webSocket: WebSocket | null = null;
  private runtime: IScriptRuntime | null = null;
  private memoryUnsubscribe: (() => void) | null = null;
  
  constructor(config: CastManagerConfig) {
    this.config = config;
    this.state = {
      isDiscovering: false,
      availableTargets: [],
      activeSession: null,
      connectionState: 'disconnected',
    };
  }
  
  /**
   * Subscribe to cast state changes
   */
  subscribe(listener: CastStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.state }));
  }
  
  private setState(partial: Partial<CastState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  /**
   * Start discovering available cast targets
   */
  async startDiscovery(): Promise<void> {
    if (this.state.isDiscovering) return;
    
    this.setState({ isDiscovering: true, availableTargets: [] });
    
    try {
      // Connect to relay server for discovery
      await this.connectToRelay();
      
      // Send discovery request
      this.sendRelayMessage({
        type: 'discover',
        payload: { clientType: 'caster' },
      });
      
      // Discovery timeout
      setTimeout(() => {
        this.setState({ isDiscovering: false });
      }, this.config.discoveryTimeout || 10000);
      
    } catch (error) {
      this.setState({ 
        isDiscovering: false, 
        error: `Discovery failed: ${error}` 
      });
    }
  }
  
  /**
   * Stop discovery
   */
  stopDiscovery(): void {
    this.setState({ isDiscovering: false });
  }
  
  /**
   * Connect to a discovered target and start casting
   */
  async startCasting(
    target: CastTarget, 
    runtime: IScriptRuntime,
    workoutScript: string
  ): Promise<CastSession> {
    if (this.state.activeSession) {
      throw new Error('Already casting. Stop current session first.');
    }
    
    this.setState({ connectionState: 'connecting' });
    this.runtime = runtime;
    
    try {
      // Create session
      const session = new CastSession({
        targetId: target.id,
        targetName: target.name,
        workoutScript,
        onStateChange: this.handleSessionStateChange.bind(this),
        onMetricsReceived: this.handleMetricsReceived.bind(this),
        onWorkoutComplete: this.handleWorkoutComplete.bind(this),
      });
      
      // Send cast request to relay
      this.sendRelayMessage({
        type: 'cast-request',
        payload: {
          targetId: target.id,
          sessionId: session.id,
          workoutScript,
        },
      });
      
      // Wait for target to accept
      await this.waitForCastAcceptance(session.id);
      
      // Subscribe to runtime memory changes
      this.subscribeToRuntimeState(runtime, session);
      
      this.setState({ 
        activeSession: session, 
        connectionState: 'connected' 
      });
      
      return session;
      
    } catch (error) {
      this.setState({ 
        connectionState: 'error', 
        error: `Failed to start casting: ${error}` 
      });
      throw error;
    }
  }
  
  /**
   * Stop the current cast session
   */
  async stopCasting(): Promise<void> {
    const session = this.state.activeSession;
    if (!session) return;
    
    // Unsubscribe from runtime
    this.memoryUnsubscribe?.();
    this.memoryUnsubscribe = null;
    
    // Send stop message
    this.sendRelayMessage({
      type: 'cast-stop',
      payload: { sessionId: session.id },
    });
    
    // Clean up
    session.dispose();
    this.runtime = null;
    
    this.setState({ 
      activeSession: null, 
      connectionState: 'disconnected' 
    });
  }
  
  /**
   * Subscribe to runtime memory and forward state to cast session
   */
  private subscribeToRuntimeState(
    runtime: IScriptRuntime, 
    session: CastSession
  ): void {
    // Subscribe to display stack state changes
    const displayStateRefs = runtime.memory.search({
      id: null,
      ownerId: 'runtime',
      type: 'displaystack',
      visibility: 'public',
    });
    
    if (displayStateRefs.length > 0) {
      const stateRef = displayStateRefs[0];
      
      // Initial sync
      const initialState = stateRef.get() as IDisplayStackState;
      this.sendStateUpdate(session, initialState);
      
      // Subscribe to changes
      this.memoryUnsubscribe = stateRef.subscribe((newState: IDisplayStackState) => {
        this.sendStateUpdate(session, newState);
      });
    }
  }
  
  /**
   * Send state update to cast target
   */
  private sendStateUpdate(session: CastSession, state: IDisplayStackState): void {
    this.sendRelayMessage({
      type: 'state-update',
      payload: {
        sessionId: session.id,
        displayState: state,
        timestamp: Date.now(),
      },
    });
  }
  
  /**
   * Handle incoming messages from relay server
   */
  private handleRelayMessage(message: CastMessage): void {
    switch (message.type) {
      case 'target-discovered':
        this.handleTargetDiscovered(message.payload as CastTarget);
        break;
        
      case 'cast-accepted':
        // Handled by waitForCastAcceptance promise
        break;
        
      case 'event-from-receiver':
        this.handleReceiverEvent(message.payload);
        break;
        
      case 'metrics-sync':
        this.handleMetricsReceived(message.payload.metrics);
        break;
        
      case 'workout-complete':
        this.handleWorkoutComplete(message.payload);
        break;
        
      case 'receiver-disconnected':
        this.handleReceiverDisconnected();
        break;
    }
  }
  
  /**
   * Handle events from receiver (e.g., button presses)
   */
  private handleReceiverEvent(payload: { event: any }): void {
    if (!this.runtime) return;
    
    // Forward event to runtime
    this.runtime.handle({
      name: payload.event.name,
      timestamp: new Date(payload.event.timestamp),
      data: payload.event.data,
    });
  }
  
  /**
   * Handle metrics received from receiver (including heart rate)
   */
  private handleMetricsReceived(metrics: ICodeFragment[]): void {
    if (!this.runtime?.metrics) return;
    
    // Add received metrics to collector
    metrics.forEach(metric => {
      this.runtime!.metrics!.collect(metric);
    });
    
    console.log(`[CastManager] Received ${metrics.length} metrics from receiver`);
  }
  
  /**
   * Handle workout completion from receiver
   */
  private handleWorkoutComplete(payload: {
    executionLog: ExecutionRecord[];
    metrics: ICodeFragment[];
    heartRateData: HeartRateDataPoint[];
  }): void {
    // Merge execution log
    if (this.runtime?.executionLog) {
      payload.executionLog.forEach(record => {
        // Merge any additional data from receiver
        const existing = this.runtime!.executionLog.find(r => r.id === record.id);
        if (existing) {
          // Update with receiver data
          Object.assign(existing, record);
        }
      });
    }
    
    // Add heart rate metrics
    payload.heartRateData.forEach(hr => {
      this.runtime?.metrics?.collect({
        exerciseId: 'heart-rate',
        values: [{
          type: 'heart_rate',
          value: hr.bpm,
          unit: 'bpm',
        }],
        timeSpans: [{
          start: new Date(hr.timestamp),
          stop: new Date(hr.timestamp),
        }],
      });
    });
    
    // Notify session listeners
    this.state.activeSession?.notifyWorkoutComplete(payload);
    
    console.log('[CastManager] Workout complete, metrics synced');
  }
  
  // ... WebSocket connection helpers
  
  private async connectToRelay(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.webSocket = new WebSocket(this.config.relayServerUrl);
      
      this.webSocket.onopen = () => {
        this.setState({ connectionState: 'connected' });
        resolve();
      };
      
      this.webSocket.onerror = (error) => {
        reject(error);
      };
      
      this.webSocket.onmessage = (event) => {
        const message = JSON.parse(event.data) as CastMessage;
        this.handleRelayMessage(message);
      };
      
      this.webSocket.onclose = () => {
        if (this.state.activeSession && this.config.autoReconnect) {
          // Attempt reconnect
          setTimeout(() => this.connectToRelay(), 2000);
        }
      };
    });
  }
  
  private sendRelayMessage(message: CastMessage): void {
    if (this.webSocket?.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }
  
  private handleTargetDiscovered(target: CastTarget): void {
    const exists = this.state.availableTargets.find(t => t.id === target.id);
    if (!exists) {
      this.setState({
        availableTargets: [...this.state.availableTargets, target],
      });
    }
  }
  
  private async waitForCastAcceptance(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Cast acceptance timeout'));
      }, 30000);
      
      const handler = (message: CastMessage) => {
        if (message.type === 'cast-accepted' && message.payload.sessionId === sessionId) {
          clearTimeout(timeout);
          resolve();
        } else if (message.type === 'cast-rejected' && message.payload.sessionId === sessionId) {
          clearTimeout(timeout);
          reject(new Error(message.payload.reason || 'Cast rejected'));
        }
      };
      
      // Temporary message handler
      const originalHandler = this.handleRelayMessage.bind(this);
      this.handleRelayMessage = (msg) => {
        handler(msg);
        originalHandler(msg);
      };
    });
  }
  
  private handleReceiverDisconnected(): void {
    this.setState({
      activeSession: null,
      connectionState: 'disconnected',
      error: 'Receiver disconnected',
    });
  }
  
  private handleSessionStateChange(state: CastSessionState): void {
    // Forward to UI listeners
    this.notifyListeners();
  }
}

// Heart rate data point type
interface HeartRateDataPoint {
  timestamp: number;
  bpm: number;
  deviceId: string;
  userId?: string;
}
```

### 2.2 CastSession Class

```typescript
// src/services/cast/CastSession.ts

import { v4 as uuidv4 } from 'uuid';
import type { ICodeFragment } from '../../core/models/CodeFragment';
import { ExecutionRecord } from '../../runtime/models/ExecutionRecord';

export interface CastSessionConfig {
  targetId: string;
  targetName: string;
  workoutScript: string;
  onStateChange: (state: CastSessionState) => void;
  onMetricsReceived: (metrics: ICodeFragment[]) => void;
  onWorkoutComplete: (data: WorkoutCompleteData) => void;
}

export interface CastSessionState {
  id: string;
  targetId: string;
  targetName: string;
  startTime: number;
  status: 'pending' | 'active' | 'complete' | 'error';
  workoutState: 'idle' | 'running' | 'paused' | 'complete';
  connectedUsers: CastUser[];
}

export interface CastUser {
  id: string;
  name: string;
  isHost: boolean;
  heartRateDeviceId?: string;
}

export interface WorkoutCompleteData {
  executionLog: ExecutionRecord[];
  metrics: ICodeFragment[];
  heartRateData: HeartRateDataPoint[];
  completionTime: number;
}

/**
 * CastSession - Represents an active casting session
 */
export class CastSession {
  readonly id: string;
  private config: CastSessionConfig;
  private state: CastSessionState;
  private listeners: Set<(state: CastSessionState) => void> = new Set();
  
  constructor(config: CastSessionConfig) {
    this.id = uuidv4();
    this.config = config;
    this.state = {
      id: this.id,
      targetId: config.targetId,
      targetName: config.targetName,
      startTime: Date.now(),
      status: 'pending',
      workoutState: 'idle',
      connectedUsers: [{
        id: 'host',
        name: 'Host',
        isHost: true,
      }],
    };
  }
  
  get currentState(): CastSessionState {
    return { ...this.state };
  }
  
  subscribe(listener: (state: CastSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.state }));
    this.config.onStateChange(this.state);
  }
  
  activate(): void {
    this.state.status = 'active';
    this.notifyListeners();
  }
  
  updateWorkoutState(workoutState: CastSessionState['workoutState']): void {
    this.state.workoutState = workoutState;
    this.notifyListeners();
  }
  
  addUser(user: CastUser): void {
    if (!this.state.connectedUsers.find(u => u.id === user.id)) {
      this.state.connectedUsers.push(user);
      this.notifyListeners();
    }
  }
  
  removeUser(userId: string): void {
    this.state.connectedUsers = this.state.connectedUsers.filter(u => u.id !== userId);
    this.notifyListeners();
  }
  
  notifyWorkoutComplete(data: WorkoutCompleteData): void {
    this.state.status = 'complete';
    this.config.onWorkoutComplete(data);
    this.notifyListeners();
  }
  
  dispose(): void {
    this.listeners.clear();
  }
}
```

---

## 3. React Hooks for Casting

### 3.1 useCastManager Hook

```typescript
// src/hooks/useCastManager.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { CastManager, CastManagerConfig, CastState, CastTarget } from '../services/cast/CastManager';
import { CastSession } from '../services/cast/CastSession';
import { useRuntime } from '../components/layout/RuntimeProvider';
import { useWorkbench } from '../components/layout/WorkbenchContext';

// Singleton instance
let castManagerInstance: CastManager | null = null;

const DEFAULT_CONFIG: CastManagerConfig = {
  relayServerUrl: process.env.REACT_APP_CAST_RELAY_URL || 'wss://cast.wod.wiki/relay',
  discoveryTimeout: 10000,
  autoReconnect: true,
};

function getCastManager(): CastManager {
  if (!castManagerInstance) {
    castManagerInstance = new CastManager(DEFAULT_CONFIG);
  }
  return castManagerInstance;
}

export interface UseCastManagerReturn {
  /** Current cast state */
  state: CastState;
  
  /** Start discovering available cast targets */
  startDiscovery: () => Promise<void>;
  
  /** Stop discovery */
  stopDiscovery: () => void;
  
  /** Start casting to a target */
  startCasting: (target: CastTarget) => Promise<CastSession>;
  
  /** Stop the current cast session */
  stopCasting: () => Promise<void>;
  
  /** Whether currently casting */
  isCasting: boolean;
  
  /** Active cast session (if any) */
  session: CastSession | null;
}

export function useCastManager(): UseCastManagerReturn {
  const castManager = useRef(getCastManager()).current;
  const { runtime } = useRuntime();
  const { content } = useWorkbench();
  
  const [state, setState] = useState<CastState>(castManager['state']);
  
  useEffect(() => {
    return castManager.subscribe(setState);
  }, [castManager]);
  
  const startDiscovery = useCallback(async () => {
    await castManager.startDiscovery();
  }, [castManager]);
  
  const stopDiscovery = useCallback(() => {
    castManager.stopDiscovery();
  }, [castManager]);
  
  const startCasting = useCallback(async (target: CastTarget) => {
    if (!runtime) {
      throw new Error('Runtime not initialized');
    }
    return castManager.startCasting(target, runtime, content);
  }, [castManager, runtime, content]);
  
  const stopCasting = useCallback(async () => {
    await castManager.stopCasting();
  }, [castManager]);
  
  return {
    state,
    startDiscovery,
    stopDiscovery,
    startCasting,
    stopCasting,
    isCasting: state.activeSession !== null,
    session: state.activeSession,
  };
}
```

### 3.2 useCastSession Hook

```typescript
// src/hooks/useCastSession.ts

import { useState, useEffect, useCallback } from 'react';
import { CastSession, CastSessionState } from '../services/cast/CastSession';

export interface UseCastSessionReturn {
  /** Session state */
  sessionState: CastSessionState | null;
  
  /** Connected users */
  connectedUsers: CastSessionState['connectedUsers'];
  
  /** Is workout complete */
  isComplete: boolean;
  
  /** Leave the cast session */
  leave: () => void;
}

export function useCastSession(session: CastSession | null): UseCastSessionReturn {
  const [sessionState, setSessionState] = useState<CastSessionState | null>(
    session?.currentState || null
  );
  
  useEffect(() => {
    if (!session) {
      setSessionState(null);
      return;
    }
    
    return session.subscribe(setSessionState);
  }, [session]);
  
  const leave = useCallback(() => {
    // Handled by parent component calling stopCasting
  }, []);
  
  return {
    sessionState,
    connectedUsers: sessionState?.connectedUsers || [],
    isComplete: sessionState?.status === 'complete',
    leave,
  };
}
```

---

## 4. UI Components

### 4.1 CastButton Component

Add a cast button to the Track View toolbar:

```tsx
// src/components/cast/CastButton.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Cast, Loader2, Tv2, X } from 'lucide-react';
import { useCastManager } from '../../hooks/useCastManager';
import { CastTarget } from '../../services/cast/CastManager';
import { cn } from '@/lib/utils';

export interface CastButtonProps {
  className?: string;
  disabled?: boolean;
}

export const CastButton: React.FC<CastButtonProps> = ({ 
  className,
  disabled 
}) => {
  const { 
    state, 
    startDiscovery, 
    stopDiscovery,
    startCasting, 
    stopCasting,
    isCasting 
  } = useCastManager();
  
  const [isOpen, setIsOpen] = useState(false);
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !isCasting) {
      startDiscovery();
    } else {
      stopDiscovery();
    }
  };
  
  const handleTargetSelect = async (target: CastTarget) => {
    try {
      await startCasting(target);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to start casting:', error);
    }
  };
  
  const handleStopCasting = async () => {
    await stopCasting();
    setIsOpen(false);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={isCasting ? 'default' : 'outline'}
          size="sm"
          className={cn('gap-2', className)}
          disabled={disabled}
        >
          <Cast className={cn('h-4 w-4', isCasting && 'text-primary-foreground')} />
          {isCasting ? 'Casting' : 'Cast'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        {isCasting ? (
          <CastingStatus 
            session={state.activeSession!} 
            onStop={handleStopCasting}
          />
        ) : (
          <CastTargetList
            isDiscovering={state.isDiscovering}
            targets={state.availableTargets}
            onSelect={handleTargetSelect}
            error={state.error}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};

// Sub-components

interface CastTargetListProps {
  isDiscovering: boolean;
  targets: CastTarget[];
  onSelect: (target: CastTarget) => void;
  error?: string;
}

const CastTargetList: React.FC<CastTargetListProps> = ({
  isDiscovering,
  targets,
  onSelect,
  error,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Available Devices</h4>
        {isDiscovering && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {targets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {isDiscovering ? 'Searching for devices...' : 'No devices found'}
        </p>
      ) : (
        <div className="space-y-2">
          {targets.map((target) => (
            <Button
              key={target.id}
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => onSelect(target)}
            >
              <Tv2 className="h-5 w-5" />
              <div className="flex-1 text-left">
                <p className="font-medium">{target.name}</p>
                <p className="text-xs text-muted-foreground">
                  {target.type === 'android-tv' ? 'Android TV' : 'Web'}
                </p>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

interface CastingStatusProps {
  session: CastSession;
  onStop: () => void;
}

const CastingStatus: React.FC<CastingStatusProps> = ({ session, onStop }) => {
  const state = session.currentState;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Cast className="h-4 w-4 text-primary" />
          Casting to {state.targetName}
        </h4>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>Status: {state.workoutState}</p>
        <p>Connected users: {state.connectedUsers.length}</p>
      </div>
      
      <Button 
        variant="destructive" 
        size="sm" 
        className="w-full gap-2"
        onClick={onStop}
      >
        <X className="h-4 w-4" />
        Stop Casting
      </Button>
    </div>
  );
};
```

### 4.2 Integration with Track View

Update the Track View layout to include the cast button and show casting indicators:

```tsx
// src/components/layout/Workbench.tsx (partial update)

// Add import
import { CastButton } from '../cast/CastButton';
import { useCastManager } from '../../hooks/useCastManager';

// Inside the component, add:
const { isCasting, session } = useCastManager();

// In the toolbar area for Track view:
{viewMode === 'track' && (
  <div className="flex items-center gap-2">
    {/* Existing controls */}
    
    {/* Cast Button */}
    <CastButton disabled={!runtime} />
    
    {/* Casting indicator */}
    {isCasting && (
      <Badge variant="secondary" className="gap-1">
        <Cast className="h-3 w-3" />
        Casting
      </Badge>
    )}
  </div>
)}
```

---

## 5. Workout Completion Flow

### 5.1 Enhanced Workout Complete Handler

When a workout completes while casting, the web app needs to:
1. Receive metrics from the TV receiver
2. Merge execution logs
3. Process heart rate data
4. Exit casting mode
5. Show combined analytics

```typescript
// src/hooks/useWorkoutCompletion.ts

import { useEffect, useCallback } from 'react';
import { useCastManager } from './useCastManager';
import { useWorkbench } from '../components/layout/WorkbenchContext';
import { useRuntime } from '../components/layout/RuntimeProvider';
import { WorkoutResults } from '../markdown-editor/types';

export function useWorkoutCompletion() {
  const { session, stopCasting, isCasting } = useCastManager();
  const { completeWorkout, setViewMode } = useWorkbench();
  const { runtime } = useRuntime();
  
  // Handle workout completion from cast session
  useEffect(() => {
    if (!session) return;
    
    return session.subscribe((state) => {
      if (state.status === 'complete') {
        handleCastWorkoutComplete();
      }
    });
  }, [session]);
  
  const handleCastWorkoutComplete = useCallback(async () => {
    if (!runtime || !session) return;
    
    // Get combined metrics (already merged by CastManager)
    const metrics = runtime.metrics?.getMetrics() || [];
    const executionLog = runtime.executionLog;
    
    // Create workout results
    const results: WorkoutResults = {
      id: session.id,
      blockId: session.currentState.targetId,
      startTime: session.currentState.startTime,
      endTime: Date.now(),
      executionLog,
      metrics,
      completionStatus: 'completed',
    };
    
    // Stop casting
    await stopCasting();
    
    // Complete workout in workbench
    completeWorkout(results);
    
    // Switch to analyze view
    setViewMode('analyze');
    
  }, [runtime, session, stopCasting, completeWorkout, setViewMode]);
  
  return {
    handleCastWorkoutComplete,
  };
}
```

### 5.2 Analytics View Enhancement

Update the analytics view to display heart rate data from cast sessions:

```typescript
// Addition to Workbench analytics configuration

const standardMetrics: Record<string, AnalyticsGraphConfig> = {
  'power': { /* existing */ },
  'heart_rate': { 
    id: 'heart_rate', 
    label: 'Heart Rate', 
    unit: 'bpm', 
    color: '#ef4444', 
    dataKey: 'heart_rate', 
    icon: 'Activity' 
  },
  'cadence': { /* existing */ },
  // ... other metrics
};

// Heart rate zone bands for visualization
const heartRateZones = [
  { min: 0, max: 100, label: 'Zone 1 - Recovery', color: '#4CAF50' },
  { min: 100, max: 130, label: 'Zone 2 - Aerobic', color: '#8BC34A' },
  { min: 130, max: 150, label: 'Zone 3 - Tempo', color: '#FFC107' },
  { min: 150, max: 170, label: 'Zone 4 - Threshold', color: '#FF9800' },
  { min: 170, max: 220, label: 'Zone 5 - Anaerobic', color: '#F44336' },
];
```

---

## 6. Environment Configuration

### 6.1 Environment Variables

```bash
# .env.local

# Cast relay server URL
REACT_APP_CAST_RELAY_URL=wss://cast.wod.wiki/relay

# Enable cast feature (can be disabled in production initially)
REACT_APP_CAST_ENABLED=true

# Cast discovery timeout (ms)
REACT_APP_CAST_DISCOVERY_TIMEOUT=10000
```

### 6.2 Feature Flag

```typescript
// src/config/features.ts

export const features = {
  casting: {
    enabled: process.env.REACT_APP_CAST_ENABLED === 'true',
    relayUrl: process.env.REACT_APP_CAST_RELAY_URL,
    discoveryTimeout: parseInt(process.env.REACT_APP_CAST_DISCOVERY_TIMEOUT || '10000', 10),
  },
};

// Usage in components:
import { features } from '../config/features';

{features.casting.enabled && <CastButton />}
```

---

## 7. File Structure Summary

New files to create:

```
src/
├── services/
│   └── cast/
│       ├── CastManager.ts          # Main casting service
│       ├── CastSession.ts          # Session management
│       ├── CastProtocol.ts         # Protocol types (see doc 3)
│       └── index.ts                # Exports
├── hooks/
│   ├── useCastManager.ts           # Cast manager hook
│   ├── useCastSession.ts           # Session state hook
│   └── useWorkoutCompletion.ts     # Completion handler
├── components/
│   └── cast/
│       ├── CastButton.tsx          # Cast toolbar button
│       ├── CastTargetList.tsx      # Device discovery list
│       ├── CastingStatus.tsx       # Active session status
│       └── index.ts                # Exports
└── config/
    └── features.ts                 # Feature flags
```

---

## 8. Testing Considerations

### 8.1 Unit Tests
- CastManager state transitions
- CastSession lifecycle
- Message parsing and validation

### 8.2 Integration Tests
- WebSocket connection handling
- Runtime state synchronization
- Metrics merging

### 8.3 E2E Tests
- Full cast flow (discovery → connect → workout → complete)
- Reconnection handling
- Multi-user scenarios

---

## 9. Migration Path

### Phase 1: Infrastructure
1. Create relay server (see doc 3)
2. Implement CastManager service
3. Add feature flag

### Phase 2: UI Integration
1. Add CastButton to Track View
2. Implement discovery flow
3. Add casting indicators

### Phase 3: Runtime Integration
1. Subscribe to runtime memory
2. Forward state updates
3. Handle incoming events

### Phase 4: Completion Flow
1. Metrics sync handling
2. Analytics integration
3. Heart rate visualization

---

## Next Steps

1. Review [01-android-tv-application-spec.md](01-android-tv-application-spec.md) for TV app implementation
2. Review [03-communication-contract.md](03-communication-contract.md) for protocol details
3. Implement relay server infrastructure
4. Add cast service tests
