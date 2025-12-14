import { IScriptRuntime } from '../runtime/IScriptRuntime';
import { LocalStorageProvider } from './storage/LocalStorageProvider';
import { WodResult } from '../core/models/StorageModels';
import { ExecutionSpan, EXECUTION_SPAN_TYPE } from '../runtime/models/ExecutionSpan';
import { v4 as uuidv4 } from 'uuid';
import { IMemoryReference } from '../runtime/IMemoryReference';

/**
 * Service to manage execution logging and persistence.
 * Connects the RuntimeMemory to LocalStorage.
 */
export class ExecutionLogService {
  private currentResult: WodResult | null = null;
  private unsubscribe: (() => void) | null = null;

  // Map for O(1) span lookup by id
  private spanMap: Map<string, ExecutionSpan> = new Map();

  // Incremental duration tracking for performance
  private earliestStart: number = Infinity;
  private latestEnd: number = 0;

  // Debounce timer for localStorage writes
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000; // Save at most once per second

  constructor(private storage: LocalStorageProvider) { }

  /**
   * Initialize logging for a runtime session.
   * Creates a new result container and subscribes to memory changes
   * to track execution spans in real-time.
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

    // Subscribe to memory changes
    this.unsubscribe = runtime.memory.subscribe((ref, value, oldValue) => {
      this.handleMemoryChange(ref, value, oldValue);
    });

    console.log('[ExecutionLogService] Started session', this.currentResult.id);
  }

  /**
   * Returns the most recent historical logs from storage.
   * Historical logs should NOT be allocated into runtime memory to avoid
   * duplicate allocations and memory ownership violations.
   * Use this method to access historical data directly.
   */
  async getHistoricalLogs(): Promise<ExecutionSpan[]> {
    const latest = await this.storage.getLatestResult();
    if (latest && latest.logs.length > 0) {
      console.log('[ExecutionLogService] Retrieved historical logs from', latest.timestamp);
      return latest.logs;
    }
    return [];
  }

  private handleMemoryChange(ref: IMemoryReference, value: any, _oldValue: any) {
    if (ref.type !== EXECUTION_SPAN_TYPE) return;

    const span = value as ExecutionSpan;
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
      console.log('[ExecutionLogService] Finished session', this.currentResult.id);
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

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Reset state
    this.currentResult = null;
    this.spanMap.clear();
    this.earliestStart = Infinity;
    this.latestEnd = 0;
  }
}

export const executionLogService = new ExecutionLogService(new LocalStorageProvider());
