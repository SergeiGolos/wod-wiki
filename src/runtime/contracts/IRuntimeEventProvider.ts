/**
 * Contract for injecting user events (start, pause, stop, next, etc.)
 * into the runtime.
 *
 * Implementations include:
 * - **LocalEventProvider**: calls `runtime.handle()` directly for local UI events.
 * - **CastEventProvider**: receives events from the WebRTC transport
 *   (Chromecast remote D-Pad) and forwards them into the runtime.
 *
 * Multiple providers can be active simultaneously. Connecting a Chromecast
 * adds a CastEventProvider without removing the local one.
 */
export interface IRuntimeEventProvider {
  /** Unique identifier for this provider (e.g. 'local', 'cast-<sessionId>'). */
  readonly id: string;

  /** Whether this provider is currently connected and able to inject events. */
  readonly isConnected: boolean;

  /**
   * Start providing events to the given runtime.
   *
   * @param runtime Duck-typed handle that accepts events.
   */
  connect(runtime: IEventReceivingRuntime): void;

  /**
   * Stop providing events. Does not dispose — can be reconnected.
   */
  disconnect(): void;

  /**
   * Permanently dispose of the provider and release all resources.
   */
  dispose(): void;
}

/**
 * Minimal duck-typed interface for injecting events into a runtime.
 */
export interface IEventReceivingRuntime {
  handle(event: { name: string; timestamp: Date; data?: unknown }): void;
}
