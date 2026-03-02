import { ICodeFragment } from '@/core/models/CodeFragment';

// ============================================================================
// Serialized Block — lightweight representation of an IRuntimeBlock
// ============================================================================

/**
 * Serialized timer span (start/end in epoch ms).
 * The receiver interpolates elapsed time locally from these spans.
 */
export interface SerializedTimeSpan {
    started: number;
    ended?: number;
}

/**
 * Serialized timer state extracted from a block's timer memory.
 */
export interface SerializedTimer {
    label?: string;
    format: string;
    durationMs?: number;
    direction: 'up' | 'down';
    spans: SerializedTimeSpan[];
    isRunning: boolean;
}

/**
 * A JSON-serializable representation of an IRuntimeBlock.
 *
 * Contains only what the receiver workbench needs to render:
 * - Identity (key, blockType, label)
 * - Display state (fragment rows, timer, completion)
 * - No methods, no references to runtime internals
 */
export interface SerializedBlock {
    key: string;
    blockType: string;
    label: string;
    sourceIds: number[];
    isComplete: boolean;
    completionReason?: string;

    /** Fragment rows from getFragmentMemoryByVisibility('display') */
    displayFragments: ICodeFragment[][];

    /** Timer state (if the block has a timer memory location) */
    timer: SerializedTimer | null;
}

// ============================================================================
// RPC Messages — typed wire protocol over the DataChannel
// ============================================================================

export interface RpcStackUpdate {
    type: 'rpc-stack-update';
    /** 'push' | 'pop' | 'clear' | 'initial' */
    snapshotType: 'push' | 'pop' | 'clear' | 'initial';
    /** All blocks on the stack (bottom-to-top order) */
    blocks: SerializedBlock[];
    /** The block that was pushed/popped (undefined for clear/initial) */
    affectedBlockKey?: string;
    /** Stack depth after the event */
    depth: number;
    /** Clock time as epoch ms */
    clockTime: number;
}

export interface RpcOutputStatement {
    type: 'rpc-output';
    outputType: string;
    sourceBlockKey: string;
    stackLevel: number;
    fragments: ICodeFragment[];
    completionReason?: string;
    timeSpan: { started: number; ended?: number };
}

export interface RpcEvent {
    type: 'rpc-event';
    name: string;
    timestamp: number;
    data?: unknown;
}

export interface RpcDispose {
    type: 'rpc-dispose';
}

/**
 * Union of all RPC message types sent over the DataChannel.
 */
export type RpcMessage =
    | RpcStackUpdate
    | RpcOutputStatement
    | RpcEvent
    | RpcDispose;
