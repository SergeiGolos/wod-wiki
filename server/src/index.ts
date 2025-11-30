// server/src/index.ts
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Simple interface for now as I cannot easily share types across package boundaries in this setup
// without monorepo tools or symlinks.
interface CastMessage {
    type: string;
    messageId: string;
    sessionId?: string;
    timestamp: number;
    payload: any;
}

interface Connection {
  ws: WebSocket;
  deviceId: string;
  deviceType: 'sender' | 'receiver';
  lastPing: number;
  capabilities?: any;
}

const connections = new Map<string, Connection>();
const sessions = new Map<string, { casterId: string; receiverId: string }>();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`Relay server started on port ${PORT}`);

// Heartbeat
const HEARTBEAT_INTERVAL = 25000;
const HEARTBEAT_TIMEOUT = 30000;

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

wss.on('connection', (ws) => {
  let deviceId: string | null = null;

  ws.on('pong', () => {
    if (deviceId && connections.has(deviceId)) {
        const conn = connections.get(deviceId)!;
        conn.lastPing = Date.now();
    }
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as CastMessage;

      switch (message.type) {
        case 'register':
            deviceId = message.payload.clientId;
            const clientType = message.payload.clientType;
            if (deviceId) {
                connections.set(deviceId, {
                    ws,
                    deviceId,
                    deviceType: clientType,
                    lastPing: Date.now(),
                    capabilities: message.payload.capabilities
                });

                const response: CastMessage = {
                    type: 'register-ack',
                    messageId: uuidv4(),
                    timestamp: Date.now(),
                    payload: {
                        success: true,
                        relayId: 'relay-local',
                        serverCapabilities: {
                            maxSessionDuration: 14400000,
                            maxMetricsBatchSize: 1000,
                            heartbeatInterval: 30000
                        }
                    }
                };
                ws.send(JSON.stringify(response));
                console.log(`Registered ${clientType}: ${deviceId}`);
            }
            break;

        case 'discover':
            // Return all connected receivers
            const receivers: any[] = [];
            connections.forEach((conn) => {
                if (conn.deviceType === 'receiver') {
                    receivers.push({
                        targetId: conn.deviceId,
                        name: 'Receiver ' + conn.deviceId, // Should be from payload
                        type: 'android-tv',
                        capabilities: conn.capabilities,
                        inSession: false // Simplification
                    });
                }
            });

            receivers.forEach(r => {
                const response: CastMessage = {
                    type: 'target-discovered',
                    messageId: uuidv4(),
                    timestamp: Date.now(),
                    payload: r
                };
                ws.send(JSON.stringify(response));
            });
            break;

        case 'cast-request':
            const targetId = message.payload.targetId;
            const targetConn = connections.get(targetId);
            if (targetConn) {
                targetConn.ws.send(JSON.stringify(message));
                // Track session
                if (message.payload.sessionId && deviceId) {
                    sessions.set(message.payload.sessionId, {
                        casterId: deviceId,
                        receiverId: targetId
                    });
                }
            } else {
                // Send error
                const error: CastMessage = {
                    type: 'error',
                    messageId: uuidv4(),
                    timestamp: Date.now(),
                    payload: {
                        code: 'TARGET_NOT_FOUND',
                        message: 'Target device not found',
                        recoverable: false
                    }
                };
                ws.send(JSON.stringify(error));
            }
            break;

        default:
            // Forward message if we know the destination
            // Assuming direct forwarding based on sessionId or if targetId is specified in payload (not standard for all messages)
            // Or simpler: if this is from caster, send to receiver in session, and vice versa.

            if (message.sessionId) {
                const session = sessions.get(message.sessionId);
                if (session) {
                    let destId: string | undefined;
                    if (deviceId === session.casterId) {
                        destId = session.receiverId;
                    } else if (deviceId === session.receiverId) {
                        destId = session.casterId;
                    }

                    if (destId) {
                        const destConn = connections.get(destId);
                        if (destConn) {
                            destConn.ws.send(JSON.stringify(message));
                        }
                    }

                    // Clean up session if ended
                    if (message.type === 'session-ended' || message.type === 'cast-stop') {
                        sessions.delete(message.sessionId);
                        console.log(`Session ended: ${message.sessionId}`);
                    }
                }
            }
            break;
      }
    } catch (e) {
      console.error('Error processing message', e);
    }
  });

  ws.on('close', () => {
    if (deviceId) {
      connections.delete(deviceId);
      console.log(`Disconnected: ${deviceId}`);
    }
  });
});
