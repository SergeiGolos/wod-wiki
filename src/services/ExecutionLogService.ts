import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';
import { LocalStorageProvider } from './storage/LocalStorageProvider';
import { WodResult } from '../core/models/StorageModels';
import { IOutputStatement } from '../core/models/OutputStatement';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to manage execution logging and persistence.
 * Subscribes to the runtime's output stream to capture completed blocks.
 */
export class ExecutionLogService {
  private currentResult: WodResult | null = null;
  private currentRuntime: IScriptRuntime | null = null;

  // Map for O(1) output lookup by id
  private outputMap: Map<number, IOutputStatement> = new Map();

  // Incremental duration tracking for performance
  private earliestStart: number = Infinity;
  private latestEnd: number = 0;

  // Debounce timer for localStorage writes
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000; // Save at most once per second

  // Unsubscribe function for output stream
  private unsubscribeOutput?: () => void;

  constructor(private storage: LocalStorageProvider) { }

  /**
   * Initialize logging for a runtime session.
   * Creates a new result container and subscribes to the runtime's
   * output stream to track execution results in real-time.
   *
   * @param runtime - The runtime instance to track
   * @param documentId - ID of the workout document (defaults to 'scratchpad')
   * @param documentTitle - Title of the workout (defaults to 'Scratchpad Workout')
   */
  startSession(runtime: IScriptRuntime, documentId: string = 'scratchpad', documentTitle: string = 'Scratchpad Workout') {
    this.cleanup();

    // Reset incremental tracking
    this.outputMap.clear();
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
      schemaVersion: 2
    };

    this.currentRuntime = runtime;

    // Subscribe to output stream — each OutputStatement is a completed block record
    this.unsubscribeOutput = runtime.subscribeToOutput((output: IOutputStatement) => {
      this.handleOutput(output);
    });
  }

  /**
   * Returns the most recent historical logs from storage.
   * @returns Array of historical output statements
   */
  async getHistoricalLogs(): Promise<IOutputStatement[]> {
    const latest = await this.storage.getLatestResult();
    if (latest && latest.logs.length > 0) {
      return latest.logs;
    }
    return [];
  }

  private handleOutput(output: IOutputStatement) {
    if (!this.currentResult) return;

    // Use Map for O(1) lookup instead of array search
    this.outputMap.set(output.id, output);

    // Update logs array from map (maintains insertion order)
    this.currentResult.logs = Array.from(this.outputMap.values());

    // Update min/max incrementally for O(1) duration calculation
    const startTime = output.timeSpan.started;
    if (startTime !== undefined) {
      this.earliestStart = Math.min(this.earliestStart, startTime);
    }
    const endTime = output.timeSpan.ended ?? Date.now();
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

    // Unsubscribe from output stream
    this.unsubscribeOutput?.();
    this.unsubscribeOutput = undefined;

    // Reset state
    this.currentResult = null;
    this.currentRuntime = null;
    this.outputMap.clear();
    this.earliestStart = Infinity;
    this.latestEnd = 0;
  }
}

export const executionLogService = new ExecutionLogService(new LocalStorageProvider());
