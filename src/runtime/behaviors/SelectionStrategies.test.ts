import { describe, it, expect, beforeEach } from 'vitest';
import { 
    BoundedLoopingParentStrategy,
    TimeBoundedLoopingStrategy,
    TimeBoundStrategy,
    BoundedLoopingStrategy,
    CountdownStrategy,
    EffortStrategy
} from '../strategies';
import { RuntimeMetric } from '../RuntimeMetric';
import { ScriptRuntime } from "../ScriptRuntime";
import { BoundedLoopingParentBlock } from '../blocks/BoundedLoopingParentBlock';
import { TimeBoundedLoopingBlock } from '../blocks/TimeBoundedLoopingBlock';
import { TimeBoundBlock } from '../blocks/TimeBoundBlock';
import { BoundedLoopingBlock } from '../blocks/BoundedLoopingBlock';
import { CountdownParentBlock } from '../blocks/CountdownParentBlock';
import { EffortBlock } from '../blocks/EffortBlock';

describe('Selection Strategy Priority', () => {
    let runtime: ScriptRuntime;

    beforeEach(() => {
        runtime = new ScriptRuntime();
    });

    describe('BoundedLoopingParentStrategy', () => {
        it('should select when rounds > 1 AND repetitions present', () => {
            const strategy = new BoundedLoopingParentStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'repetitions', value: 21, unit: 'reps' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(BoundedLoopingParentBlock);
        });

        it('should not select when rounds <= 1', () => {
            const strategy = new BoundedLoopingParentStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 1, unit: 'rounds' },
                        { type: 'repetitions', value: 21, unit: 'reps' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });

        it('should not select when repetitions not present', () => {
            const strategy = new BoundedLoopingParentStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });
    });

    describe('TimeBoundedLoopingStrategy', () => {
        it('should select when rounds > 1 AND time > 0', () => {
            const strategy = new TimeBoundedLoopingStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' },
                        { type: 'time', value: 60000, unit: 'ms' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(TimeBoundedLoopingBlock);
        });

        it('should not select when time <= 0', () => {
            const strategy = new TimeBoundedLoopingStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
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

    describe('TimeBoundStrategy', () => {
        it('should select when time > 0 AND NOT rounds > 1', () => {
            const strategy = new TimeBoundStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'time', value: 60000, unit: 'ms' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(TimeBoundBlock);
        });

        it('should not select when rounds > 1', () => {
            const strategy = new TimeBoundStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'time', value: 60000, unit: 'ms' },
                        { type: 'rounds', value: 3, unit: 'rounds' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });

        it('should not select when time <= 0', () => {
            const strategy = new TimeBoundStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'time', value: -60000, unit: 'ms' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeUndefined();
        });
    });

    describe('BoundedLoopingStrategy', () => {
        it('should select when rounds > 1 AND NOT time AND NOT repetitions', () => {
            const strategy = new BoundedLoopingStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'rounds', value: 3, unit: 'rounds' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(BoundedLoopingBlock);
        });

        it('should not select when countdown timer present', () => {
            const strategy = new BoundedLoopingStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
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

    describe('EffortStrategy', () => {
        it('should always select as the default strategy', () => {
            const strategy = new EffortStrategy();
            
            const metrics: RuntimeMetric[] = [
                {
                    sourceId: 'test-source',
                    values: [
                        { type: 'action', value: 'pushups', unit: '' }
                    ]
                }
            ];
            
            const result = strategy.compile(metrics, runtime);
            expect(result).toBeInstanceOf(EffortBlock);
        });
    });
});