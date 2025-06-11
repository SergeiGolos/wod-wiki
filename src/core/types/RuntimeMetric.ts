import { MetricValue } from "./MetricValue";


export interface RuntimeMetric {
  sourceId: string;
  effort: string;
  values: MetricValue[];
}
