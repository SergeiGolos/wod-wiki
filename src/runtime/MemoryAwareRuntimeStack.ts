import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IScriptRuntime } from './IScriptRuntime';
import { RuntimeStack } from './RuntimeStack';
import { ExecutionTracker } from './ExecutionTracker';

/**
 * MemoryAwareRuntimeStack
 *
 * Extends the basic RuntimeStack to add:
 * 1. Automatic execution tracking via ExecutionTracker
 * 2. Proper lifecycle management for popped blocks
 * 3. Parent/Child relationship tracking for execution spans
 */
export class MemoryAwareRuntimeStack extends RuntimeStack {
  constructor(
    private readonly runtime: IScriptRuntime,
    private readonly tracker: ExecutionTracker
  ) {
    super();
  }

  /**
   * Pops the current block and performs full lifecycle cleanup:
   * unmount -> pop (ends span) -> dispose -> context.release -> parent.next
   */
  popWithLifecycle(): void {
    const currentBlock = this.current;
    if (!currentBlock) {
      return;
    }

    let unmountActions: IRuntimeAction[] = [];
    try {
      unmountActions = currentBlock.unmount(this.runtime);
    } catch (error) {
      console.error('Error during block unmount', error);
    }

    const popped = this.pop(); // tracker.endSpan occurs in pop override

    if (popped) {
      try {
        popped.dispose(this.runtime);
      } catch (error) {
        console.error('Error disposing block', error);
      }

      try {
        if (popped.context && typeof popped.context.release === 'function') {
          popped.context.release();
        }
      } catch (error) {
        console.error('Error releasing block context', error);
      }

      try {
        this.runtime.eventBus?.unregisterByOwner?.(popped.key.toString());
      } catch (error) {
        console.error('Error unregistering event handlers for block', error);
      }
    }

    for (const action of unmountActions) {
      try { action.do(this.runtime); } catch (error) { console.error('Error running unmount action', error); }
    }

    const parent = this.current;
    if (parent) {
      const nextActions = parent.next(this.runtime);
      for (const action of nextActions) {
        try { action.do(this.runtime); } catch (error) { console.error('Error running parent next action', error); }
      }
    }
  }

  /**
   * Pushes a block onto the stack and starts execution tracking.
   */
  override push(block: IRuntimeBlock): void {
    const parentBlock = this.current;
    let parentSpanId: string | null = null;

    if (parentBlock) {
      // Find parent execution span ID
      parentSpanId = this.tracker.getActiveSpanId(parentBlock.key.toString());
    }

    // Start tracking execution span
    const span = this.tracker.startSpan(block, parentSpanId);

    // Record initial metrics from block if available
    if (block.compiledMetrics) {
      this.tracker.recordLegacyMetric(block.key.toString(), block.compiledMetrics);
    } else if (block.blockType === 'Effort' && block.label) {
      // Fallback for legacy blocks without compiledMetrics
      const label = block.label;
      const match = label.match(/^(\d+)\s+(.+)$/);
      if (match) {
        const reps = parseInt(match[1], 10);
        const exerciseName = match[2].trim();
        if (!isNaN(reps)) {
          this.tracker.recordLegacyMetric(block.key.toString(), {
            exerciseId: exerciseName,
            values: [{ type: 'repetitions', value: reps, unit: 'reps' }],
            timeSpans: []
          });
        }
      } else {
        this.tracker.recordLegacyMetric(block.key.toString(), {
          exerciseId: label,
          values: [],
          timeSpans: []
        });
      }
    }

    // Provide runtime context if the block expects it (duck-typing)
    if (typeof (block as any).setRuntime === 'function') {
      (block as any).setRuntime(this.runtime);
    }

    // Perform standard push
    super.push(block);
  }

  /**
   * Pops a block from the stack and completes its execution tracking.
   * Note: Does NOT dispose the block - consumer must call dispose().
   */
  override pop(): IRuntimeBlock | undefined {
    const poppedBlock = super.pop();

    if (poppedBlock) {
      // Complete execution span
      this.tracker.endSpan(poppedBlock.key.toString());
    }

    return poppedBlock;
  }
}
