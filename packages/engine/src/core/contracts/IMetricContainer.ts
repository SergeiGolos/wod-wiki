import type { IOutputStatement } from '../models/OutputStatement';
import type { MetricContainer } from '../models/MetricContainer';
import type { IMetricSource } from './IMetricSource';

export interface IMetricContainer extends IMetricSource {
    metrics: MetricContainer;
    clone(): IMetricContainer;
    merge(other: IMetricContainer | MetricContainer): this;
}

export type SummaryStage = 'estimate' | 'summary';

export interface IMetricSummary extends IMetricContainer {
    readonly stage: SummaryStage;
    readonly sourceId: string | number;
    readonly producedAt: Date;
}

export interface IEstimate extends IMetricSummary {
    readonly stage: 'estimate';
}

export interface ISummary extends IMetricSummary {
    readonly stage: 'summary';
    readonly spans: IOutputStatement[];
}
