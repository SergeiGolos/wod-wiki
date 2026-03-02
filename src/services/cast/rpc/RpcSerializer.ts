import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { StackSnapshot } from '@/runtime/contracts/IRuntimeStack';
import {
    SerializedBlock,
    SerializedTimer,
    RpcStackUpdate,
    RpcOutputStatement,
} from './RpcMessages';

/**
 * Extract timer state from a block's timer memory location.
 * Returns null if the block has no timer.
 *
 * Timer behaviors (CountupTimerBehavior, CountdownTimerBehavior, SpanTrackingBehavior)
 * all use ctx.pushMemory('time', [fragment]) where the fragment's .value holds a
 * full TimerState object.  The tag is 'time', not 'timer'.
 */
function extractTimer(block: IRuntimeBlock): SerializedTimer | null {
    // All timer behaviors push memory under the 'time' tag.
    const timerLocs = block.getMemoryByTag('time');
    if (timerLocs.length === 0) return null;

    const timerLoc = timerLocs[0];
    const fragments = timerLoc.fragments;
    if (fragments.length === 0) return null;

    // CountupTimerBehavior / CountdownTimerBehavior store the full TimerState as
    // the first fragment's .value field.
    const state = fragments[0]?.value as {
        spans?: Array<{ started: number; ended?: number }>;
        direction?: 'up' | 'down';
        durationMs?: number;
        label?: string;
        role?: string;
    } | undefined;

    if (!state || !Array.isArray(state.spans)) return null;

    const spans: { started: number; ended?: number }[] = state.spans.map(s => ({
        started: s.started,
        ended: s.ended,
    }));

    const direction: 'up' | 'down' = state.direction ?? 'up';

    return {
        label: state.label,
        format: direction,
        durationMs: state.durationMs,
        direction,
        spans,
        isRunning: spans.some(s => s.ended === undefined),
    };
}

/**
 * Serialize an IRuntimeBlock into a JSON-safe SerializedBlock.
 *
 * Extracts only the data needed for rendering on the receiver:
 * - Identity fields (key, blockType, label)
 * - Display-tier fragment memory as ICodeFragment[][] rows
 * - Timer state (spans for local interpolation)
 * - Completion state
 */
export function serializeBlock(block: IRuntimeBlock): SerializedBlock {
    const displayLocs = block.getFragmentMemoryByVisibility('display');
    const displayFragments = displayLocs.map(loc => loc.fragments);

    return {
        key: block.key.toString(),
        blockType: block.blockType ?? 'Block',
        label: block.label,
        sourceIds: [...block.sourceIds],
        isComplete: block.isComplete,
        completionReason: block.completionReason,
        displayFragments,
        timer: extractTimer(block),
    };
}

/**
 * Serialize a StackSnapshot into an RpcStackUpdate message.
 */
export function serializeStackSnapshot(snapshot: StackSnapshot): RpcStackUpdate {
    return {
        type: 'rpc-stack-update',
        snapshotType: snapshot.type,
        blocks: snapshot.blocks.map(serializeBlock),
        affectedBlockKey: snapshot.affectedBlock?.key.toString(),
        depth: snapshot.depth,
        clockTime: snapshot.clockTime.getTime(),
    };
}

/**
 * Serialize an IOutputStatement into an RpcOutputStatement message.
 */
export function serializeOutput(output: IOutputStatement): RpcOutputStatement {
    return {
        type: 'rpc-output',
        outputType: output.outputType,
        sourceBlockKey: output.sourceBlockKey,
        stackLevel: output.stackLevel,
        fragments: output.fragments,
        completionReason: output.completionReason,
        timeSpan: {
            started: output.timeSpan.started,
            ended: output.timeSpan.ended,
        },
    };
}
