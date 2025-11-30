// tv/src/services/WebSocketService.ts
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export class TVWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private deviceId: string;
  private isReconnecting = false;
  private stateSequence = 0;

  constructor() {
      super();
      // Generate a random ID for the TV
      this.deviceId = 'tv-' + Math.random().toString(36).substring(2, 10);
  }

  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          this.register();
          this.emit('connected');
          resolve();
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

        this.ws.onerror = (e) => {
            console.error('WS Error', e);
            reject(e);
        }
    });
  }

  private register() {
      this.send({
          type: 'register',
          messageId: uuidv4(),
          timestamp: Date.now(),
          payload: {
              clientType: 'receiver',
              clientId: this.deviceId,
              clientName: 'Android TV',
              capabilities: {
                  heartRateMonitor: true,
                  multiUser: false,
                  features: ['*']
              },
              protocolVersion: '1.0.0'
          }
      });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'state-update':
        // Only process if sequence is newer
        if (message.payload.sequenceNumber > this.stateSequence) {
          this.stateSequence = message.payload.sequenceNumber;
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

  acceptCast(sessionId: string) {
      this.send({
          type: 'cast-accepted',
          messageId: uuidv4(),
          sessionId,
          timestamp: Date.now(),
          payload: {
              ready: true,
              users: []
          }
      });
  }

  send(message: any) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(message));
      }
  }

  private scheduleReconnect(serverUrl: string) {
      setTimeout(() => {
          this.connect(serverUrl).catch(() => {});
      }, 5000);
  }
}
