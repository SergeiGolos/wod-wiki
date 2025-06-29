import { IMetricInheritance } from "./IMetricInheritance";
import { RuntimeMetric } from "./RuntimeMetric";
import { describe, expect, test } from "vitest";

/**
 * Test suite for IMetricInheritance interface compliance and behavior
 */
describe("IMetricInheritance Interface", () => {
    
    // Mock implementation for testing interface compliance
    class MockMetricInheritance implements IMetricInheritance {
        private multiplier: number;
        
        constructor(multiplier: number = 1) {
            this.multiplier = multiplier;
        }
        
        compose(metric: RuntimeMetric): void {
            metric.values.forEach(value => {
                if (value.type === "repetitions") {
                    value.value *= this.multiplier;
                }
            });
        }
    }

    // Another mock for testing different behaviors
    class SelectiveMetricInheritance implements IMetricInheritance {
        compose(metric: RuntimeMetric): void {
            metric.values.forEach(value => {
                if (value.type === "resistance") {
                    value.value += 25;
                } else if (value.type === "time") {
                    value.value -= 10;
                }
            });
        }
    }

    test("should define compose method signature", () => {
        const mockInheritance = new MockMetricInheritance();
        expect(typeof mockInheritance.compose).toBe("function");
        expect(mockInheritance.compose.length).toBe(1); // expects one parameter
    });

    test("should allow implementations to modify metrics in-place", () => {
        const mockInheritance = new MockMetricInheritance(3);
        const testMetric: RuntimeMetric = {
            sourceId: "test",
            effort: "Test Exercise",
            values: [
                { type: "repetitions", value: 10, unit: "reps" }
            ]
        };
        
        mockInheritance.compose(testMetric);
        
        expect(testMetric.values[0].value).toBe(30); // 10 * 3
    });

    test("should support selective value modification", () => {
        const selectiveInheritance = new SelectiveMetricInheritance();
        const testMetric: RuntimeMetric = {
            sourceId: "test",
            effort: "Test Exercise",
            values: [
                { type: "repetitions", value: 10, unit: "reps" },
                { type: "resistance", value: 100, unit: "lbs" },
                { type: "time", value: 300, unit: "seconds" }
            ]
        };
        
        selectiveInheritance.compose(testMetric);
        
        expect(testMetric.values[0].value).toBe(10); // repetitions unchanged
        expect(testMetric.values[1].value).toBe(125); // resistance + 25
        expect(testMetric.values[2].value).toBe(290); // time - 10
    });

    test("should handle metrics with no values", () => {
        const mockInheritance = new MockMetricInheritance(2);
        const emptyMetric: RuntimeMetric = {
            sourceId: "empty",
            effort: "Empty",
            values: []
        };
        
        // Should not throw error
        expect(() => {
            mockInheritance.compose(emptyMetric);
        }).not.toThrow();
        
        expect(emptyMetric.values).toHaveLength(0);
    });

    test("should allow multiple inheritance applications", () => {
        const inheritance1 = new MockMetricInheritance(2);
        const inheritance2 = new MockMetricInheritance(3);
        
        const testMetric: RuntimeMetric = {
            sourceId: "test",
            effort: "Test Exercise",
            values: [
                { type: "repetitions", value: 5, unit: "reps" }
            ]
        };
        
        inheritance1.compose(testMetric);
        inheritance2.compose(testMetric);
        
        expect(testMetric.values[0].value).toBe(30); // 5 * 2 * 3
    });

    test("should handle complex metric structures", () => {
        const complexInheritance = new SelectiveMetricInheritance();
        const complexMetric: RuntimeMetric = {
            sourceId: "complex",
            effort: "Complex Exercise",
            values: [
                { type: "repetitions", value: 12, unit: "reps" },
                { type: "resistance", value: 135, unit: "lbs" },
                { type: "distance", value: 100, unit: "meters" },
                { type: "time", value: 240, unit: "seconds" },
                { type: "rounds", value: 3, unit: "rounds" },
                { type: "timestamp", value: Date.now(), unit: "ms" }
            ]
        };
        
        complexInheritance.compose(complexMetric);
        
        // Only resistance and time should be modified
        expect(complexMetric.values[0].value).toBe(12); // repetitions unchanged
        expect(complexMetric.values[1].value).toBe(160); // resistance + 25
        expect(complexMetric.values[2].value).toBe(100); // distance unchanged
        expect(complexMetric.values[3].value).toBe(230); // time - 10
        expect(complexMetric.values[4].value).toBe(3); // rounds unchanged
        // timestamp unchanged (we don't test exact value due to timing)
    });

    test("should support implementations that don't modify anything", () => {
        class NoOpInheritance implements IMetricInheritance {
            compose(metric: RuntimeMetric): void {
                // Intentionally does nothing
            }
        }
        
        const noOpInheritance = new NoOpInheritance();
        const testMetric: RuntimeMetric = {
            sourceId: "test",
            effort: "Test Exercise",
            values: [
                { type: "repetitions", value: 15, unit: "reps" },
                { type: "resistance", value: 200, unit: "lbs" }
            ]
        };
        
        const originalValues = testMetric.values.map(v => ({ ...v }));
        noOpInheritance.compose(testMetric);
        
        expect(testMetric.values).toEqual(originalValues);
    });

    test("should support implementations with conditional logic", () => {
        class ConditionalInheritance implements IMetricInheritance {
            compose(metric: RuntimeMetric): void {
                // Only modify if effort contains "Heavy"
                if (metric.effort.includes("Heavy")) {
                    metric.values.forEach(value => {
                        if (value.type === "resistance") {
                            value.value *= 1.1; // 10% increase for heavy work
                        }
                    });
                }
            }
        }
        
        const conditionalInheritance = new ConditionalInheritance();
        
        const heavyMetric: RuntimeMetric = {
            sourceId: "heavy",
            effort: "Heavy Squats",
            values: [{ type: "resistance", value: 300, unit: "lbs" }]
        };
        
        const lightMetric: RuntimeMetric = {
            sourceId: "light",
            effort: "Light Squats",
            values: [{ type: "resistance", value: 300, unit: "lbs" }]
        };
        
        conditionalInheritance.compose(heavyMetric);
        conditionalInheritance.compose(lightMetric);
        
        expect(heavyMetric.values[0].value).toBe(330); // 300 * 1.1
        expect(lightMetric.values[0].value).toBe(300); // unchanged
    });

    test("should support implementations with state", () => {
        class StatefulInheritance implements IMetricInheritance {
            private callCount = 0;
            
            compose(metric: RuntimeMetric): void {
                this.callCount++;
                metric.values.forEach(value => {
                    if (value.type === "repetitions") {
                        value.value += this.callCount; // Add call count to reps
                    }
                });
            }
            
            getCallCount(): number {
                return this.callCount;
            }
        }
        
        const statefulInheritance = new StatefulInheritance();
        
        const metric1: RuntimeMetric = {
            sourceId: "1",
            effort: "Exercise 1",
            values: [{ type: "repetitions", value: 10, unit: "reps" }]
        };
        
        const metric2: RuntimeMetric = {
            sourceId: "2", 
            effort: "Exercise 2",
            values: [{ type: "repetitions", value: 10, unit: "reps" }]
        };
        
        statefulInheritance.compose(metric1);
        statefulInheritance.compose(metric2);
        
        expect(metric1.values[0].value).toBe(11); // 10 + 1 (first call)
        expect(metric2.values[0].value).toBe(12); // 10 + 2 (second call)
        expect(statefulInheritance.getCallCount()).toBe(2);
    });

    test("should handle edge cases gracefully", () => {
        class EdgeCaseInheritance implements IMetricInheritance {
            compose(metric: RuntimeMetric): void {
                metric.values.forEach(value => {
                    // Handle various edge cases
                    if (value.value === 0) {
                        value.value = 1; // Convert 0 to 1
                    } else if (value.value < 0) {
                        value.value = Math.abs(value.value); // Make negative values positive
                    } else if (value.value > 1000) {
                        value.value = 1000; // Cap at 1000
                    }
                });
            }
        }
        
        const edgeCaseInheritance = new EdgeCaseInheritance();
        const edgeMetric: RuntimeMetric = {
            sourceId: "edge",
            effort: "Edge Cases",
            values: [
                { type: "repetitions", value: 0, unit: "reps" },
                { type: "resistance", value: -50, unit: "lbs" },
                { type: "time", value: 5000, unit: "seconds" },
                { type: "distance", value: 42, unit: "km" }
            ]
        };
        
        edgeCaseInheritance.compose(edgeMetric);
        
        expect(edgeMetric.values[0].value).toBe(1); // 0 -> 1
        expect(edgeMetric.values[1].value).toBe(50); // -50 -> 50
        expect(edgeMetric.values[2].value).toBe(1000); // 5000 -> 1000
        expect(edgeMetric.values[3].value).toBe(42); // 42 unchanged
    });
});
