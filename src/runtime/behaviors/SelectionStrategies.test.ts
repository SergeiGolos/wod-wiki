import { describe, it, expect, beforeEach } from 'vitest';
import { 
    RepeatingRepsStrategy,
    RepeatingTimedStrategy,
    RepeatingCountdownStrategy,
    TimerStrategy,
    RoundsStrategy,
    CountdownStrategy,
    EffortStrategy
} from '../strategies';
import { RuntimeMetric } from '../RuntimeMetric';
import { ScriptRuntimeWithMemory } from '../ScriptRuntimeWithMemory';
import { RepeatingRepsBlock } from '../blocks/RepeatingRepsBlock';
import { RepeatingTimedBlock } from '../blocks/RepeatingTimedBlock';
import { RepeatingCountdownBlock } from '../blocks/RepeatingCountdownBlock';
import { TimerBlock } from '../blocks/TimerBlock';
import { RepeatingBlock } from '../blocks/RepeatingBlock';
import { CountdownParentBlock } from '../blocks/CountdownParentBlock';
import { EffortBlock } from '../blocks/EffortBlock';

describe('Selection Strategy Priority', () => {
    let runtime: ScriptRuntimeWithMemory;

    beforeEach(() => {
        runtime = new ScriptRuntimeWithMemory();
    });

    describe('RepeatingRepsStrategy', () => {
        it('should select when rounds > 1 AND repetitions present', () => {
            const strategy = new RepeatingRepsStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'repetitions', value: 10, unit: 'reps' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(RepeatingRepsBlock);
        });

        it('should not select when rounds <= 1', () => {
            const strategy = new RepeatingRepsStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 1, unit: 'rounds' },
                        { type: 'repetitions', value: 10, unit: 'reps' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });

        it('should not select when repetitions not present', () => {
            const strategy = new RepeatingRepsStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });
    });

    describe('RepeatingTimedStrategy', () => {
        it('should select when rounds > 1 AND time > 0', () => {
            const strategy = new RepeatingTimedStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: 30000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(RepeatingTimedBlock);
        });

        it('should not select when time <= 0', () => {
            const strategy = new RepeatingTimedStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: -30000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });
    });

    describe('RepeatingCountdownStrategy', () => {
        it('should select when rounds > 1 AND time < 0', () => {
            const strategy = new RepeatingCountdownStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: -60000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(RepeatingCountdownBlock);
        });

        it('should not select when time >= 0', () => {
            const strategy = new RepeatingCountdownStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: 30000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });
    });

    describe('TimerStrategy', () => {
        it('should select when time > 0 AND NOT rounds > 1', () => {
            const strategy = new TimerStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'time', value: 30000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(TimerBlock);
        });

        it('should not select when rounds > 1', () => {
            const strategy = new TimerStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'time', value: 30000, unit: 'ms' },
                        { type: 'rounds', value: 3, unit: 'rounds' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });

        it('should not select when time <= 0', () => {
            const strategy = new TimerStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'time', value: -30000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });
    });

    describe('RoundsStrategy', () => {
        it('should select when rounds > 1 AND NOT time < 0', () => {
            const strategy = new RoundsStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(RepeatingBlock);
        });

        it('should not select when countdown timer present', () => {
            const strategy = new RoundsStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: -60000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });
    });

    describe('CountdownStrategy', () => {
        it('should select when time < 0', () => {
            const strategy = new CountdownStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'time', value: -60000, unit: 'ms' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(CountdownParentBlock);
        });
    });

    describe('EffortStrategy', () => {
        it('should always select (fallback)', () => {
            const strategy = new EffortStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'effort', value: 1, unit: 'effort' }
                    ]
                }
            ];

            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(EffortBlock);
        });
    });

    describe('Strategy Priority Order', () => {
        it('should prioritize RepeatingCountdownStrategy over CountdownStrategy', () => {
            const repeatingCountdownStrategy = new RepeatingCountdownStrategy();
            const countdownStrategy = new CountdownStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: -60000, unit: 'ms' }
                    ]
                }
            ];

            // RepeatingCountdownStrategy should match
            const repeatingResult = repeatingCountdownStrategy.compile(metrics, runtime);
            expect(repeatingResult).toBeInstanceOf(RepeatingCountdownBlock);

            // CountdownStrategy should also match, but would be lower priority
            const countdownResult = countdownStrategy.compile(metrics, runtime);
            expect(countdownResult).toBeInstanceOf(CountdownParentBlock);
        });

        it('should prioritize RepeatingTimedStrategy over TimerStrategy', () => {
            const repeatingTimedStrategy = new RepeatingTimedStrategy();
            const timerStrategy = new TimerStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: 30000, unit: 'ms' }
                    ]
                }
            ];

            // RepeatingTimedStrategy should match
            const repeatingResult = repeatingTimedStrategy.compile(metrics, runtime);
            expect(repeatingResult).toBeInstanceOf(RepeatingTimedBlock);

            // TimerStrategy should not match due to rounds > 1
            const timerResult = timerStrategy.compile(metrics, runtime);
            expect(timerResult).toBeUndefined();
        });

        it('should prioritize specific strategies over generic ones', () => {
            const repeatingRepsStrategy = new RepeatingRepsStrategy();
            const roundsStrategy = new RoundsStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'repetitions', value: 10, unit: 'reps' }
                    ]
                }
            ];

            // RepeatingRepsStrategy should match (more specific)
            const repsResult = repeatingRepsStrategy.compile(metrics, runtime);
            expect(repsResult).toBeInstanceOf(RepeatingRepsBlock);

            // RoundsStrategy should also match, but would be lower priority
            const roundsResult = roundsStrategy.compile(metrics, runtime);
            expect(roundsResult).toBeInstanceOf(RepeatingBlock);
        });
    });
});