// tv/src/services/ServiceContainer.ts
import { TVWebSocketService } from './WebSocketService';

// Singleton instance
export const webSocketService = new TVWebSocketService();
