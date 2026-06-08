import { PushBlockAction } from '../actions/stack/PushBlockAction';
import { OutputEmitter } from '../OutputEmitter';
import type { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import type { IRuntimeAction } from '../contracts/IRuntimeAction';
import type { RuntimeStackTracker, RuntimeStackWrapper, RuntimeStackLogger, RuntimeStackHooks } from '../contracts/IRuntimeOptions';
import type { IRuntimeClock } from '../contracts/IRuntimeClock';
import type { PushBlockResult } from '../contracts/IRuntimePipeline';

/**
 * Encapsulates the pre-push and post-push choreography:
 * hooks → compiler output → tracking span → wrapper → action → logger → after hook.
 */
export class PushBlockStage {
  constructor(
    private readonly _output: OutputEmitter,
    private readonly _tracker: RuntimeStackTracker | undefined,
    private readonly _wrapper: RuntimeStackWrapper | undefined,
    private readonly _logger: RuntimeStackLogger | undefined,
    private readonly _hooks: RuntimeStackHooks | undefined,
    private readonly _clock: IRuntimeClock
  ) {}

  prepare(
    block: IRuntimeBlock,
    parentBlock: IRuntimeBlock | undefined,
    stackCount: number,
    lifecycle?: BlockLifecycleOptions
  ): PushBlockResult {
    // 1. Before hook
    this._hooks?.onBeforePush?.(block, parentBlock);

    // 2. Compiler output
    this._output.emitCompilerBlock(block, stackCount, this._clock);

    // 3. Tracking span
    const parentSpanId = parentBlock
      ? this._tracker?.getActiveSpanId?.(parentBlock.key.toString()) ?? null
      : null;
    this._tracker?.startSpan?.(block, parentSpanId);

    // 4. Wrapper
    const wrappedBlock = this._wrapper?.wrap?.(block, parentBlock) ?? block;

    // 5. Action
    const action: IRuntimeAction = new PushBlockAction(wrappedBlock, lifecycle);

    // 6. After callback (runs once the action and its children have settled)
    const afterPush = (): void => {
      this._logger?.debug?.('runtime.pushBlock', {
        blockKey: block.key.toString(),
        parentKey: parentBlock?.key.toString(),
      });
      this._hooks?.onAfterPush?.(wrappedBlock, parentBlock);
    };

    return { action, afterPush };
  }
}
