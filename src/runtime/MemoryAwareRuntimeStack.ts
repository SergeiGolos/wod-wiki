import { IRuntimeAction } from './IRuntimeAction';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IScriptRuntime } from './IScriptRuntime';
import { RuntimeStack } from './RuntimeStack';
import { ExecutionLogger } from './ExecutionLogger';

/**
 * MemoryAwareRuntimeStack
 *
 * Extends the basic RuntimeStack to add:
 * 1. Automatic execution logging via ExecutionLogger
 * 2. Proper lifecycle management for popped blocks
 * 3. Parent/Child relationship tracking for execution records
 */
export class MemoryAwareRuntimeStack extends RuntimeStack {
  constructor(
    private readonly runtime: IScriptRuntime,
    private readonly logger: ExecutionLogger
  ) {
    super();
  }

  /**
   * Pushes a block onto the stack and logs its execution start.
   */
  override push(block: IRuntimeBlock): void {
    const parentBlock = this.current;
    let parentId: string | null = null;

    if (parentBlock) {
      // Find parent execution record ID
      parentId = this.logger.getActiveRecordId(parentBlock.key.toString());
    }

    // Determine initial metrics
    // Use pre-compiled metrics if available, or legacy fallback
    const initialMetrics = block.compiledMetrics ? [block.compiledMetrics] : [];

    // Fallback for legacy blocks without compiledMetrics
    if (initialMetrics.length === 0 && block.blockType === 'Effort' && block.label) {
        const label = block.label;
        const match = label.match(/^(\d+)\s+(.+)$/);
        if (match) {
            const reps = parseInt(match[1], 10);
            const exerciseName = match[2].trim();
            if (!isNaN(reps)) {
                 initialMetrics.push({
                    exerciseId: exerciseName,
                    values: [{ type: 'repetitions', value: reps, unit: 'reps' }],
                    timeSpans: []
                });
            }
        } else {
             initialMetrics.push({
                exerciseId: label,
                values: [],
                timeSpans: []
            });
        }
    }

    // Start logging execution
    this.logger.startExecution(
      block.key.toString(),
      block.blockType || 'unknown',
      block.label || block.key.toString(),
      parentId,
      initialMetrics
    );

    // Provide runtime context if the block expects it (duck-typing)
    if (typeof (block as any).setRuntime === 'function') {
      (block as any).setRuntime(this.runtime);
    }

    // Perform standard push
    super.push(block);
  }

  /**
   * Pops a block from the stack and logs its completion.
   * Note: Does NOT dispose the block - consumer must call dispose().
   */
  override pop(): IRuntimeBlock | undefined {
    const poppedBlock = super.pop();

    if (poppedBlock) {
      // Complete execution log
      this.logger.completeExecution(poppedBlock.key.toString());
    }

    return poppedBlock;
  }
}
