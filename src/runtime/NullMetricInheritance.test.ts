import { NullMetricInheritance } from "./NullMetricInheritance";
import { RuntimeMetric } from "./RuntimeMetric";
import { describe, expect, test, beforeEach } from "vitest";

/**
 * Dedicated test suite for NullMetricInheritance class
 */
describe("NullMetricInheritance", () => {
    let testMetric: RuntimeMetric;
    
    beforeEach(() => {
        testMetric = {
            sourceId: "test-metric",
            effort: "Test Exercise",
            values: [
                { type: "repetitions", value: 10, unit: "reps" },
                { type: "resistance", value: 100, unit: "lbs" },
                { type: "distance", value: 5, unit: "miles" },
                { type: "time", value: 300, unit: "seconds" },
                { type: "rounds", value: 3, unit: "rounds" }
            ]
        };
    });

    test("should implement IMetricInheritance interface", () => {
        const nullInheritance = new NullMetricInheritance();
        expect(typeof nullInheritance.compose).toBe("function");
    });

    test("should not modify any metric values", () => {
        const nullInheritance = new NullMetricInheritance();
        const originalValues = testMetric.values.map(v => ({ ...v }));
        
        nullInheritance.compose(testMetric);
        
        expect(testMetric.values).toEqual(originalValues);
    });

    test("should not modify metric metadata", () => {
        const nullInheritance = new NullMetricInheritance();
        const originalSourceId = testMetric.sourceId;
        const originalEffort = testMetric.effort;
        
        nullInheritance.compose(testMetric);
        
        expect(testMetric.sourceId).toBe(originalSourceId);
        expect(testMetric.effort).toBe(originalEffort);
    });

    test("should handle empty values array", () => {
        const emptyMetric: RuntimeMetric = {
            sourceId: "empty",
            effort: "Empty Exercise",
            values: []
        };
        
        const nullInheritance = new NullMetricInheritance();
        nullInheritance.compose(emptyMetric);
        
        expect(emptyMetric.values).toHaveLength(0);
    });

    test("should be safe to call multiple times", () => {
        const nullInheritance = new NullMetricInheritance();
        const originalValues = testMetric.values.map(v => ({ ...v }));
        
        nullInheritance.compose(testMetric);
        nullInheritance.compose(testMetric);
        nullInheritance.compose(testMetric);
        
        expect(testMetric.values).toEqual(originalValues);
    });

    test("should handle all metric value types", () => {
        const allTypesMetric: RuntimeMetric = {
            sourceId: "all-types",
            effort: "All Types Exercise",
            values: [
                { type: "repetitions", value: 15, unit: "reps" },
                { type: "resistance", value: 200, unit: "kg" },
                { type: "distance", value: 10, unit: "km" },
                { type: "time", value: 600, unit: "seconds" },
                { type: "rounds", value: 5, unit: "rounds" },
                { type: "timestamp", value: Date.now(), unit: "ms" }
            ]
        };
        
        const nullInheritance = new NullMetricInheritance();
        const originalValues = allTypesMetric.values.map(v => ({ ...v }));
        
        nullInheritance.compose(allTypesMetric);
        
        expect(allTypesMetric.values).toEqual(originalValues);
    });
});
