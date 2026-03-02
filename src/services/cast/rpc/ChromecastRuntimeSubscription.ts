import { IRuntimeSubscription } from '@/runtime/contracts/IRuntimeSubscription';
import { StackSnapshot } from '@/runtime/contracts/IRuntimeStack';
import { IOutputStatement } from '@/core/models/OutputStatement';
import { IRpcTransport } from './IRpcTransport';
import { serializeStackSnapshot, serializeOutput } from './RpcSerializer';

/**
 * ChromecastRuntimeSubscription — sends runtime state updates to the Chromecast
 * receiver via the RPC transport.
 *
 * Each stack snapshot and output statement is serialized and sent as a typed
 * RPC message. Fingerprinting prevents redundant sends when the structural
 * state hasn't changed (timer tick values are excluded; the receiver
 * interpolates elapsed time locally from spans).
 */
export class ChromecastRuntimeSubscription implements IRuntimeSubscription {
    readonly id: string;
    private lastFingerprint = '';

    constructor(
        private readonly transport: IRpcTransport,
        options?: { id?: string },
    ) {
        this.id = options?.id ?? 'chromecast';
    }

    onStackSnapshot(snapshot: StackSnapshot): void {
        if (!this.transport.connected) return;

        const message = serializeStackSnapshot(snapshot);

        // Fingerprint: skip send if structural state is identical.
        // Excludes timer elapsed values — receiver interpolates from spans.
        const fingerprint = this.computeFingerprint(message);
        if (fingerprint === this.lastFingerprint) return;
        this.lastFingerprint = fingerprint;

        this.transport.send(message);
    }

    onOutput(output: IOutputStatement): void {
        if (!this.transport.connected) return;
        this.transport.send(serializeOutput(output));
    }

    dispose(): void {
        // Intentionally does NOT send rpc-dispose — that message is reserved for
        // explicit cast-session teardown (sent by CastButtonRpc.cleanupCast).
        // Sending rpc-dispose here would permanently destroy the receiver's proxy
        // runtime on every workout reset/navigation, preventing any further syncing.
        this.lastFingerprint = '';
    }

    // ── Fingerprinting ──────────────────────────────────────────────────────

    /**
     * Compute a structural fingerprint that excludes timer elapsed values.
     * Only structural changes (block list, labels, completion) trigger a send.
     * Timer spans are included (so span count / start changes are detected)
     * but accumulated elapsed is NOT — the receiver interpolates locally.
     */
    private computeFingerprint(message: {
        snapshotType: string;
        blocks: Array<{
            key: string;
            blockType: string;
            label: string;
            isComplete: boolean;
            timer: { isRunning: boolean; spans: Array<{ started: number }>; durationMs?: number } | null;
            displayFragments: unknown[][];
        }>;
        depth: number;
    }): string {
        const parts: string[] = [
            message.snapshotType,
            String(message.depth),
        ];

        for (const block of message.blocks) {
            parts.push(
                `${block.key}:${block.blockType}:${block.label}:${block.isComplete}`,
            );
            if (block.timer) {
                parts.push(
                    `timer:${block.timer.isRunning}:${block.timer.spans.length}:${block.timer.durationMs}:${block.timer.spans[0]?.started ?? ''}`,
                );
            }
            // Include fragment structure but not fragment values that change on tick
            parts.push(`frags:${block.displayFragments.length}`);
        }

        return parts.join('|');
    }
}
