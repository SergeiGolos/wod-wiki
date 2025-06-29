import { MetricComposer } from "../src/runtime/MetricComposer";
import { NullMetricInheritance } from "../src/runtime/NullMetricInheritance";
import { RoundsMetricInheritance, ProgressiveResistanceInheritance, PercentageProgressionInheritance, TimeBasedInheritance } from "../src/runtime/ExampleMetricInheritance";
import { RuntimeMetric, MetricValue } from "../src/runtime/RuntimeMetric";
import { IMetricInheritance } from "../src/runtime/IMetricInheritance";
import { describe, expect, test, beforeEach } from "vitest";

/**
 * Comprehensive test suite for the Metric Inheritance System
 * 
 * This test suite covers all classes and scenarios for the WOD Wiki
 * metric inheritance system, using story-based test scenarios that
 * represent real workout patterns.
 */
describe("Metric Inheritance System - Complete Test Suite", () => {
    
    // Base workout metrics for testing
    let basicWorkoutMetrics: RuntimeMetric[];
    let strengthWorkoutMetrics: RuntimeMetric[];
    let complexWorkoutMetrics: RuntimeMetric[];
    
    beforeEach(() => {
        // Basic bodyweight workout
        basicWorkoutMetrics = [
            {
                sourceId: "pushups",
                effort: "Push-ups",
                values: [
                    { type: "repetitions", value: 10, unit: "reps" }
                ]
            },
            {
                sourceId: "squats",
                effort: "Squats", 
                values: [
                    { type: "repetitions", value: 20, unit: "reps" }
                ]
            }
        ];

        // Strength training with weights
        strengthWorkoutMetrics = [
            {
                sourceId: "bench-press",
                effort: "Bench Press",
                values: [
                    { type: "repetitions", value: 8, unit: "reps" },
                    { type: "resistance", value: 135, unit: "lbs" }
                ]
            },
            {
                sourceId: "deadlift", 
                effort: "Deadlift",
                values: [
                    { type: "repetitions", value: 5, unit: "reps" },
                    { type: "resistance", value: 225, unit: "lbs" }
                ]
            }
        ];

        // Complex workout with time and distance
        complexWorkoutMetrics = [
            {
                sourceId: "running",
                effort: "Running",
                values: [
                    { type: "distance", value: 1, unit: "mile" },
                    { type: "time", value: 480, unit: "seconds" }
                ]
            },
            {
                sourceId: "rowing",
                effort: "Rowing",
                values: [
                    { type: "distance", value: 500, unit: "meters" },
                    { type: "time", value: 120, unit: "seconds" }
                ]
            }
        ];
    });

    describe("MetricComposer Core Functionality", () => {
        test("should initialize with base metrics", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const base = composer.getBaseMetrics();
            
            expect(base).toHaveLength(2);
            expect(base[0].effort).toBe("Push-ups");
            expect(base[1].effort).toBe("Squats");
        });

        test("should handle empty metrics array", () => {
            const composer = new MetricComposer([]);
            const result = composer.compose([]);
            
            expect(result).toHaveLength(0);
        });

        test("should preserve metric immutability", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const inheritance = new RoundsMetricInheritance(5);
            
            const originalValue = basicWorkoutMetrics[0].values[0].value;
            composer.compose([inheritance]);
            
            expect(basicWorkoutMetrics[0].values[0].value).toBe(originalValue);
        });

        test("should handle metrics with no values", () => {
            const emptyMetrics: RuntimeMetric[] = [
                {
                    sourceId: "rest",
                    effort: "Rest Period",
                    values: []
                }
            ];
            
            const composer = new MetricComposer(emptyMetrics);
            const result = composer.compose([new RoundsMetricInheritance(3)]);
            
            expect(result).toHaveLength(1);
            expect(result[0].values).toHaveLength(0);
        });
    });

    describe("NullMetricInheritance", () => {
        test("should pass through all metrics unchanged", () => {
            const nullInheritance = new NullMetricInheritance();
            const composer = new MetricComposer(strengthWorkoutMetrics);
            const result = composer.compose([nullInheritance]);
            
            expect(result).toEqual(strengthWorkoutMetrics);
        });

        test("should be chainable with other inheritance rules", () => {
            const nullInheritance = new NullMetricInheritance();
            const roundsInheritance = new RoundsMetricInheritance(2);
            const composer = new MetricComposer(basicWorkoutMetrics);
            
            const result = composer.compose([nullInheritance, roundsInheritance]);
            
            expect(result[0].values[0].value).toBe(20); // 10 * 2 rounds
            expect(result[1].values[0].value).toBe(40); // 20 * 2 rounds
        });
    });

    describe("RoundsMetricInheritance - Circuit Training Scenarios", () => {
        test("Story: 3-round bodyweight circuit", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const threeRounds = new RoundsMetricInheritance(3);
            const result = composer.compose([threeRounds]);
            
            // Push-ups: 10 reps × 3 rounds = 30 total reps
            expect(result[0].values[0].value).toBe(30);
            expect(result[0].values[0].type).toBe("repetitions");
            
            // Squats: 20 reps × 3 rounds = 60 total reps
            expect(result[1].values[0].value).toBe(60);
            expect(result[1].values[0].type).toBe("repetitions");
        });

        test("Story: EMOM (Every Minute on the Minute) for 12 minutes", () => {
            const emomMetrics: RuntimeMetric[] = [
                {
                    sourceId: "burpees",
                    effort: "Burpees",
                    values: [
                        { type: "repetitions", value: 5, unit: "reps" }
                    ]
                }
            ];
            
            const composer = new MetricComposer(emomMetrics);
            const twelveMinutes = new RoundsMetricInheritance(12);
            const result = composer.compose([twelveMinutes]);
            
            // 5 burpees × 12 minutes = 60 total burpees
            expect(result[0].values[0].value).toBe(60);
        });

        test("should handle single round (no multiplication)", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const oneRound = new RoundsMetricInheritance(1);
            const result = composer.compose([oneRound]);
            
            expect(result[0].values[0].value).toBe(10);
            expect(result[1].values[0].value).toBe(20);
        });

        test("should handle zero rounds", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const zeroRounds = new RoundsMetricInheritance(0);
            const result = composer.compose([zeroRounds]);
            
            expect(result[0].values[0].value).toBe(0);
            expect(result[1].values[0].value).toBe(0);
        });
    });

    describe("ProgressiveResistanceInheritance - Strength Training Scenarios", () => {
        test("Story: Progressive overload bench press", () => {
            const composer = new MetricComposer(strengthWorkoutMetrics);
            // Add 10 lbs per week, currently on week 4
            const progressiveLoad = new ProgressiveResistanceInheritance(10, 4);
            const result = composer.compose([progressiveLoad]);
            
            // Bench press: 135 + (10 × (4-1)) = 165 lbs
            expect(result[0].values[1].value).toBe(165);
            expect(result[0].values[1].type).toBe("resistance");
            
            // Deadlift: 225 + (10 × (4-1)) = 255 lbs  
            expect(result[1].values[1].value).toBe(255);
            expect(result[1].values[1].type).toBe("resistance");
            
            // Repetitions should remain unchanged
            expect(result[0].values[0].value).toBe(8);
            expect(result[1].values[0].value).toBe(5);
        });

        test("Story: Deload week (negative progression)", () => {
            const composer = new MetricComposer(strengthWorkoutMetrics);
            // Reduce by 15 lbs for deload week
            const deload = new ProgressiveResistanceInheritance(-15, 1);
            const result = composer.compose([deload]);
            
            // Bench press: 135 + (-15 × (1-1)) = 135 lbs (no change on first iteration)
            expect(result[0].values[1].value).toBe(135);
            // Deadlift: 225 + (-15 × (1-1)) = 225 lbs
            expect(result[1].values[1].value).toBe(225);
        });

        test("Story: Linear progression over multiple weeks", () => {
            const composer = new MetricComposer(strengthWorkoutMetrics);
            // Add 5 lbs per week, currently on week 8
            const linearProgression = new ProgressiveResistanceInheritance(5, 8);
            const result = composer.compose([linearProgression]);
            
            // Bench press: 135 + (5 × (8-1)) = 170 lbs
            expect(result[0].values[1].value).toBe(170);
            // Deadlift: 225 + (5 × (8-1)) = 260 lbs
            expect(result[1].values[1].value).toBe(260);
        });

        test("should not affect metrics without resistance values", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const progression = new ProgressiveResistanceInheritance(25, 3);
            const result = composer.compose([progression]);
            
            // Bodyweight exercises should remain unchanged
            expect(result[0].values[0].value).toBe(10);
            expect(result[1].values[0].value).toBe(20);
        });
    });

    describe("PercentageProgressionInheritance - Percentage-based Training", () => {
        test("Story: 1RM percentage-based training", () => {
            const oneRMMetrics: RuntimeMetric[] = [
                {
                    sourceId: "squat-1rm",
                    effort: "Back Squat",
                    values: [
                        { type: "repetitions", value: 5, unit: "reps" },
                        { type: "resistance", value: 315, unit: "lbs" } // 1RM
                    ]
                }
            ];
            
            const composer = new MetricComposer(oneRMMetrics);
            // Working at 85% of 1RM
            const percentageWork = new PercentageProgressionInheritance(85);
            const result = composer.compose([percentageWork]);
            
            // 315 × 0.85 = 267.75, rounded to 268
            expect(result[0].values[1].value).toBe(268);
        });

        test("Story: Volume reduction during peak phase", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            // Reduce volume to 70% during competition prep
            const volumeReduction = new PercentageProgressionInheritance(70);
            const result = composer.compose([volumeReduction]);
            
            // Push-ups: 10 × 0.70 = 7
            expect(result[0].values[0].value).toBe(7);
            // Squats: 20 × 0.70 = 14
            expect(result[1].values[0].value).toBe(14);
        });

        test("should handle percentage increases", () => {
            const composer = new MetricComposer(strengthWorkoutMetrics);
            // Increase all values by 120%
            const increase = new PercentageProgressionInheritance(120);
            const result = composer.compose([increase]);
            
            expect(result[0].values[0].value).toBe(10); // 8 × 1.2 = 9.6, rounded to 10
            expect(result[0].values[1].value).toBe(162); // 135 × 1.2 = 162
        });
    });

    describe("TimeBasedInheritance - Endurance Training Scenarios", () => {
        test("Story: Marathon training pace adjustment", () => {
            const marathonMetrics: RuntimeMetric[] = [
                {
                    sourceId: "long-run",
                    effort: "Long Run",
                    values: [
                        { type: "distance", value: 20, unit: "miles" },
                        { type: "time", value: 9600, unit: "seconds" } // 8:00/mile pace
                    ]
                }
            ];
            
            const composer = new MetricComposer(marathonMetrics);
            // Add 30 seconds per mile for easy pace
            const easyPace = new TimeBasedInheritance(30);
            const result = composer.compose([easyPace]);
            
            // 9600 + (30 × 20 miles) = 10200 seconds
            expect(result[0].values[1].value).toBe(10200);
        });

        test("Story: Interval training progression", () => {
            const intervalMetrics: RuntimeMetric[] = [
                {
                    sourceId: "intervals",
                    effort: "400m Intervals",
                    values: [
                        { type: "distance", value: 400, unit: "meters" },
                        { type: "time", value: 90, unit: "seconds" }
                    ]
                }
            ];
            
            const composer = new MetricComposer(intervalMetrics);
            // Improve by 2 seconds per interval
            const speedWork = new TimeBasedInheritance(-2);
            const result = composer.compose([speedWork]);
            
            // 90 - 2 = 88 seconds
            expect(result[0].values[1].value).toBe(88);
        });

        test("should not affect non-time metrics", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const timeAdjustment = new TimeBasedInheritance(10);
            const result = composer.compose([timeAdjustment]);
            
            // Repetitions should remain unchanged
            expect(result[0].values[0].value).toBe(10);
            expect(result[1].values[0].value).toBe(20);
        });
    });

    describe("Complex Inheritance Chaining - Real Workout Scenarios", () => {
        test("Story: CrossFit WOD with rounds and progressive loading", () => {
            const crossfitMetrics: RuntimeMetric[] = [
                {
                    sourceId: "clean-and-jerk",
                    effort: "Clean and Jerk",
                    values: [
                        { type: "repetitions", value: 3, unit: "reps" },
                        { type: "resistance", value: 155, unit: "lbs" }
                    ]
                },
                {
                    sourceId: "box-jumps",
                    effort: "Box Jumps",
                    values: [
                        { type: "repetitions", value: 10, unit: "reps" }
                    ]
                }
            ];
            
            const composer = new MetricComposer(crossfitMetrics);
            const fiveRounds = new RoundsMetricInheritance(5);
            const progressive = new ProgressiveResistanceInheritance(10, 3);
            
            const result = composer.compose([fiveRounds, progressive]);
            
            // Clean and Jerk: 3 reps × 5 rounds = 15 total reps
            expect(result[0].values[0].value).toBe(15);
            // Weight: 155 + (10 × (3-1)) = 175 lbs
            expect(result[0].values[1].value).toBe(175);
            
            // Box jumps: 10 reps × 5 rounds = 50 total reps
            expect(result[1].values[0].value).toBe(50);
        });

        test("Story: Powerlifting meet prep with percentage and progression", () => {
            const powerliftingMetrics: RuntimeMetric[] = [
                {
                    sourceId: "competition-squat",
                    effort: "Competition Squat",
                    values: [
                        { type: "repetitions", value: 1, unit: "reps" },
                        { type: "resistance", value: 500, unit: "lbs" } // Max attempt
                    ]
                }
            ];
            
            const composer = new MetricComposer(powerliftingMetrics);
            const opener = new PercentageProgressionInheritance(90); // 90% opener
            const warmup = new ProgressiveResistanceInheritance(-50, 1); // Back off 50lbs
            
            const result = composer.compose([opener, warmup]);
            
            // 500 × 0.90 = 450, then 450 - 50 = 400 lbs
            expect(result[0].values[1].value).toBe(400);
        });

        test("Story: Triathlon training with multiple inheritance types", () => {
            const triathlonMetrics: RuntimeMetric[] = [
                {
                    sourceId: "swim",
                    effort: "Swimming",
                    values: [
                        { type: "distance", value: 1000, unit: "meters" },
                        { type: "time", value: 1200, unit: "seconds" }
                    ]
                },
                {
                    sourceId: "bike", 
                    effort: "Cycling",
                    values: [
                        { type: "distance", value: 25, unit: "miles" },
                        { type: "time", value: 3600, unit: "seconds" }
                    ]
                }
            ];
            
            const composer = new MetricComposer(triathlonMetrics);
            const multiSport = new RoundsMetricInheritance(2); // Brick workout
            const paceAdjustment = new TimeBasedInheritance(60); // Add 1 min for transitions
            const volumeIncrease = new PercentageProgressionInheritance(110); // 10% volume increase
            
            const result = composer.compose([multiSport, paceAdjustment, volumeIncrease]);
            
            // Swimming: 1000m × 2 = 2000m, then × 1.1 = 2200m
            expect(result[0].values[0].value).toBe(2200);
            // Swimming time: 1200s × 2 = 2400s, + 60s = 2460s, × 1.1 = 2706s
            expect(result[0].values[1].value).toBe(2706);
        });
    });

    describe("Edge Cases and Error Handling", () => {
        test("should handle inheritance with zero multipliers", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const zeroRounds = new RoundsMetricInheritance(0);
            const result = composer.compose([zeroRounds]);
            
            expect(result[0].values[0].value).toBe(0);
            expect(result[1].values[0].value).toBe(0);
        });

        test("should handle negative percentages", () => {
            const composer = new MetricComposer(basicWorkoutMetrics);
            const negativePercentage = new PercentageProgressionInheritance(-50);
            const result = composer.compose([negativePercentage]);
            
            // Negative percentages should result in 0
            expect(result[0].values[0].value).toBe(0);
            expect(result[1].values[0].value).toBe(0);
        });

        test("should handle very large numbers", () => {
            const largeMetrics: RuntimeMetric[] = [
                {
                    sourceId: "big-number",
                    effort: "Large Value Test",
                    values: [
                        { type: "repetitions", value: 1000000, unit: "reps" }
                    ]
                }
            ];
            
            const composer = new MetricComposer(largeMetrics);
            const doubling = new PercentageProgressionInheritance(200);
            const result = composer.compose([doubling]);
            
            expect(result[0].values[0].value).toBe(2000000);
        });

        test("should handle floating point precision", () => {
            const precisionMetrics: RuntimeMetric[] = [
                {
                    sourceId: "precision-test",
                    effort: "Precision Test",
                    values: [
                        { type: "resistance", value: 100.5, unit: "lbs" }
                    ]
                }
            ];
            
            const composer = new MetricComposer(precisionMetrics);
            const percentage = new PercentageProgressionInheritance(33.33);
            const result = composer.compose([percentage]);
            
            // Should handle floating point calculations properly
            expect(result[0].values[0].value).toBeCloseTo(33.5, 1);
        });
    });

    describe("Custom Inheritance Implementation Tests", () => {
        test("should support custom inheritance implementations", () => {
            class CustomDoubleInheritance implements IMetricInheritance {
                compose(metric: RuntimeMetric): void {
                    for (const value of metric.values) {
                        value.value = value.value * 2;
                    }
                }
            }
            
            const composer = new MetricComposer(basicWorkoutMetrics);
            const customInheritance = new CustomDoubleInheritance();
            const result = composer.compose([customInheritance]);
            
            expect(result[0].values[0].value).toBe(20); // 10 × 2
            expect(result[1].values[0].value).toBe(40); // 20 × 2
        });

        test("should support conditional inheritance", () => {
            class ConditionalInheritance implements IMetricInheritance {
                compose(metric: RuntimeMetric): void {
                    for (const value of metric.values) {
                        if (value.type === "repetitions") {
                            value.value = value.value * 3;
                        }
                    }
                }
            }
            
            const composer = new MetricComposer(strengthWorkoutMetrics);
            const conditionalInheritance = new ConditionalInheritance();
            const result = composer.compose([conditionalInheritance]);
            
            // Repetitions should be tripled
            expect(result[0].values[0].value).toBe(24); // 8 × 3
            expect(result[1].values[0].value).toBe(15); // 5 × 3
            
            // Resistance should remain unchanged
            expect(result[0].values[1].value).toBe(135);
            expect(result[1].values[1].value).toBe(225);
        });
    });
});
