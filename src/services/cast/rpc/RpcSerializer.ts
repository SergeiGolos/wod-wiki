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
 */
function extractTimer(block: IRuntimeBlock): SerializedTimer | null {
    const timerLocs = block.getMemoryByTag('timer');
    if (timerLocs.length === 0) return null;

    // Timer fragments encode spans and metadata
    const timerLoc = timerLocs[0];
    const fragments = timerLoc.fragments;

    // Find the timer behavior data from the fragments
    // Timer fragments typically contain: direction, durationMs, spans, label, format
    let direction: 'up' | 'down' = 'up';
    let durationMs: number | undefined;
    let label: string | undefined;
    let format = 'up';
    const spans: { started: number; ended?: number }[] = [];
    let isRunning = false;

    for (const frag of fragments) {
        if (frag.type === 'duration' || frag.fragmentType === 'duration') {
            durationMs = frag.value as number;
        }
        if (frag.type === 'spans' || frag.fragmentType === 'spans') {
            const rawSpans = frag.value as Array<{ started: number; ended?: number }>;
            if (Array.isArray(rawSpans)) {
                for (const s of rawSpans) {
                    spans.push({ started: s.started, ended: s.ended });
                    if (s.ended === undefined) isRunning = true;
                }
            }
        }
        if (frag.type === 'label' || frag.fragmentType === 'label') {
            label = frag.image ?? (frag.value as string);
        }
    }

    // Attempt to read direction/format from the timer behavior directly
    const timerBehavior = block.behaviors.find(
        (b: any) => b.constructor?.name === 'TimerBehavior' || b.direction
    ) as any;
    if (timerBehavior) {
        direction = timerBehavior.direction ?? direction;
        format = timerBehavior.format ?? timerBehavior.direction ?? format;
        durationMs = timerBehavior.durationMs ?? durationMs;
        label = timerBehavior.label ?? label;
        if (timerBehavior.spans) {
            spans.length = 0;
            for (const s of timerBehavior.spans) {
                spans.push({ started: s.started, ended: s.ended });
                if (s.ended === undefined) isRunning = true;
            }
        }
    }

    return { label, format, durationMs, direction, spans, isRunning };
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
