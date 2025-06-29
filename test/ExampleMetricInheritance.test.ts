import { RoundsMetricInheritance, ProgressiveResistanceInheritance, PercentageProgressionInheritance, TimeBasedInheritance } from "../src/runtime/ExampleMetricInheritance";
import { RuntimeMetric } from "../src/runtime/RuntimeMetric";
import { describe, expect, test, beforeEach } from "vitest";

/**
 * Dedicated test suite for ExampleMetricInheritance classes
 */
describe("ExampleMetricInheritance Classes", () => {
    let basicMetric: RuntimeMetric;
    let strengthMetric: RuntimeMetric;
    let enduranceMetric: RuntimeMetric;
    
    beforeEach(() => {
        basicMetric = {
            sourceId: "basic",
            effort: "Push-ups",
            values: [
                { type: "repetitions", value: 10, unit: "reps" }
            ]
        };

        strengthMetric = {
            sourceId: "strength",
            effort: "Bench Press",
            values: [
                { type: "repetitions", value: 5, unit: "reps" },
                { type: "resistance", value: 135, unit: "lbs" }
            ]
        };

        enduranceMetric = {
            sourceId: "endurance",
            effort: "Running",
            values: [
                { type: "distance", value: 1, unit: "mile" },
                { type: "time", value: 480, unit: "seconds" }
            ]
        };
    });

    describe("RoundsMetricInheritance", () => {
        test("should multiply repetitions by round count", () => {
            const rounds = new RoundsMetricInheritance(3);
            rounds.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(30); // 10 * 3
        });

        test("should multiply rounds type values", () => {
            const roundsMetric: RuntimeMetric = {
                sourceId: "rounds-test",
                effort: "Circuit",
                values: [
                    { type: "rounds", value: 2, unit: "rounds" }
                ]
            };
            
            const rounds = new RoundsMetricInheritance(4);
            rounds.compose(roundsMetric);
            
            expect(roundsMetric.values[0].value).toBe(8); // 2 * 4
        });

        test("should not affect resistance values", () => {
            const rounds = new RoundsMetricInheritance(3);
            rounds.compose(strengthMetric);
            
            expect(strengthMetric.values[0].value).toBe(15); // 5 * 3 (reps)
            expect(strengthMetric.values[1].value).toBe(135); // resistance unchanged
        });

        test("should handle zero rounds", () => {
            const rounds = new RoundsMetricInheritance(0);
            rounds.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(0);
        });

        test("should handle fractional rounds", () => {
            const rounds = new RoundsMetricInheritance(2.5);
            rounds.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(25); // 10 * 2.5
        });

        test("should handle negative rounds", () => {
            const rounds = new RoundsMetricInheritance(-2);
            rounds.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(-20); // 10 * -2
        });
    });

    describe("ProgressiveResistanceInheritance", () => {
        test("should add progression to resistance values", () => {
            const progression = new ProgressiveResistanceInheritance(10, 3);
            progression.compose(strengthMetric);
            
            expect(strengthMetric.values[0].value).toBe(5); // reps unchanged
            expect(strengthMetric.values[1].value).toBe(155); // 135 + (10 * (3-1))
        });

        test("should handle first round (no progression)", () => {
            const progression = new ProgressiveResistanceInheritance(10, 1);
            progression.compose(strengthMetric);
            
            expect(strengthMetric.values[1].value).toBe(135); // 135 + (10 * 0)
        });

        test("should handle negative increments (deload)", () => {
            const deload = new ProgressiveResistanceInheritance(-20, 2);
            deload.compose(strengthMetric);
            
            expect(strengthMetric.values[1].value).toBe(115); // 135 + (-20 * 1)
        });

        test("should not affect non-resistance values", () => {
            const progression = new ProgressiveResistanceInheritance(15, 4);
            progression.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(10); // unchanged
        });

        test("should handle zero increment", () => {
            const progression = new ProgressiveResistanceInheritance(0, 5);
            progression.compose(strengthMetric);
            
            expect(strengthMetric.values[1].value).toBe(135); // unchanged
        });

        test("should handle fractional increments", () => {
            const progression = new ProgressiveResistanceInheritance(2.5, 3);
            progression.compose(strengthMetric);
            
            expect(strengthMetric.values[1].value).toBe(140); // 135 + (2.5 * 2)
        });
    });

    describe("PercentageProgressionInheritance", () => {
        test("should apply percentage to all values", () => {
            const percentage = new PercentageProgressionInheritance(80);
            percentage.compose(strengthMetric);
            
            expect(strengthMetric.values[0].value).toBe(4); // 5 * 0.8 = 4
            expect(strengthMetric.values[1].value).toBe(108); // 135 * 0.8 = 108
        });

        test("should handle percentage increase", () => {
            const percentage = new PercentageProgressionInheritance(120);
            percentage.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(12); // 10 * 1.2 = 12
        });

        test("should round to nearest integer", () => {
            const percentage = new PercentageProgressionInheritance(33);
            percentage.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(3); // 10 * 0.33 = 3.3, rounded to 3
        });

        test("should handle zero percentage", () => {
            const percentage = new PercentageProgressionInheritance(0);
            percentage.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(0);
        });

        test("should handle negative percentage as zero", () => {
            const percentage = new PercentageProgressionInheritance(-50);
            percentage.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(0);
        });

        test("should handle large percentages", () => {
            const percentage = new PercentageProgressionInheritance(500);
            percentage.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(50); // 10 * 5.0 = 50
        });

        test("should handle floating point percentages", () => {
            const percentage = new PercentageProgressionInheritance(33.33);
            percentage.compose(basicMetric);
            
            expect(basicMetric.values[0].value).toBe(3); // 10 * 0.3333 = 3.333, rounded to 3
        });
    });

    describe("TimeBasedInheritance", () => {
        test("should adjust time values", () => {
            const timeAdjustment = new TimeBasedInheritance(60);
            timeAdjustment.compose(enduranceMetric);
            
            expect(enduranceMetric.values[0].value).toBe(1); // distance unchanged
            expect(enduranceMetric.values[1].value).toBe(540); // 480 + 60
        });

        test("should handle negative time adjustment", () => {
            const timeAdjustment = new TimeBasedInheritance(-30);
            timeAdjustment.compose(enduranceMetric);
            
            expect(enduranceMetric.values[1].value).toBe(450); // 480 - 30
        });

        test("should not affect non-time values", () => {
            const timeAdjustment = new TimeBasedInheritance(120);
            timeAdjustment.compose(strengthMetric);
            
            expect(strengthMetric.values[0].value).toBe(5); // reps unchanged
            expect(strengthMetric.values[1].value).toBe(135); // resistance unchanged
        });

        test("should handle zero adjustment", () => {
            const timeAdjustment = new TimeBasedInheritance(0);
            timeAdjustment.compose(enduranceMetric);
            
            expect(enduranceMetric.values[1].value).toBe(480); // unchanged
        });

        test("should handle fractional adjustments", () => {
            const timeAdjustment = new TimeBasedInheritance(15.5);
            timeAdjustment.compose(enduranceMetric);
            
            expect(enduranceMetric.values[1].value).toBe(495.5); // 480 + 15.5
        });

        test("should handle multiple time values", () => {
            const multiTimeMetric: RuntimeMetric = {
                sourceId: "multi-time",
                effort: "Complex Exercise",
                values: [
                    { type: "time", value: 300, unit: "seconds" },
                    { type: "time", value: 120, unit: "seconds" },
                    { type: "repetitions", value: 10, unit: "reps" }
                ]
            };
            
            const timeAdjustment = new TimeBasedInheritance(30);
            timeAdjustment.compose(multiTimeMetric);
            
            expect(multiTimeMetric.values[0].value).toBe(330); // 300 + 30
            expect(multiTimeMetric.values[1].value).toBe(150); // 120 + 30
            expect(multiTimeMetric.values[2].value).toBe(10); // reps unchanged
        });
    });

    describe("Inheritance Chaining", () => {
        test("should support multiple inheritance applications", () => {
            const rounds = new RoundsMetricInheritance(3);
            const percentage = new PercentageProgressionInheritance(80);
            
            rounds.compose(basicMetric);
            percentage.compose(basicMetric);
            
            // 10 * 3 = 30, then 30 * 0.8 = 24
            expect(basicMetric.values[0].value).toBe(24);
        });

        test("should maintain independence between inheritance types", () => {
            const strengthCopy = JSON.parse(JSON.stringify(strengthMetric));
            
            const rounds = new RoundsMetricInheritance(2);
            const progression = new ProgressiveResistanceInheritance(25, 3);
            
            rounds.compose(strengthCopy);
            progression.compose(strengthCopy);
            
            expect(strengthCopy.values[0].value).toBe(10); // 5 * 2 (rounds only affects reps)
            expect(strengthCopy.values[1].value).toBe(185); // 135 + (25 * 2) (progression only affects resistance)
        });
    });
});
