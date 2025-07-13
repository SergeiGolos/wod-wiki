import { RuntimeMetric } from "../../src/runtime/RuntimeMetric";

export const singleMetric: RuntimeMetric[] = [
    {
        sourceId: "test",
        effort: "Test Effort",
        values: [
            { type: "time", value: 1200, unit: "s" }
        ]
    }
];

export const multipleMetrics: RuntimeMetric[] = [
    {
        sourceId: "test1",
        effort: "Test Effort 1",
        values: [
            { type: "time", value: 1200, unit: "s" }
        ]
    },
    {
        sourceId: "test2",
        effort: "Test Effort 2",
        values: [
            { type: "distance", value: 400, unit: "m" }
        ]
    }
];

export const complexMetric: RuntimeMetric[] = [
    {
        sourceId: "test",
        effort: "Test Effort",
        values: [
            { type: "repetitions", value: 21, unit: "" },
            { type: "repetitions", value: 15, unit: "" },
            { type: "repetitions", value: 9, unit: "" },
            { type: "resistance", value: 95, unit: "lb" }
        ]
    }
];
