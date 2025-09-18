import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { GroupNextHandler } from "../handlers/GroupNextHandler";
import { BehavioralMemoryBlockBase } from "./BehavioralMemoryBlockBase";
import { AllocateSpanBehavior } from "../behaviors/AllocateSpanBehavior";
import { AllocateChildrenBehavior } from "../behaviors/AllocateChildrenBehavior";
import { AllocateIndexBehavior } from "../behaviors/AllocateIndexBehavior";
import { NextChildBehavior } from "../behaviors/NextChildBehavior";
import { BoundLoopBehavior } from "../behaviors/BoundLoopBehavior";
import { StopOnPopBehavior } from "../behaviors/StopOnPopBehavior";
import { JournalOnPopBehavior } from "../behaviors/JournalOnPopBehavior";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";

/**
 * BoundedLoopingBlock - Has a defined number of rounds to execute the child blocks before exiting.
 * 
 * Behaviors Used:
 * - AllocateSpanBehavior
 * - AllocateChildrenBehavior
 * - AllocateIndexBehavior
 * - NextChildBehavior
 * - BoundLoopBehavior
 * - StopOnPopBehavior
 * - JournalOnPopBehavior
 */
export class BoundedLoopingBlock extends BehavioralMemoryBlockBase {
    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`🔄 BoundedLoopingBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Find rounds metric value from initial metrics
        const roundsMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'rounds')
        );
        const initialRounds = roundsMetric?.values.find(v => v.type === 'rounds')?.value || 1;

        // Compose behaviors
        const spanBehavior = new AllocateSpanBehavior({
            visibility: 'private',
            factory: () => this.createSpan(),
        });
        const childrenBehavior = new AllocateChildrenBehavior();
        const indexBehavior = new AllocateIndexBehavior();
        const nextChildBehavior = new NextChildBehavior();
        const boundLoopBehavior = new BoundLoopBehavior(initialRounds);
        const stopOnPopBehavior = new StopOnPopBehavior();
        const journalOnPopBehavior = new JournalOnPopBehavior();

        this.behaviors.push(spanBehavior);
        this.behaviors.push(childrenBehavior);
        this.behaviors.push(indexBehavior);
        this.behaviors.push(nextChildBehavior);
        this.behaviors.push(boundLoopBehavior);
        this.behaviors.push(stopOnPopBehavior);
        this.behaviors.push(journalOnPopBehavior);

        console.log(`🔄 BoundedLoopingBlock initialized with ${initialRounds} rounds`);
    }

    // Helper methods that delegate to behaviors
    public getSpan(): IResultSpanBuilder | undefined {
        const spanBehavior = this.behaviors.find(b => b instanceof AllocateSpanBehavior) as AllocateSpanBehavior;
        return spanBehavior?.getSpan();
    }

    public setSpan(span: IResultSpanBuilder): void {
        const spanBehavior = this.behaviors.find(b => b instanceof AllocateSpanBehavior) as AllocateSpanBehavior;
        spanBehavior?.setSpan(span);
    }

    public createSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: { 
                    blockKey: this.key.toString()
                }, 
                metrics: [], 
                duration: 0
            }),
            getSpans: () => [],
            close: () => {
                console.log(`🔄 BoundedLoopingBlock span completed`);
            },
            start: () => {
                console.log(`🔄 BoundedLoopingBlock span started`);
            },
            stop: () => {
                console.log(`🔄 BoundedLoopingBlock span stopped`);
            }
        };
    }

    public getSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined {
        const spanBehavior = this.behaviors.find(b => b instanceof AllocateSpanBehavior) as AllocateSpanBehavior;
        return spanBehavior?.getSpanReference();
    }

    // Helper methods for children behavior
    public getChildrenGroups(): string[][] {
        const childrenBehavior = this.behaviors.find(b => b instanceof AllocateChildrenBehavior) as AllocateChildrenBehavior;
        return childrenBehavior?.getChildrenGroups() ?? [];
    }

    public getChildrenGroupsReference(): IMemoryReference<string[][]> | undefined {
        const childrenBehavior = this.behaviors.find(b => b instanceof AllocateChildrenBehavior) as AllocateChildrenBehavior;
        return childrenBehavior?.getChildrenGroupsReference();
    }

    // Helper methods for index behavior
    public getLoopIndex(): number {
        const indexBehavior = this.behaviors.find(b => b instanceof AllocateIndexBehavior) as AllocateIndexBehavior;
        return indexBehavior?.getLoopIndex() ?? 0;
    }

    public setLoopIndex(index: number): void {
        const indexBehavior = this.behaviors.find(b => b instanceof AllocateIndexBehavior) as AllocateIndexBehavior;
        indexBehavior?.setLoopIndex(index);
    }

    public getChildIndex(): number {
        const indexBehavior = this.behaviors.find(b => b instanceof AllocateIndexBehavior) as AllocateIndexBehavior;
        return indexBehavior?.getChildIndex() ?? -1;
    }

    public setChildIndex(index: number): void {
        const indexBehavior = this.behaviors.find(b => b instanceof AllocateIndexBehavior) as AllocateIndexBehavior;
        indexBehavior?.setChildIndex(index);
    }

    public getLoopIndexReference(): IMemoryReference<number> | undefined {
        const indexBehavior = this.behaviors.find(b => b instanceof AllocateIndexBehavior) as AllocateIndexBehavior;
        return indexBehavior?.getLoopIndexReference();
    }

    public getChildIndexReference(): IMemoryReference<number> | undefined {
        const indexBehavior = this.behaviors.find(b => b instanceof AllocateIndexBehavior) as AllocateIndexBehavior;
        return indexBehavior?.getChildIndexReference();
    }

    // Helper methods for next child behavior
    public hasNextChild(): boolean {
        const nextChildBehavior = this.behaviors.find(b => b instanceof NextChildBehavior) as NextChildBehavior;
        return nextChildBehavior?.hasNextChild() ?? false;
    }

    public getNextChild(): IRuntimeBlock | undefined {
        const nextChildBehavior = this.behaviors.find(b => b instanceof NextChildBehavior) as NextChildBehavior;
        return nextChildBehavior?.getNextChild();
    }

    public advanceToNextChild(): void {
        const nextChildBehavior = this.behaviors.find(b => b instanceof NextChildBehavior) as NextChildBehavior;
        nextChildBehavior?.advanceToNextChild();
    }

    public getCurrentChildGroup(): string[] | undefined {
        const nextChildBehavior = this.behaviors.find(b => b instanceof NextChildBehavior) as NextChildBehavior;
        return nextChildBehavior?.getCurrentChildGroup();
    }

    // Helper methods for bound loop behavior
    public getRemainingIterations(): number {
        const boundLoopBehavior = this.behaviors.find(b => b instanceof BoundLoopBehavior) as BoundLoopBehavior;
        return boundLoopBehavior?.getRemainingIterations() ?? 0;
    }

    public setRemainingIterations(count: number): void {
        const boundLoopBehavior = this.behaviors.find(b => b instanceof BoundLoopBehavior) as BoundLoopBehavior;
        boundLoopBehavior?.setRemainingIterations(count);
    }

    public getTotalIterations(): number {
        const boundLoopBehavior = this.behaviors.find(b => b instanceof BoundLoopBehavior) as BoundLoopBehavior;
        return boundLoopBehavior?.getTotalIterations() ?? 0;
    }

    public decrementIterations(): void {
        const boundLoopBehavior = this.behaviors.find(b => b instanceof BoundLoopBehavior) as BoundLoopBehavior;
        boundLoopBehavior?.decrementIterations();
    }

    public hasMoreIterations(): boolean {
        const boundLoopBehavior = this.behaviors.find(b => b instanceof BoundLoopBehavior) as BoundLoopBehavior;
        return boundLoopBehavior?.hasMoreIterations() ?? false;
    }

    public getRemainingIterationsReference(): IMemoryReference<number> | undefined {
        const boundLoopBehavior = this.behaviors.find(b => b instanceof BoundLoopBehavior) as BoundLoopBehavior;
        return boundLoopBehavior?.getRemainingIterationsReference();
    }

    // Helper methods for stop on pop behavior
    public stopTimers(): void {
        const stopOnPopBehavior = this.behaviors.find(b => b instanceof StopOnPopBehavior) as StopOnPopBehavior;
        stopOnPopBehavior?.stopTimers();
    }

    public areTimersRunning(): boolean {
        const stopOnPopBehavior = this.behaviors.find(b => b instanceof StopOnPopBehavior) as StopOnPopBehavior;
        return stopOnPopBehavior?.areTimersRunning() ?? false;
    }

    public getActiveTimerIds(): string[] {
        const stopOnPopBehavior = this.behaviors.find(b => b instanceof StopOnPopBehavior) as StopOnPopBehavior;
        return stopOnPopBehavior?.getActiveTimerIds() ?? [];
    }

    // Helper methods for journal behavior
    public writeToJournal(): void {
        const journalBehavior = this.behaviors.find(b => b instanceof JournalOnPopBehavior) as JournalOnPopBehavior;
        journalBehavior?.writeToJournal();
    }

    public getJournalEntries(): any[] {
        const journalBehavior = this.behaviors.find(b => b instanceof JournalOnPopBehavior) as JournalOnPopBehavior;
        return journalBehavior?.getJournalEntries() ?? [];
    }

    public isJournalingEnabled(): boolean {
        const journalBehavior = this.behaviors.find(b => b instanceof JournalOnPopBehavior) as JournalOnPopBehavior;
        return journalBehavior?.isJournalingEnabled() ?? false;
    }

    public setJournalingEnabled(enabled: boolean): void {
        const journalBehavior = this.behaviors.find(b => b instanceof JournalOnPopBehavior) as JournalOnPopBehavior;
        journalBehavior?.setJournalingEnabled(enabled);
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        return this.createSpan();
    }

    protected createInitialHandlers(): IEventHandler[] {
        return [new GroupNextHandler()];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 BoundedLoopingBlock.onPush() - Starting bounded loop`);
        
        // Let behaviors handle the push
        const logs = super.onPush(runtime);
        
        // Start the span through span behavior
        const span = this.getSpan();
        if (span) {
            span.start();
        }
        
        return [...logs, { level: 'info', message: 'bounded loop push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 BoundedLoopingBlock.onNext() - Processing next iteration`);
        
        // Let behaviors handle the next logic first
        const logs = super.onNext(runtime);
        
        // Check if we've completed a round and need to loop
        if (!this.hasNextChild()) {
            // Reset child index for next round
            this.setChildIndex(-1);
            
            // Decrement remaining iterations
            this.decrementIterations();
            
            // Check if we have more iterations
            if (!this.hasMoreIterations()) {
                console.log(`🔄 BoundedLoopingBlock completed all ${this.getTotalIterations()} iterations`);
                return logs;
            }
            
            // Increment loop index for new round
            const currentLoop = this.getLoopIndex();
            this.setLoopIndex(currentLoop + 1);
            console.log(`🔄 BoundedLoopingBlock starting round ${currentLoop + 1}`);
        }
        
        return logs;
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 BoundedLoopingBlock.onPop() - Cleaning up bounded loop`);
        
        // Let behaviors handle the pop logic first
        const logs = super.onPop(runtime);
        
        // Stop all timers through stop behavior
        this.stopTimers();
        
        // Stop the span
        const span = this.getSpan();
        if (span) {
            span.stop();
        }
        
        // Journal metrics and spans through journal behavior
        if (this.isJournalingEnabled()) {
            this.writeToJournal();
        }
        
        return [...logs, { level: 'info', message: 'bounded loop pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}