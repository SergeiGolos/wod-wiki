import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { BoundedLoopingBlock } from "./BoundedLoopingBlock";
import { IDurationEventBehavior } from "../behaviors/IDurationEventBehavior";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeLog } from "../EventHandler";

/**
 * TimeBoundedLoopingBlock - Repeats child statements for a fixed duration (count-up timer); 
 * handles timed rounds with a positive duration.
 * 
 * Behaviors Used:
 * - AllocateSpanBehavior (inherited)
 * - AllocateChildren (inherited)
 * - AllocateIndex (inherited)
 * - NextChildBehavior (inherited)
 * - DurationEventBehavior (new)
 * - StopOnPopBehavior (inherited)
 * - JournalOnPopBehavior (inherited)
 */
export class TimeBoundedLoopingBlock extends BoundedLoopingBlock implements IDurationEventBehavior {
    private _durationRef?: IMemoryReference<number>;
    private _startTimeRef?: IMemoryReference<Date>;
    private _elapsedTimeRef?: IMemoryReference<number>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`🔄⏰ TimeBoundedLoopingBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Initialize parent memory first
        super.initializeMemory();
        
        // DurationEventBehavior - find duration from metrics
        const timeMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        const duration = timeMetric?.values.find(v => v.type === 'time')?.value || 0;
        
        this._durationRef = this.allocate<number>('duration', duration, 'private');
        this._startTimeRef = this.allocate<Date>('start-time', new Date(), 'private');
        this._elapsedTimeRef = this.allocate<number>('elapsed-time', 0, 'private');

        console.log(`🔄⏰ TimeBoundedLoopingBlock initialized with ${duration}ms duration`);
    }

    // IDurationEventBehavior implementation
    public getDuration(): number {
        return this._durationRef?.get() || 0;
    }

    public setDuration(duration: number): void {
        this._durationRef?.set(duration);
    }

    public getStartTime(): Date | undefined {
        return this._startTimeRef?.get();
    }

    public setStartTime(startTime: Date): void {
        this._startTimeRef?.set(startTime);
    }

    public getElapsedTime(): number {
        return this._elapsedTimeRef?.get() || 0;
    }

    public hasDurationElapsed(): boolean {
        const duration = this.getDuration();
        const elapsed = this.getElapsedTime();
        return duration > 0 && elapsed >= duration;
    }

    public startDuration(): void {
        this.setStartTime(new Date());
        this._elapsedTimeRef?.set(0);
        console.log(`🔄⏰ TimeBoundedLoopingBlock duration started`);
    }

    public stopDuration(): void {
        console.log(`🔄⏰ TimeBoundedLoopingBlock duration stopped`);
    }

    public tickDuration(currentTime?: Date): boolean {
        const startTime = this.getStartTime();
        if (!startTime) return false;
        
        const now = currentTime || new Date();
        const elapsed = now.getTime() - startTime.getTime();
        this._elapsedTimeRef?.set(elapsed);
        
        return this.hasDurationElapsed();
    }

    public getDurationReference(): IMemoryReference<number> | undefined {
        return this._durationRef;
    }

    // Override the span to be public since children need to see the timer
    public initializeSpan(visibility: 'public' | 'private'): void {
        super.initializeSpan('public'); // Always public for timed loops
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄⏰ TimeBoundedLoopingBlock.onPush() - Starting timed loop`);
        
        // Start duration timer
        this.startDuration();
        
        // Call parent onPush
        const parentLogs = super.onPush(runtime);
        
        return [
            ...parentLogs,
            { level: 'info', message: 'time bounded loop started', timestamp: new Date(), context: { 
                key: this.key.toString(), 
                duration: this.getDuration() 
            }}
        ];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄⏰ TimeBoundedLoopingBlock.onNext() - Checking duration and iterations`);
        
        // Check if duration has elapsed
        if (this.hasDurationElapsed()) {
            console.log(`🔄⏰ TimeBoundedLoopingBlock duration elapsed, stopping loop`);
            return [{ level: 'info', message: 'time bounded loop duration elapsed', timestamp: new Date(), context: { 
                key: this.key.toString(),
                elapsed: this.getElapsedTime(),
                duration: this.getDuration()
            }}];
        }
        
        // Call parent onNext for normal iteration logic
        return super.onNext(runtime);
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄⏰ TimeBoundedLoopingBlock.onPop() - Stopping timed loop`);
        
        // Stop duration timer
        this.stopDuration();
        
        // Call parent onPop
        const parentLogs = super.onPop(runtime);
        
        return [
            ...parentLogs,
            { level: 'info', message: 'time bounded loop stopped', timestamp: new Date(), context: { 
                key: this.key.toString(),
                finalElapsed: this.getElapsedTime()
            }}
        ];
    }

    /**
     * Override hasMoreIterations to also check duration
     */
    public hasMoreIterations(): boolean {
        // Must have remaining iterations AND duration not elapsed
        return super.hasMoreIterations() && !this.hasDurationElapsed();
    }
}