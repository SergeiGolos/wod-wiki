import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RepeatingBlock } from "./RepeatingBlock";
import { IPublicSpanBehavior } from "../behaviors/IPublicSpanBehavior";
import type { IMemoryReference } from "../memory";

/**
 * RepeatingTimedBlock - Repeat across children while running for a fixed total duration (count-up/timed)
 * 
 * Behaviors:
 * - RepeatingBlockBehavior
 * - PublicSpanBehavior (publish a group span)
 * - NextEventHandler
 * - DurationEventHandler → on duration elapsed: Pop
 * 
 * Selection conditions:
 * - rounds: value > 1
 * - time: value > 0 (timed, not countdown)
 */
export class RepeatingTimedBlock extends RepeatingBlock implements IPublicSpanBehavior {
    private _publicSpanRef?: IMemoryReference<IResultSpanBuilder>;
    private _durationRef?: IMemoryReference<number>;
    private _startTimeRef?: IMemoryReference<Date>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏱️ RepeatingTimedBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Initialize parent RepeatingBlock memory
        super.initializeMemory();

        // Get duration from metrics
        const timeMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        const duration = timeMetric?.values.find(v => v.type === 'time')?.value || 0;

        // Initialize public span for children to reference
        this._publicSpanRef = this.allocateMemory<IResultSpanBuilder>(
            'span-root', 
            this.createPublicSpan(), 
            'public'
        );

        // Track duration and timing
        this._durationRef = this.allocateMemory<number>('duration', duration, 'private');
        this._startTimeRef = this.allocateMemory<Date>('start-time', new Date(), 'private');

        console.log(`⏱️ RepeatingTimedBlock initialized with ${duration}ms duration`);
    }

    public createPublicSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: { 
                    start: this._startTimeRef?.get() ? { 
                        name: 'timer-start', 
                        timestamp: this._startTimeRef.get()!.getTime() 
                    } : undefined,
                    blockKey: this.key.toString()
                }, 
                metrics: this.initialMetrics, 
                duration: this._durationRef?.get() || 0
            }),
            getSpans: () => [],
            close: () => {
                console.log(`⏱️ RepeatingTimedBlock span closed`);
            },
            start: () => {
                if (this._startTimeRef) {
                    this._startTimeRef.set(new Date());
                }
                console.log(`⏱️ RepeatingTimedBlock timer started`);
            },
            stop: () => {
                console.log(`⏱️ RepeatingTimedBlock timer stopped`);
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

    protected createInitialHandlers(): EventHandler[] {
        // TODO: Add DurationEventHandler for duration elapsed → Pop
        const handlers = super.createInitialHandlers();
        // handlers.push(new DurationEventHandler());
        return handlers;
    }

    protected onPush(): IRuntimeEvent[] {
        console.log(`⏱️ RepeatingTimedBlock.onPush() - Starting timer`);
        
        // Start the timer
        const span = this.getPublicSpanReference()?.get();
        if (span) {
            span.start();
        }

        // TODO: Schedule DurationEvent based on duration
        const duration = this._durationRef?.get() || 0;
        if (duration > 0) {
            // In a real implementation, this would schedule a timer event
            console.log(`⏱️ RepeatingTimedBlock scheduled for ${duration}ms`);
        }

        return [];
    }

    protected onPop(): void {
        console.log(`⏱️ RepeatingTimedBlock.onPop() - Stopping timer`);
        
        // Stop the timer
        const span = this.getPublicSpanReference()?.get();
        if (span) {
            span.stop();
        }

        super.onPop();
    }

    /**
     * Check if the duration has elapsed
     */
    public hasDurationElapsed(): boolean {
        const duration = this._durationRef?.get() || 0;
        const startTime = this._startTimeRef?.get();
        
        if (!startTime || duration <= 0) {
            return false;
        }

        const elapsed = Date.now() - startTime.getTime();
        return elapsed >= duration;
    }
}