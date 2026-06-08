import { PopBlockAction } from '../actions/stack/PopBlockAction';
import type { IRuntimeBlock, BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import type { IRuntimeAction } from '../contracts/IRuntimeAction';
import type { RuntimeStackTracker, RuntimeStackWrapper, RuntimeStackLogger, RuntimeStackHooks } from '../contracts/IRuntimeOptions';
import type { PopBlockResult } from '../contracts/IRuntimePipeline';

/**
 * Encapsulates the pre-pop and post-pop choreography:
 * before hook → action → tracking end → wrapper cleanup → hook unregister → logger → after hook.
 */
export class PopBlockStage {
  constructor(
    private readonly _tracker: RuntimeStackTracker | undefined,
    private readonly _wrapper: RuntimeStackWrapper | undefined,
    private readonly _logger: RuntimeStackLogger | undefined,
    private readonly _hooks: RuntimeStackHooks | undefined
  ) {}

  prepare(
    currentBlock: IRuntimeBlock,
    getStackDepth: () => number,
    lifecycle?: BlockLifecycleOptions
  ): PopBlockResult {
    // 1. Before hook
    this._hooks?.onBeforePop?.(currentBlock);

    // 2. Action
    const action: IRuntimeAction = new PopBlockAction(lifecycle);

    // 3. After callback (runs once the action and its children have settled)
    const ownerKey = currentBlock.key.toString();
    const afterPop = (): void => {
      this._tracker?.endSpan?.(ownerKey);
      this._wrapper?.cleanup?.(currentBlock);
      this._hooks?.unregisterByOwner?.(ownerKey);
      this._logger?.debug?.('runtime.popBlock', {
        blockKey: ownerKey,
        stackDepth: getStackDepth(),
      });
      this._hooks?.onAfterPop?.(currentBlock);
    };

    return { action, afterPop };
  }
}
