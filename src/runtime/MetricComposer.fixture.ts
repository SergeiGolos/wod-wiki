import { RuntimeMetric } from "../../src/runtime/RuntimeMetric";

export const singleMetric: RuntimeMetric[] = [
    {
        sourceId: "test",
        values: [
            { type: "time", value: 1200, unit: "s" }
        ]
    }
];

export const multipleMetrics: RuntimeMetric[] = [
    {
        sourceId: "test1",
        values: [
            { type: "time", value: 1200, unit: "s" }
        ]
    },
    {
        sourceId: "test2",
        values: [
            { type: "distance", value: 400, unit: "m" }
        ]
    }
];

export const complexMetric: RuntimeMetric[] = [
    {
        sourceId: "test",
        values: [
            { type: "repetitions", value: 21, unit: "" },
            { type: "repetitions", value: 15, unit: "" },
            { type: "repetitions", value: 9, unit: "" },
            { type: "resistance", value: 95, unit: "lb" }
        ]
    }
];
