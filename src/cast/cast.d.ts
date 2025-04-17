declare namespace cast.framework {
  class CastReceiverContext {
    static getInstance(): CastReceiverContext;
    start(options?: CastReceiverOptions): void;
  }

  class CastReceiverOptions {
    disableIdleTimeout?: boolean;
  }
}