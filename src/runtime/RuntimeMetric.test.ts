import { RuntimeMetric, MetricValue } from "./RuntimeMetric";
import { describe, expect, test } from "vitest";

/**
 * Dedicated test suite for RuntimeMetric types and interfaces
 */
describe("RuntimeMetric Types", () => {
    
    describe("MetricValue Type", () => {
        test("should support all defined metric types", () => {
            const repetitions: MetricValue = { type: "repetitions", value: 10, unit: "reps" };
            const resistance: MetricValue = { type: "resistance", value: 100, unit: "lbs" };
            const distance: MetricValue = { type: "distance", value: 5, unit: "miles" };
            const timestamp: MetricValue = { type: "timestamp", value: Date.now(), unit: "ms" };
            const rounds: MetricValue = { type: "rounds", value: 3, unit: "rounds" };
            const time: MetricValue = { type: "time", value: 300, unit: "seconds" };
            
            expect(repetitions.type).toBe("repetitions");
            expect(resistance.type).toBe("resistance");
            expect(distance.type).toBe("distance");
            expect(timestamp.type).toBe("timestamp");
            expect(rounds.type).toBe("rounds");
            expect(time.type).toBe("time");
        });

        test("should handle various units", () => {
            const metricValues: MetricValue[] = [
                { type: "repetitions", value: 15, unit: "reps" },
                { type: "resistance", value: 80, unit: "kg" },
                { type: "distance", value: 1.5, unit: "km" },
                { type: "time", value: 240, unit: "seconds" },
                { type: "time", value: 4, unit: "minutes" },
                { type: "distance", value: 5280, unit: "feet" }
            ];
            
            expect(metricValues[0].unit).toBe("reps");
            expect(metricValues[1].unit).toBe("kg");
            expect(metricValues[2].unit).toBe("km");
            expect(metricValues[3].unit).toBe("seconds");
            expect(metricValues[4].unit).toBe("minutes");
            expect(metricValues[5].unit).toBe("feet");
        });

        test("should handle fractional values", () => {
            const fractionalMetrics: MetricValue[] = [
                { type: "distance", value: 3.5, unit: "miles" },
                { type: "resistance", value: 45.5, unit: "lbs" },
                { type: "time", value: 127.3, unit: "seconds" }
            ];
            
            expect(fractionalMetrics[0].value).toBe(3.5);
            expect(fractionalMetrics[1].value).toBe(45.5);
            expect(fractionalMetrics[2].value).toBe(127.3);
        });

        test("should handle zero and negative values", () => {
            const edgeCaseMetrics: MetricValue[] = [
                { type: "repetitions", value: 0, unit: "reps" },
                { type: "time", value: -5, unit: "seconds" }, // rest credit or adjustment
                { type: "resistance", value: 0, unit: "lbs" } // bodyweight
            ];
            
            expect(edgeCaseMetrics[0].value).toBe(0);
            expect(edgeCaseMetrics[1].value).toBe(-5);
            expect(edgeCaseMetrics[2].value).toBe(0);
        });
    });

    describe("RuntimeMetric Interface", () => {
        test("should create valid runtime metrics", () => {
            const metric: RuntimeMetric = {
                sourceId: "test-exercise-1",
                effort: "Squats",
                values: [
                    { type: "repetitions", value: 20, unit: "reps" },
                    { type: "resistance", value: 185, unit: "lbs" }
                ]
            };
            
            expect(metric.sourceId).toBe("test-exercise-1");
            expect(metric.effort).toBe("Squats");
            expect(metric.values).toHaveLength(2);
            expect(metric.values[0].type).toBe("repetitions");
            expect(metric.values[1].type).toBe("resistance");
        });

        test("should handle empty values array", () => {
            const emptyMetric: RuntimeMetric = {
                sourceId: "empty-metric",
                effort: "Rest Period",
                values: []
            };
            
            expect(emptyMetric.values).toHaveLength(0);
            expect(emptyMetric.sourceId).toBe("empty-metric");
            expect(emptyMetric.effort).toBe("Rest Period");
        });

        test("should handle single value metrics", () => {
            const singleValueMetric: RuntimeMetric = {
                sourceId: "single-value",
                effort: "Plank Hold",
                values: [
                    { type: "time", value: 60, unit: "seconds" }
                ]
            };
            
            expect(singleValueMetric.values).toHaveLength(1);
            expect(singleValueMetric.values[0].type).toBe("time");
            expect(singleValueMetric.values[0].value).toBe(60);
        });

        test("should handle multiple values of same type", () => {
            const multiSameTypeMetric: RuntimeMetric = {
                sourceId: "multi-same-type",
                effort: "Interval Training",
                values: [
                    { type: "time", value: 120, unit: "seconds" },
                    { type: "time", value: 60, unit: "seconds" },
                    { type: "time", value: 180, unit: "seconds" }
                ]
            };
            
            expect(multiSameTypeMetric.values).toHaveLength(3);
            multiSameTypeMetric.values.forEach(value => {
                expect(value.type).toBe("time");
            });
        });

        test("should handle complex workout metrics", () => {
            const complexMetric: RuntimeMetric = {
                sourceId: "complex-workout",
                effort: "Triathlon Brick Training",
                values: [
                    { type: "distance", value: 10, unit: "miles" }, // bike
                    { type: "time", value: 1800, unit: "seconds" }, // bike time
                    { type: "distance", value: 3, unit: "miles" }, // run
                    { type: "time", value: 1200, unit: "seconds" }, // run time
                    { type: "rounds", value: 2, unit: "rounds" } // brick repeats
                ]
            };
            
            expect(complexMetric.values).toHaveLength(5);
            expect(complexMetric.values[0].type).toBe("distance");
            expect(complexMetric.values[1].type).toBe("time");
            expect(complexMetric.values[4].type).toBe("rounds");
        });

        test("should support various effort names", () => {
            const workoutMetrics: RuntimeMetric[] = [
                { sourceId: "1", effort: "Back Squat", values: [] },
                { sourceId: "2", effort: "Overhead Press", values: [] },
                { sourceId: "3", effort: "400m Run", values: [] },
                { sourceId: "4", effort: "Rest", values: [] },
                { sourceId: "5", effort: "Transition", values: [] },
                { sourceId: "6", effort: "", values: [] } // empty effort
            ];
            
            expect(workoutMetrics[0].effort).toBe("Back Squat");
            expect(workoutMetrics[1].effort).toBe("Overhead Press");
            expect(workoutMetrics[2].effort).toBe("400m Run");
            expect(workoutMetrics[3].effort).toBe("Rest");
            expect(workoutMetrics[4].effort).toBe("Transition");
            expect(workoutMetrics[5].effort).toBe("");
        });

        test("should support various sourceId formats", () => {
            const sourceIdFormats: RuntimeMetric[] = [
                { sourceId: "simple", effort: "Test", values: [] },
                { sourceId: "with-dashes", effort: "Test", values: [] },
                { sourceId: "with_underscores", effort: "Test", values: [] },
                { sourceId: "camelCase", effort: "Test", values: [] },
                { sourceId: "123-numeric", effort: "Test", values: [] },
                { sourceId: "UPPER-CASE", effort: "Test", values: [] },
                { sourceId: "mixed-Case_123", effort: "Test", values: [] }
            ];
            
            sourceIdFormats.forEach((metric, index) => {
                expect(typeof metric.sourceId).toBe("string");
                expect(metric.sourceId.length).toBeGreaterThan(0);
            });
        });
    });

    describe("Real-world Workout Scenarios", () => {
        test("should represent CrossFit WOD metrics", () => {
            const crossfitWod: RuntimeMetric[] = [
                {
                    sourceId: "cf-thrusters",
                    effort: "Thrusters",
                    values: [
                        { type: "repetitions", value: 21, unit: "reps" },
                        { type: "resistance", value: 95, unit: "lbs" }
                    ]
                },
                {
                    sourceId: "cf-pullups",
                    effort: "Pull-ups",
                    values: [
                        { type: "repetitions", value: 21, unit: "reps" }
                    ]
                },
                {
                    sourceId: "cf-total-time",
                    effort: "Total Workout Time",
                    values: [
                        { type: "time", value: 720, unit: "seconds" }
                    ]
                }
            ];
            
            expect(crossfitWod).toHaveLength(3);
            expect(crossfitWod[0].values[0].value).toBe(21);
            expect(crossfitWod[1].values[0].type).toBe("repetitions");
            expect(crossfitWod[2].values[0].type).toBe("time");
        });

        test("should represent powerlifting meet metrics", () => {
            const powerliftingMeet: RuntimeMetric[] = [
                {
                    sourceId: "squat-opener",
                    effort: "Squat Opener",
                    values: [
                        { type: "repetitions", value: 1, unit: "reps" },
                        { type: "resistance", value: 405, unit: "lbs" }
                    ]
                },
                {
                    sourceId: "bench-second",
                    effort: "Bench Press Second Attempt",
                    values: [
                        { type: "repetitions", value: 1, unit: "reps" },
                        { type: "resistance", value: 275, unit: "lbs" }
                    ]
                },
                {
                    sourceId: "deadlift-third",
                    effort: "Deadlift Third Attempt",
                    values: [
                        { type: "repetitions", value: 1, unit: "reps" },
                        { type: "resistance", value: 500, unit: "lbs" }
                    ]
                }
            ];
            
            expect(powerliftingMeet).toHaveLength(3);
            powerliftingMeet.forEach(lift => {
                expect(lift.values[0].value).toBe(1); // single rep
                expect(lift.values[1].type).toBe("resistance");
            });
        });

        test("should represent endurance training metrics", () => {
            const enduranceTraining: RuntimeMetric[] = [
                {
                    sourceId: "warmup-jog",
                    effort: "Warm-up Jog",
                    values: [
                        { type: "distance", value: 1, unit: "mile" },
                        { type: "time", value: 540, unit: "seconds" }
                    ]
                },
                {
                    sourceId: "tempo-intervals",
                    effort: "Tempo Intervals",
                    values: [
                        { type: "distance", value: 0.25, unit: "mile" },
                        { type: "time", value: 90, unit: "seconds" },
                        { type: "rounds", value: 8, unit: "intervals" }
                    ]
                },
                {
                    sourceId: "cooldown-walk",
                    effort: "Cool-down Walk",
                    values: [
                        { type: "distance", value: 0.5, unit: "mile" },
                        { type: "time", value: 600, unit: "seconds" }
                    ]
                }
            ];
            
            expect(enduranceTraining).toHaveLength(3);
            expect(enduranceTraining[1].values).toHaveLength(3); // intervals have distance, time, and rounds
            expect(enduranceTraining[1].values[2].type).toBe("rounds");
        });

        test("should represent bodyweight circuit metrics", () => {
            const bodyweightCircuit: RuntimeMetric[] = [
                {
                    sourceId: "push-ups",
                    effort: "Push-ups",
                    values: [{ type: "repetitions", value: 15, unit: "reps" }]
                },
                {
                    sourceId: "air-squats",
                    effort: "Air Squats",
                    values: [{ type: "repetitions", value: 25, unit: "reps" }]
                },
                {
                    sourceId: "mountain-climbers",
                    effort: "Mountain Climbers",
                    values: [
                        { type: "repetitions", value: 20, unit: "reps" },
                        { type: "time", value: 30, unit: "seconds" }
                    ]
                },
                {
                    sourceId: "plank-hold",
                    effort: "Plank Hold",
                    values: [{ type: "time", value: 45, unit: "seconds" }]
                }
            ];
            
            expect(bodyweightCircuit).toHaveLength(4);
            expect(bodyweightCircuit[2].values).toHaveLength(2); // mountain climbers have both reps and time
            expect(bodyweightCircuit[3].values[0].type).toBe("time"); // plank is time-based
        });
    });
});
