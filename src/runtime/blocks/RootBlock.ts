import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeAction, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { IMetricInheritance } from "../IMetricInheritance";
import { RootNextHandler } from "../handlers/RootNextHandler";

export class RootBlock implements IRuntimeBlock {
    public readonly key: BlockKey;
    public parent?: IRuntimeBlock;
    public spans: IResultSpanBuilder;
    public metrics: RuntimeMetric[];
    public handlers: EventHandler[];

    constructor(children: string[]) {
        console.log(`🌱 RootBlock constructor - Creating with children: [${children.join(', ')}]`);
        this.key = new BlockKey('root', children, []);
        this.spans = {} as IResultSpanBuilder;
        this.metrics = [];
        
        // Add handlers for this block
        this.handlers = [
            new RootNextHandler()
        ];
        
        console.log(`🌱 RootBlock created with key: ${this.key.toString()}`);
        console.log(`  🔧 Registered ${this.handlers.length} handlers: ${this.handlers.map(h => h.name).join(', ')}`);
    }

    public tick(): IRuntimeEvent[] {
        console.log(`🌱 RootBlock.tick() - Called`);
        return [];
    }

    public inherit(): IMetricInheritance[] {
        console.log(`🌱 RootBlock.inherit() - Called`);
        return [];
    }

    public isDone(): boolean { return false; }

    public reset(): void {}
}