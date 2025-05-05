declare global {
  interface Window {
    chrome?: any;
    cast?: typeof cast;
  }
}

// Sender- and receiver-side Cast Framework typings
declare namespace cast {
  namespace framework {
    // Sender-side
    class CastContext {
      static getInstance(): CastContext;
      requestSession(): Promise<void>;
      endCurrentSession(stopCasting: boolean): Promise<void>;
      getCurrentSession(): CastSession | null;
      addEventListener(type: CastContextEventType, handler: (event: any) => void): void;
    }
    type CastContextEventType = 'SESSION_STATE_CHANGED';
    class CastSession {
      sendMessage(namespace: string, message: any): void;
      receiver?: { friendlyName?: string };
    }
    // Receiver-side
    class CastReceiverContext {
      static getInstance(): CastReceiverContext;
      start(options?: CastReceiverOptions): void;
    }
    class CastReceiverOptions {
      disableIdleTimeout?: boolean;
    }
  }
}