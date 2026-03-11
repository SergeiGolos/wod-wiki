/**
 * ClockSync.ts — Clock synchronization service for Chromecast RPC.
 *
 * Calculates the clock offset between sender (browser) and receiver (Chromecast)
 * using a round-trip time (RTT) aware handshake. The receiver uses
 * this offset to adjust its elapsed time calculations, ensuring timer display
 * matches the sender's actual time.
 *
 * Protocol:
 * 1. Sender sends RpcClockSyncRequest with its timestamp (t1)
 * 2. Receiver responds with RpcClockSyncResponse containing:
 *    - requestTimestamp (t1 echoed back)
 *    - receiverTimestamp (t2 when response was sent)
 * 3. Sender receives response at t3 and calculates:
 *    - RTT = t3 - t1
 *    - One-way latency ≈ RTT / 2
 *    - Offset = t2 - (t1 + RTT / 2)
 * 4. Sender sends RpcClockSyncResult with the calculated offset
 *
 * The receiver stores this offset and subtracts it from its local Date.now()
 * when calculating timer elapsed time.
 */

import type { IRpcTransport } from './IRpcTransport';
import type {
    RpcMessage,
    RpcClockSyncRequest,
    RpcClockSyncResponse,
    RpcClockSyncResult,
} from './RpcMessages';

/**
 * Configuration options for clock synchronization.
 */
export interface ClockSyncOptions {
    /** Number of sync samples to average for better accuracy (default: 3) */
    samples?: number;
    /** Maximum allowed RTT in ms for a sample to be valid (default: 500ms) */
    maxRttMs?: number;
}

/**
 * Result of a clock synchronization.
 */
export interface ClockSyncResult {
    /** Clock offset in milliseconds (positive = receiver is ahead) */
    offsetMs: number;
    /** Average round-trip time in milliseconds */
    avgRttMs: number;
}

/**
 * ClockSyncService — manages clock synchronization with the receiver.
 *
 * Performs multiple sync samples to account for network jitter and
 * calculates an average offset for more stable time alignment.
 */
export class ClockSyncService {
    private disposed = false;
    private readonly syncSamples: Array<{ offsetMs: number; rttMs: number }> = [];

    constructor(
        private readonly transport: IRpcTransport,
        private readonly options: ClockSyncOptions = {},
    ) {}

    /**
     * Perform clock synchronization with the receiver.
     *
     * @returns Promise resolving to the calculated offset and average RTT
     */
    async sync(): Promise<ClockSyncResult> {
        const samples = this.options.samples ?? 3;
        const maxRtt = this.options.maxRttMs ?? 500;

        console.log(`[ClockSyncService] Starting sync (${samples} samples, max RTT: ${maxRtt}ms)`);

        // Clear previous samples
        this.syncSamples.length = 0;

        for (let i = 0; i < samples; i++) {
            if (this.disposed) {
                throw new Error('ClockSyncService was disposed during sync');
            }

            const sample = await this.performSyncSample(maxRtt);
            if (sample !== null) {
                this.syncSamples.push(sample);
                console.log(`[ClockSyncService] Sample ${i + 1}/${samples}: offset=${sample.offsetMs.toFixed(2)}ms, RTT=${sample.rttMs.toFixed(2)}ms`);
            } else {
                console.warn(`[ClockSyncService] Sample ${i + 1} failed (RTT exceeded ${maxRtt}ms)`);
            }

            // Small delay between samples to avoid network congestion
            if (i < samples - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (this.syncSamples.length === 0) {
            throw new Error('Clock sync failed: all samples exceeded max RTT');
        }

        // Calculate average offset (median for robustness against outliers)
        const sortedOffsets = [...this.syncSamples].map(s => s.offsetMs).sort((a, b) => a - b);
        const medianOffset = sortedOffsets.length % 2 === 0
            ? (sortedOffsets[sortedOffsets.length / 2 - 1] + sortedOffsets[sortedOffsets.length / 2]) / 2
            : sortedOffsets[Math.floor(sortedOffsets.length / 2)];

        const avgRtt = this.syncSamples.reduce((sum, s) => sum + s.rttMs, 0) / this.syncSamples.length;

        const result: ClockSyncResult = {
            offsetMs: medianOffset,
            avgRttMs: avgRtt,
        };

        console.log(`[ClockSyncService] Sync complete: offset=${medianOffset.toFixed(2)}ms (median), avg RTT=${avgRtt.toFixed(2)}ms`);

        // Send the result to the receiver
        this.sendResult(result);

        return result;
    }

    /**
     * Send the calculated sync result to the receiver.
     */
    private sendResult(result: ClockSyncResult): void {
        if (this.disposed || !this.transport.connected) {
            return;
        }

        const message: RpcClockSyncResult = {
            type: 'rpc-clock-sync-result',
            offsetMs: result.offsetMs,
            rttMs: result.avgRttMs,
        };
        this.transport.send(message);
    }

    /**
     * Perform a single clock sync sample.
     *
     * @param maxRttMs Maximum allowed RTT for the sample to be valid
     * @returns Sample result or null if RTT exceeded max
     */
    private async performSyncSample(maxRttMs: number): Promise<{ offsetMs: number; rttMs: number } | null> {
        const t1 = Date.now();

        const request: RpcClockSyncRequest = {
            type: 'rpc-clock-sync-request',
            timestamp: t1,
        };
        this.transport.send(request);

        // Wait for the response
        const response = await this.waitForResponse<RpcClockSyncResponse>(
            msg => msg.type === 'rpc-clock-sync-response' && msg.requestTimestamp === t1,
            2000, // 2 second timeout
        );

        const t3 = Date.now();
        const rtt = t3 - t1;

        // Reject samples with too high RTT (likely network issues)
        if (rtt > maxRttMs) {
            return null;
        }

        // Calculate offset: receiverTime - (senderTime + oneWayLatency)
        // oneWayLatency is estimated as RTT / 2
        const oneWayLatency = rtt / 2;
        const offset = response.receiverTimestamp - (t1 + oneWayLatency);

        return {
            offsetMs: offset,
            rttMs: rtt,
        };
    }

    /**
     * Wait for a specific type of RPC message.
     *
     * @param predicate Function to identify the desired message
     * @param timeoutMs Timeout in milliseconds
     * @returns Promise resolving to the matched message
     */
    private waitForResponse<T extends RpcMessage>(
        predicate: (msg: RpcMessage) => msg is T,
        timeoutMs: number,
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                unsubscribe();
                reject(new Error(`Clock sync response timeout after ${timeoutMs}ms`));
            }, timeoutMs);

            const unsubscribe = this.transport.onMessage((message: RpcMessage) => {
                if (predicate(message)) {
                    clearTimeout(timeout);
                    unsubscribe();
                    resolve(message as T);
                }
            });
        });
    }

    /**
     * Dispose the clock sync service.
     * Aborts any ongoing sync operations.
     */
    dispose(): void {
        this.disposed = true;
        this.syncSamples.length = 0;
    }
}
