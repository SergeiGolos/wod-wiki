// src/services/cast/CastManager.ts
import { v4 as uuidv4 } from 'uuid';
import {
    CastMessage,
    CastMessageType,
    RegisterMessage,
    StateUpdateMessage,
    IDisplayStackState,
    CastRequestMessage,
    WorkoutDefinition,
    SessionConfig,
    TargetDiscoveredMessage
} from '@/types/cast/messages';

type Listener = (...args: unknown[]) => void;

export class CastManager {
  private listeners: Map<string, Listener[]> = new Map();
  private ws: WebSocket | null = null;
  private deviceId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: number | null = null;
  private eventBuffer: unknown[] = [];

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
  private getReconnectDelay(): number {
    const base = Math.min(30, Math.pow(2, this.reconnectAttempts));
    const jitter = Math.random() * 0.3 * base; // 30% jitter
    return (base + jitter) * 1000;
  }

  constructor() {
    this.deviceId = 'web-' + uuidv4().substring(0, 8);
  }

  on(event: string, listener: Listener) {
      if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
      }
      this.listeners.get(event)?.push(listener);
  }

  off(event: string, listener: Listener) {
      const listeners = this.listeners.get(event);
      if (listeners) {
          this.listeners.set(event, listeners.filter(l => l !== listener));
      }
  }

  emit(event: string, ...args: unknown[]) {
      this.listeners.get(event)?.forEach(l => l(...args));
  }

  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to ${serverUrl}`);
      this.ws = new WebSocket(serverUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.registerDevice();
        this.flushEventBuffer();
        this.emit('connectionOpened');
        resolve();
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed', event);
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(serverUrl);
        }
        this.emit('connectionClosed', event);
      };

      this.ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data) as CastMessage;
            this.handleMessage(message);
        } catch (e) {
            console.error('Failed to parse message', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error', error);
        // If it's the first connection attempt, reject
        if (this.reconnectAttempts === 0 && this.ws?.readyState !== WebSocket.OPEN) {
            reject(error);
        }
      };
    });
  }

  disconnect() {
    if (this.ws) {
        this.ws.close();
        this.ws = null;
    }
    if (this.reconnectTimeout) {
        window.clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
    }
  }

  private registerDevice() {
      const msg: RegisterMessage = {
          type: 'register',
          messageId: uuidv4(),
          timestamp: Date.now(),
          payload: {
              clientType: 'caster',
              clientId: this.deviceId,
              clientName: 'Web Client',
              capabilities: {
                  heartRateMonitor: false,
                  multiUser: false,
                  features: ['*']
              },
              protocolVersion: '1.0.0'
          }
      };
      this.send(msg);
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
  send(message: CastMessage): void {
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

  private handleMessage(message: CastMessage) {
      switch (message.type) {
          case 'target-discovered':
              this.emit('targetDiscovered', (message as TargetDiscoveredMessage).payload);
              break;
          case 'cast-accepted':
              this.emit('castAccepted', message);
              break;
          case 'state-ack':
              // Handle ack
              break;
          case 'event-from-receiver':
              this.emit('receiverEvent', message.payload);
              break;
          case 'cast-stop':
          case 'session-ended':
              this.emit('castStop');
              break;
          default:
              console.log('Unhandled message', message.type);
      }
  }

  discoverTargets() {
      const msg: CastMessage = {
          type: 'discover',
          messageId: uuidv4(),
          timestamp: Date.now(),
          payload: {}
      };
      this.send(msg);
  }

  startCast(targetId: string, workoutScript: string) {
      const sessionId = uuidv4();
      const msg: CastRequestMessage = {
          type: 'cast-request',
          messageId: uuidv4(),
          timestamp: Date.now(),
          payload: {
              targetId,
              sessionId,
              workout: {
                  script: workoutScript
              },
              caster: {
                  id: this.deviceId,
                  name: 'Web User'
              },
              config: {
                  receiverControlEnabled: true,
                  heartRateSyncEnabled: true,
                  metricsSyncInterval: 5000,
                  autoStopOnDisconnect: true
              }
          }
      };
      this.send(msg);
      return sessionId;
  }

  sendStateUpdate(sessionId: string, displayState: IDisplayStackState, sequenceNumber: number) {
      const msg: StateUpdateMessage = {
          type: 'state-update',
          messageId: uuidv4(),
          sessionId,
          timestamp: Date.now(),
          payload: {
              displayState,
              sequenceNumber
          }
      };
      this.send(msg);
  }

  stopCast(sessionId: string) {
      const msg: CastMessage = {
          type: 'cast-stop',
          messageId: uuidv4(),
          sessionId,
          timestamp: Date.now(),
          payload: {
              initiatedBy: 'caster',
              reason: 'user-requested'
          }
      };
      this.send(msg);
  }
}
