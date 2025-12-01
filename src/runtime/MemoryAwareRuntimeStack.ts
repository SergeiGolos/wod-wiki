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
