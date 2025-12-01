import { IScriptRuntime } from '../runtime/IScriptRuntime';
import { LocalStorageProvider } from './storage/LocalStorageProvider';
import { WodResult } from '../core/models/StorageModels';
import { ExecutionSpan, isActiveSpan } from '../runtime/models/ExecutionSpan';
import { EXECUTION_SPAN_TYPE } from '../runtime/ExecutionTracker';
import { v4 as uuidv4 } from 'uuid';
import { IMemoryReference } from '../runtime/IMemoryReference';

/**
 * Service to manage execution logging and persistence.
 * Connects the RuntimeMemory to LocalStorage.
 */
export class ExecutionLogService {
  private currentResult: WodResult | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private storage: LocalStorageProvider) {}

  /**
   * Initialize logging for a runtime session.
   * If resume is true, it attempts to load the latest unfinished result (not implemented yet).
   * For now, it starts a new result session or updates the existing one.
   */
  startSession(runtime: IScriptRuntime, documentId: string = 'scratchpad', documentTitle: string = 'Scratchpad Workout') {
    this.cleanup();

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
   * Load historical logs into the runtime memory.
   * This allows the UI (History Timeline) to display past execution data.
   */
  async hydrate(runtime: IScriptRuntime) {
    // For now, let's load the *most recent* result to simulate "history persistence" across refresh.
    // In a real app, we might load a specific result or a set of recent ones.
    const latest = await this.storage.getLatestResult();

    if (latest && latest.logs.length > 0) {
      console.log('[ExecutionLogService] Hydrating runtime with logs from', latest.timestamp);

      latest.logs.forEach(span => {
        // We need to allocate these spans in memory so the UI can query them.
        // We use 'public' visibility so they are accessible.
        // Note: ownerId is usually the blockId.
        try {
            runtime.memory.allocate(EXECUTION_SPAN_TYPE, span.blockId, span, 'public');
        } catch (e) {
            console.warn('[ExecutionLogService] Failed to hydrate span', span.id, e);
        }
      });
    }
  }

  private handleMemoryChange(ref: IMemoryReference, value: any, oldValue: any) {
    if (ref.type !== EXECUTION_SPAN_TYPE) return;

    const span = value as ExecutionSpan;
    if (!span) return;

    // We only care about persisting the span when it's updated or finished.
    // Since we are persisting the *entire* log history, we can just update our local copy.

    if (this.currentResult) {
       // Find if we already have this span in our logs
       const existingIndex = this.currentResult.logs.findIndex(s => s.id === span.id);

       if (existingIndex >= 0) {
         this.currentResult.logs[existingIndex] = span;
       } else {
         this.currentResult.logs.push(span);
       }

       // Update timestamp
       this.currentResult.timestamp = Date.now();

       // Calculate duration based on earliest start and latest end
       if (this.currentResult.logs.length > 0) {
           const start = Math.min(...this.currentResult.logs.map(s => s.startTime));
           const end = Math.max(...this.currentResult.logs.map(s => s.endTime ?? Date.now()));
           this.currentResult.duration = end - start;
       }

       // Persist to storage
       // Optimization: Debounce this in production, but for now direct save is safer.
       this.storage.saveResult(this.currentResult);
    }
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.currentResult = null;
  }
}

export const executionLogService = new ExecutionLogService(new LocalStorageProvider());
