import { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { StackSnapshot } from '@/runtime/contracts/IRuntimeStack';
import { IMetric } from '@/core/models/Metric';
import { MemoryTag } from '@/runtime/memory/MemoryLocation';
import { TrackerUpdate } from '@/runtime/contracts/IRuntimeOptions';
import {
    SerializedBlock,
    SerializedTimer,
    SerializedBehavior,
    RpcStackUpdate,
    RpcOutputStatement,
    RpcTrackerUpdate,
    RpcAnalyticsSummary,
} from './RpcMessages';

/**
 * Extract timer state from a block's timer memory location.
 * Returns null if the block has no timer.
 *
 * Timer behaviors (CountupTimerBehavior, CountdownTimerBehavior, SpanTrackingBehavior)
 * all use ctx.pushMemory('time', [metrics]) where the metrics's .value holds a
 * full TimerState object.  The tag is 'time', not 'timer'.
 */
function extractTimer(block: IRuntimeBlock): SerializedTimer | null {
    // All timer behaviors push memory under the 'time' tag.
    const timerLocs = block.getMemoryByTag('time');
    if (timerLocs.length === 0) return null;

    const timerLoc = timerLocs[0];
    const metrics = timerLoc.metrics;
    if (metrics.length === 0) return null;

    // CountupTimerBehavior / CountdownTimerBehavior store the full TimerState as
    // the first metrics's .value field.
    const state = metrics[0]?.value as {
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

    const rawRole = state.role;
    // 'hidden' is used by SpanTrackingBehavior but is not a valid TimerState role;
    // treat it as 'auto' (not pinned, not secondary).
    const role: SerializedTimer['role'] = rawRole === 'hidden'
        ? 'auto'
        : (rawRole as SerializedTimer['role']);

    return {
        label: state.label,
        format: direction,
        durationMs: state.durationMs,
        direction,
        spans,
        isRunning: spans.some(s => s.ended === undefined),
        role,
    };
}

/**
 * Serialize an IRuntimeBlock into a JSON-safe SerializedBlock.
 *
 * Extracts all metrics visibility tiers, timer state, behavior metadata,
 * and completion state — giving the receiver full parity with the browser UI.
 */
export function serializeBlock(block: IRuntimeBlock): SerializedBlock {
    // ── Display tier ──────────────────────────────────────────────────────
    const displayLocs = block.getMetricMemoryByVisibility('display');
    const displayFragments = displayLocs.map(loc => loc.metrics.toArray());

    // ── Promote tier ──────────────────────────────────────────────────────
    // metrics:promote and metrics:rep-target locations
    const promoteLocs = block.getMetricMemoryByVisibility('promote');
    const promoteFragments: IMetric[][] = promoteLocs.map(loc => loc.metrics.toArray());

    // ── Result tier ───────────────────────────────────────────────────────
    const resultLocs = block.getMetricMemoryByVisibility('result');
    const resultFragments: IMetric[][] = resultLocs.map(loc => loc.metrics.toArray());

    // ── Private tier ──────────────────────────────────────────────────────
    // Group private locations by tag: Record<tag, IMetric[][]>
    const privateLocs = block.getMetricMemoryByVisibility('private');
    const privateFragments: Record<MemoryTag, IMetric[][]> = {} as Record<MemoryTag, IMetric[][]>;
    for (const loc of privateLocs) {
        if (!privateFragments[loc.tag]) {
            privateFragments[loc.tag] = [];
        }
        privateFragments[loc.tag].push(loc.metrics.toArray());
    }

    // ── 'Up Next' preview ─────────────────────────────────────────────────
    const nextLocs = block.getMemoryByTag('metric:next');
    const nextFragments = nextLocs.flatMap(loc => loc.metrics.toArray());

    // ── Behavior metadata ─────────────────────────────────────────────────
    let behaviorsMetadata: SerializedBehavior[] | undefined;
    try {
        if (block.behaviors && block.behaviors.length > 0) {
            behaviorsMetadata = block.behaviors.map(b => ({ name: b.constructor.name }));
        }
    } catch {
        // Defensive: some stubs may not implement .behaviors
    }

    return {
        key: block.key.toString(),
        blockType: block.blockType ?? 'Block',
        label: block.label,
        sourceIds: [...block.sourceIds],
        isComplete: block.isComplete,
        completionReason: block.completionReason,
        displayFragments,
        promoteFragments: promoteFragments.length > 0 ? promoteFragments : undefined,
        resultFragments: resultFragments.length > 0 ? resultFragments : undefined,
        privateFragments: Object.keys(privateFragments).length > 0 ? privateFragments : undefined,
        timer: extractTimer(block),
        nextFragments,
        behaviorsMetadata,
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
    const started = output.timeSpan.started;
    const ended = output.timeSpan.ended;
    const elapsed = ended !== undefined ? ended - started : 0;

    return {
        type: 'rpc-output',
        outputType: output.outputType,
        sourceBlockKey: output.sourceBlockKey,
        stackLevel: output.stackLevel,
        metrics: Array.isArray(output.metrics) ? output.metrics : output.metrics.toArray(),
        completionReason: output.completionReason,
        timeSpan: { started, ended },
        elapsed,
    };
}

/**
 * Serialize a TrackerUpdate into an RpcTrackerUpdate message.
 */
export function serializeTrackerUpdate(update: TrackerUpdate): RpcTrackerUpdate {
    if (update.type === 'snapshot') {
        return {
            type: 'rpc-tracker-update',
            update: {
                type: 'snapshot',
                blockId: 'root', // Required by type but unused for snapshot
                snapshot: update.snapshot,
                timestamp: update.timestamp,
            } as any,
        };
    }

    return {
        type: 'rpc-tracker-update',
        update: {
            ...update,
            timestamp: update.timestamp,
        },
    };
}

/**
 * Serialize analytics summary with projection results.
 * Extracts projection results from runtime's analytics engine and
 * creates a RpcAnalyticsSummary message.
 */
export function serializeAnalyticsSummary(
    projections: Array<{ name: string; value: number; unit: string; metricType?: string }>,
    totalDurationMs: number,
    completedSegments: number,
): RpcAnalyticsSummary {
    return {
        type: 'rpc-analytics-summary',
        totalDurationMs,
        completedSegments,
        projections,
    };
}
