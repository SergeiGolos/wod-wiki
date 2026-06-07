import type { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import type { RpcMessage } from '@/services/cast/rpc/RpcMessages';

export interface ScriptState {
    /** Frozen stack at the moment of snapshot. */
    readonly blocks: readonly IRuntimeBlock[];
    readonly depth: number;
    readonly current: IRuntimeBlock | undefined;
    /** Runtime clock time at snapshot. */
    readonly clockTime: Date;
    /** All RpcMessages the cast side has received up to snapshot. */
    readonly castSent: readonly RpcMessage[];
    /** Stack events that have occurred since script start. */
    readonly stackHistory: ReadonlyArray<{ type: 'push' | 'pop' | 'clear' | 'initial'; block?: IRuntimeBlock; depth: number; at: Date }>;
}
