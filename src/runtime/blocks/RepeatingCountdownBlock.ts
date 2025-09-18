import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RepeatingBlock } from "./RepeatingBlock";
import { IPublicSpanBehavior } from "../behaviors/IPublicSpanBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import type { IMemoryReference } from "../memory";

/**
 * RepeatingCountdownBlock - Repeat across children under a countdown; on duration step, advance to next child until done
 * 
 * Behaviors:
 * - RepeatingBlockBehavior
 * - PublicSpanBehavior (publish countdown target span)
 * - NextEventHandler
 * - DurationEventHandler → on duration tick/expiry: Next
 * 
 * Selection conditions:
 * - rounds: value > 1
 * - time: value < 0 (countdown)
 */
export class RepeatingCountdownBlock extends RepeatingBlock implements IPublicSpanBehavior {
    private _publicSpanRef?: IMemoryReference<IResultSpanBuilder>;
    private _countdownTargetRef?: IMemoryReference<number>;
    private _remainingTimeRef?: IMemoryReference<number>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏰ RepeatingCountdownBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Initialize parent RepeatingBlock memory
        super.initializeMemory();

        // Get countdown duration from metrics (negative time value)
        const timeMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
        );
        const countdownDuration = Math.abs(timeMetric?.values.find(v => v.type === 'time')?.value || 0);

        // Initialize public span for countdown target
        this._publicSpanRef = this.allocateMemory<IResultSpanBuilder>(
            'span-root', 
            this.createPublicSpan(), 
            'public'
        );

        // Track countdown state
        this._countdownTargetRef = this.allocateMemory<number>('countdown-target', countdownDuration, 'private');
        this._remainingTimeRef = this.allocateMemory<number>('remaining-time', countdownDuration, 'public');

        console.log(`⏰ RepeatingCountdownBlock initialized with ${countdownDuration}ms countdown`);
    }

    public createPublicSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: { 
                    blockKey: this.key.toString(),
                    // Store countdown info in metrics instead of directly in timeSpan
                    metrics: [
                        {
                            sourceId: 'countdown-state',
                            values: [
                                { type: 'time', value: this._remainingTimeRef?.get() || 0, unit: 'ms' },
                                { type: 'time', value: this._countdownTargetRef?.get() || 0, unit: 'ms' }
                            ]
                        }
                    ]
                }, 
                metrics: this.initialMetrics, 
                duration: this._countdownTargetRef?.get() || 0
            }),
            getSpans: () => [],
            close: () => {
                console.log(`⏰ RepeatingCountdownBlock countdown completed`);
            },
            start: () => {
                console.log(`⏰ RepeatingCountdownBlock countdown started`);
            },
            stop: () => {
                console.log(`⏰ RepeatingCountdownBlock countdown stopped`);
            }
        };
    }

    public getPublicSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined {
        return this._publicSpanRef;
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Use the public span as the primary spans builder
        return this.createPublicSpan();
    }

    protected createInitialHandlers(): IEventHandler[] {
        // TODO: Add DurationEventHandler for countdown tick → Next
        const handlers = super.createInitialHandlers();
        // handlers.push(new CountdownTickHandler());
        return handlers;
    }

    protected onPush(): IRuntimeEvent[] {
        console.log(`⏰ RepeatingCountdownBlock.onPush() - Starting countdown`);
        
        // Start the countdown
        const span = this.getPublicSpanReference()?.get();
        if (span) {
            span.start();
        }

        // TODO: Schedule CountdownTickEvent based on countdown intervals
        const target = this._countdownTargetRef?.get() || 0;
        if (target > 0) {
            console.log(`⏰ RepeatingCountdownBlock countdown started for ${target}ms`);
        }

        return [];
    }

    protected onPop(): void {
        console.log(`⏰ RepeatingCountdownBlock.onPop() - Countdown finished`);
        
        // Stop the countdown
        const span = this.getPublicSpanReference()?.get();
        if (span) {
            span.stop();
        }

        super.onPop();
    }

    /**
     * Advance countdown by a tick amount
     */
    public tickCountdown(tickAmount: number = 1000): boolean {
        const remaining = this._remainingTimeRef?.get() || 0;
        const newRemaining = Math.max(0, remaining - tickAmount);
        
        if (this._remainingTimeRef) {
            this._remainingTimeRef.set(newRemaining);
        }

        console.log(`⏰ RepeatingCountdownBlock tick: ${newRemaining}ms remaining`);

        // Return true if countdown is finished
        return newRemaining <= 0;
    }

    /**
     * Check if countdown has expired
     */
    public isCountdownExpired(): boolean {
        const remaining = this._remainingTimeRef?.get() || 0;
        return remaining <= 0;
    }

    /**
     * Override next logic to handle countdown-driven advancement
     */
    protected onNext(): IRuntimeBlock | undefined {
        // Check if countdown has expired
        if (this.isCountdownExpired()) {
            console.log(`⏰ RepeatingCountdownBlock countdown expired, completing`);
            return undefined; // Signal completion
        }

        // Otherwise use parent logic
        return super.onNext();
    }
}