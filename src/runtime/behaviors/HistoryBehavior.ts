import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../models/RuntimeSpan';
import { TimeSpan } from '../models/TimeSpan';
import { createLabelFragment } from '../utils/metricsToFragments';
import { TypedMemoryReference } from '../contracts/IMemoryReference';

/**
 * Behavior that tracks the execution history of a block using RuntimeSpan.
 */
export class HistoryBehavior implements IRuntimeBehavior {
    private startTime: number = 0;
    private label?: string;
    private config?: string | { label?: string; debugMetadata?: any };
    private spanRef?: TypedMemoryReference<RuntimeSpan>;

    constructor(labelOrConfig?: string | { label?: string; debugMetadata?: any }) {
        this.config = labelOrConfig;
        if (typeof labelOrConfig === 'string') {
            this.label = labelOrConfig;
        } else if (labelOrConfig) {
            this.label = labelOrConfig.label;
        }
    }

    onPush(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const now = clock.now;
        this.startTime = now.getTime();

        // Build metadata from config
        const metadata: any = {
            tags: [],
            context: {},
            logs: []
        };

        if (this.config && typeof this.config !== 'string') {
            if (this.config.debugMetadata) {
                metadata.tags = this.config.debugMetadata.tags || [];
                metadata.context = this.config.debugMetadata.context || {};
                metadata.logs = this.config.debugMetadata.logs || [];
            }
        }

        // Create RuntimeSpan
        const fragments = block.fragments ? [...block.fragments] : [[createLabelFragment(this.label || block.label, block.blockType || 'group')]];
        const runtimeSpan = new RuntimeSpan(
            block.key.toString(),
            [...block.sourceIds],
            [new TimeSpan(this.startTime)],
            fragments,
            undefined,
            metadata
        );

        this.spanRef = block.context.allocate(
            RUNTIME_SPAN_TYPE,
            runtimeSpan,
            'public'
        );

        return [];
    }

    onPop(_block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const endTime = clock.now.getTime();

        if (this.spanRef) {
            const span = this.spanRef.get();
            if (span && span.spans.length > 0) {
                const lastTimer = span.spans[span.spans.length - 1];
                if (lastTimer.ended === undefined) {
                    lastTimer.ended = endTime;
                    this.spanRef.set(span);
                }
            }
        }

        return [];
    }

    onNext(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        return [];
    }

    onDispose(_block: IRuntimeBlock): void {
        this.spanRef = undefined;
    }
}
