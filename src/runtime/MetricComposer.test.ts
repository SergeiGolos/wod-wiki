import { MetricComposer } from "../src/runtime/MetricComposer";
import { NullMetricInheritance } from "../src/runtime/NullMetricInheritance";
import { RoundsMetricInheritance, ProgressiveResistanceInheritance } from "../src/runtime/ExampleMetricInheritance";
import { RuntimeMetric } from "../src/runtime/RuntimeMetric";
import { describe, expect, test } from "vitest";

describe("MetricComposer", () => {
    const baseMetrics: RuntimeMetric[] = [
        {
            sourceId: "test-1",
            effort: "Push-ups",
            values: [
                { type: "repetitions", value: 10, unit: "reps" }
            ]
        },
        {
            sourceId: "test-2", 
            effort: "Squats",
            values: [
                { type: "repetitions", value: 15, unit: "reps" },
                { type: "resistance", value: 100, unit: "lbs" }
            ]
        }
    ];

    test("should return unchanged metrics with no inheritance", () => {
        const composer = new MetricComposer(baseMetrics);
        const result = composer.compose([]);
        
        expect(result).toHaveLength(2);
        expect(result[0].values[0].value).toBe(10);
        expect(result[1].values[0].value).toBe(15);
        expect(result[1].values[1].value).toBe(100);
    });

    test("should apply null inheritance without changes", () => {
        const composer = new MetricComposer(baseMetrics);
        const nullInheritance = new NullMetricInheritance();
        const result = composer.compose([nullInheritance]);
        
        expect(result).toHaveLength(2);
        expect(result[0].values[0].value).toBe(10);
        expect(result[1].values[0].value).toBe(15);
        expect(result[1].values[1].value).toBe(100);
    });

    test("should multiply repetitions by rounds", () => {
        const composer = new MetricComposer(baseMetrics);
        const roundsInheritance = new RoundsMetricInheritance(3);
        const result = composer.compose([roundsInheritance]);
        
        expect(result).toHaveLength(2);
        expect(result[0].values[0].value).toBe(30); // 10 * 3 rounds
        expect(result[1].values[0].value).toBe(45); // 15 * 3 rounds
        expect(result[1].values[1].value).toBe(100); // resistance unchanged
    });

    test("should apply progressive resistance", () => {
        const composer = new MetricComposer(baseMetrics);
        const progressiveInheritance = new ProgressiveResistanceInheritance(10, 3); // +10 lbs per round, currently round 3
        const result = composer.compose([progressiveInheritance]);
        
        expect(result).toHaveLength(2);
        expect(result[0].values[0].value).toBe(10); // repetitions unchanged
        expect(result[1].values[0].value).toBe(15); // repetitions unchanged
        expect(result[1].values[1].value).toBe(120); // 100 + (10 * (3-1)) = 120
    });

    test("should chain multiple inheritance rules", () => {
        const composer = new MetricComposer(baseMetrics);
        const roundsInheritance = new RoundsMetricInheritance(2);
        const progressiveInheritance = new ProgressiveResistanceInheritance(5, 2);
        const result = composer.compose([roundsInheritance, progressiveInheritance]);
        
        expect(result).toHaveLength(2);
        expect(result[0].values[0].value).toBe(20); // 10 * 2 rounds
        expect(result[1].values[0].value).toBe(30); // 15 * 2 rounds
        expect(result[1].values[1].value).toBe(105); // 100 + (5 * (2-1)) = 105
    });

    test("should not mutate original metrics", () => {
        const composer = new MetricComposer(baseMetrics);
        const roundsInheritance = new RoundsMetricInheritance(3);
        composer.compose([roundsInheritance]);
        
        // Original metrics should be unchanged
        expect(baseMetrics[0].values[0].value).toBe(10);
        expect(baseMetrics[1].values[0].value).toBe(15);
        expect(baseMetrics[1].values[1].value).toBe(100);
    });

    test("should return base metrics unchanged", () => {
        const composer = new MetricComposer(baseMetrics);
        const baseResult = composer.getBaseMetrics();
        
        expect(baseResult).toHaveLength(2);
        expect(baseResult[0].values[0].value).toBe(10);
        expect(baseResult[1].values[0].value).toBe(15);
        expect(baseResult[1].values[1].value).toBe(100);
    });
});
