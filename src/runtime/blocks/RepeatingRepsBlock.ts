import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { RepeatingBlock } from "./RepeatingBlock";
import type { IMemoryReference } from "../memory";

export class RepeatingRepsBlock extends RepeatingBlock {
    private _publicMetricsRef?: IMemoryReference<RuntimeMetric[]>;

    protected initializeMemory(): void {
        super.initializeMemory();
        // In the new model, tests expect metrics snapshot to be private
        this._publicMetricsRef = this.allocateMemory('metrics-snapshot', [...this.initialMetrics], 'private');
    }

    public getPublicMetricsReference() {
        return this._publicMetricsRef;
    }
}
