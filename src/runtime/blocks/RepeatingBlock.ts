import { IRuntimeBlock } from "../IRuntimeBlock";

import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent} from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";
import { GroupNextHandler } from "../handlers/GroupNextHandler";

export class RepeatingBlock implements IRuntimeBlock {
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];
    private remainingRounds: number;
    private currentChildIndex: number = -1;
    private childStatements: any[] = []; // Will store child statements for this round

    constructor(public readonly key: BlockKey, metrics: RuntimeMetric[]) {
        this.metrics = metrics;
        this.spans = {} as IResultSpanBuilder;
        this.handlers = [new GroupNextHandler()];
        
        // Find rounds metric value
        const roundsMetric = this.metrics.find(m => 
            m.values.some(v => v.type === 'rounds')
        );
        this.remainingRounds = roundsMetric?.values.find(v => v.type === 'rounds')?.value || 1;
        
        console.log(`🔄 RepeatingBlock created with ${this.remainingRounds} rounds remaining`);
    }

    public hasNextChild(): boolean {
        // Check if there are more children in the current round
        if (this.currentChildIndex < this.childStatements.length - 1) {
            return true;
        }
        
        // Check if there are more rounds to execute
        return this.remainingRounds > 1;
    }

    public advanceToNextChild(): void {
        this.currentChildIndex++;
        
        // If we've completed all children in this round
        if (this.currentChildIndex >= this.childStatements.length) {
            console.log(`🔄 RepeatingBlock - Round completed, ${this.remainingRounds - 1} rounds remaining`);
            this.remainingRounds--;
            this.currentChildIndex = 0; // Reset to first child for next round
            
            // Update the BlockKey index to reflect the new round
            this.key.add(1);
        }
        
        console.log(`🔄 RepeatingBlock - Advanced to child ${this.currentChildIndex}, rounds remaining: ${this.remainingRounds}`);
    }

    public tick(): IRuntimeEvent[] {
        return [];
    }

    public isDone(): boolean {
        return this.remainingRounds <= 0;
    }

    public reset(): void {
        // Find rounds metric value
        const roundsMetric = this.metrics.find(m => 
            m.values.some(v => v.type === 'rounds')
        );
        this.remainingRounds = roundsMetric?.values.find(v => v.type === 'rounds')?.value || 1;
        this.currentChildIndex = -1;
    }

    public inherit(): IMetricInheritance[] {
        return [];
    }
}