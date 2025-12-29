import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';
import { LocalStorageProvider } from './storage/LocalStorageProvider';
import { WodResult } from '../core/models/StorageModels';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../runtime/models/RuntimeSpan';
import { v4 as uuidv4 } from 'uuid';
import { IEvent } from '../runtime/contracts/events/IEvent';

/**
 * Service to manage execution logging and persistence.
 * Connects to the EventBus for memory change notifications.
 */
export class ExecutionLogService {
  private currentResult: WodResult | null = null;
  private currentRuntime: IScriptRuntime | null = null;
  private readonly ownerId = 'execution-log-service';

  // Map for O(1) span lookup by id
  private spanMap: Map<string, RuntimeSpan> = new Map();

  // Incremental duration tracking for performance
  private earliestStart: number = Infinity;
  private latestEnd: number = 0;

  // Debounce timer for localStorage writes
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000; // Save at most once per second

  constructor(private storage: LocalStorageProvider) { }

  /**
   * Initialize logging for a runtime session.
   * Creates a new result container and subscribes to memory events
   * via the EventBus to track execution spans in real-time.
   *
   * @param runtime - The runtime instance to track
   * @param documentId - ID of the workout document (defaults to 'scratchpad')
   * @param documentTitle - Title of the workout (defaults to 'Scratchpad Workout')
   */
  startSession(runtime: IScriptRuntime, documentId: string = 'scratchpad', documentTitle: string = 'Scratchpad Workout') {
    this.cleanup();

    // Reset incremental tracking
    this.spanMap.clear();
    this.earliestStart = Infinity;
    this.latestEnd = 0;

    // Initialize current result container
    this.currentResult = {
      id: uuidv4(),
      documentId,
      documentTitle,
      timestamp: Date.now(),
      duration: 0,
      logs: [],
      metadata: {},
      schemaVersion: 1
    };

    this.currentRuntime = runtime;

    // Subscribe to memory events via EventBus
    const handleMemoryEvent = (event: IEvent) => {
      const data = event.data as { ref: { type: string }; value: unknown; oldValue?: unknown };
      if (data?.ref?.type === RUNTIME_SPAN_TYPE) {
        this.handleSpanUpdate(data.value as RuntimeSpan);
      }
    };

    runtime.eventBus.on('memory:set', handleMemoryEvent, this.ownerId);
    runtime.eventBus.on('memory:allocate', handleMemoryEvent, this.ownerId);
  }

  /**
   * Returns the most recent historical logs from storage.
   * Historical logs should NOT be allocated into runtime memory to avoid
   * duplicate allocations and memory ownership violations.
   * @returns Array of historical spans (both models)
   */
  async getHistoricalLogs(): Promise<RuntimeSpan[]> {
    const latest = await this.storage.getLatestResult();
    if (latest && latest.logs.length > 0) {
      return latest.logs;
    }
    return [];
  }

  private handleSpanUpdate(span: RuntimeSpan | null) {
    if (!span) return;

    // We only care about persisting the span when it's updated or finished.
    // Since we are persisting the *entire* log history, we can just update our local copy.

    if (this.currentResult) {
      // Use Map for O(1) lookup instead of array search
      this.spanMap.set(span.id, span);

      // Update logs array from map (maintains insertion order)
      this.currentResult.logs = Array.from(this.spanMap.values());

      // Update min/max incrementally for O(1) duration calculation
      this.earliestStart = Math.min(this.earliestStart, span.startTime);
      const endTime = span.endTime ?? Date.now();
      this.latestEnd = Math.max(this.latestEnd, endTime);

      // Calculate duration from cached values
      if (this.earliestStart !== Infinity) {
        this.currentResult.duration = this.latestEnd - this.earliestStart;
      }

      // Debounce persistence to avoid excessive localStorage writes
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
      }

      this.saveDebounceTimer = setTimeout(() => {
        if (this.currentResult) {
          this.storage.saveResult(this.currentResult);
        }
        this.saveDebounceTimer = null;
      }, this.SAVE_DEBOUNCE_MS);
    }
  }

  /**
   * Mark the current session as finished with a completion timestamp.
   * Call this when the workout actually completes.
   */
  finishSession() {
    if (this.currentResult) {
      this.currentResult.timestamp = Date.now();

      // Flush any pending debounced save immediately
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = null;
      }

      this.storage.saveResult(this.currentResult);
    }
  }

  cleanup() {
    // Flush pending save immediately on cleanup
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      if (this.currentResult) {
        this.storage.saveResult(this.currentResult);
      }
      this.saveDebounceTimer = null;
    }

    // Unregister from EventBus
    if (this.currentRuntime?.eventBus) {
      this.currentRuntime.eventBus.unregisterByOwner(this.ownerId);
    }

    // Reset state
    this.currentResult = null;
    this.currentRuntime = null;
    this.spanMap.clear();
    this.earliestStart = Infinity;
    this.latestEnd = 0;
  }
}

export const executionLogService = new ExecutionLogService(new LocalStorageProvider());
