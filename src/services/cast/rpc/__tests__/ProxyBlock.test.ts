import { describe, it, expect } from 'bun:test';
import { ProxyBlock } from '../ProxyBlock';
import { SerializedBlock, SerializedTimer } from '../RpcMessages';
import { IMetric } from '@/core/models/Metric';

function createSerializedBlock(overrides?: Partial<SerializedBlock>): SerializedBlock {
    return {
        key: 'test-block',
        blockType: 'Timer',
        label: 'Run',
        sourceIds: [1, 2],
        isComplete: false,
        displayFragments: [],
        timer: null,
        ...overrides,
    };
}

describe('ProxyBlock', () => {
    describe('identity', () => {
        it('should expose key as BlockKey', () => {
            const block = new ProxyBlock(createSerializedBlock({ key: 'my-key' }));
            expect(block.key.toString()).toBe('my-key');
        });

        it('should expose blockType', () => {
            const block = new ProxyBlock(createSerializedBlock({ blockType: 'Rep' }));
            expect(block.blockType).toBe('Rep');
        });

        it('should expose label', () => {
            const block = new ProxyBlock(createSerializedBlock({ label: 'Push-ups' }));
            expect(block.label).toBe('Push-ups');
        });

        it('should expose sourceIds', () => {
            const block = new ProxyBlock(createSerializedBlock({ sourceIds: [3, 4, 5] }));
            expect(block.sourceIds).toEqual([3, 4, 5]);
        });

        it('should expose isComplete', () => {
            const complete = new ProxyBlock(createSerializedBlock({ isComplete: true, completionReason: 'timer-expired' }));
            expect(complete.isComplete).toBe(true);
            expect(complete.completionReason).toBe('timer-expired');

            const incomplete = new ProxyBlock(createSerializedBlock({ isComplete: false }));
            expect(incomplete.isComplete).toBe(false);
        });
    });

    describe('display metrics', () => {
        it('should return empty for no display metric', () => {
            const block = new ProxyBlock(createSerializedBlock({ displayFragments: [] }));
            const locations = block.getMetricMemoryByVisibility('display');
            expect(locations).toHaveLength(0);
        });

        it('should return memory locations for display metrics', () => {
            const metrics: IMetric[][] = [
                [{ type: 'text', image: 'Run' } as any],
                [{ type: 'timer', image: '10:00' } as any],
            ];
            const block = new ProxyBlock(createSerializedBlock({ displayFragments: metrics }));

            const locations = block.getMetricMemoryByVisibility('display');
            expect(locations).toHaveLength(2);
            expect(locations[0].metrics).toHaveLength(1);
            expect(locations[0].metrics[0].image).toBe('Run');
            expect(locations[1].metrics[0].image).toBe('10:00');
        });

        it('should return empty for non-display visibility', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text' } as any]],
            }));
            expect(block.getMetricMemoryByVisibility('output' as any)).toHaveLength(0);
        });

        it('should return display via getMemoryByTag metrics:display', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text' } as any]],
            }));
            expect(block.getMemoryByTag('metric:display')).toHaveLength(1);
        });
    });

    describe('timer memory', () => {
        it('should return empty timer when null', () => {
            const block = new ProxyBlock(createSerializedBlock({ timer: null }));
            expect(block.getMemoryByTag('timer')).toHaveLength(0);
        });

        it('should return timer memory location when timer present', () => {
            const timer: SerializedTimer = {
                format: 'mm:ss',
                durationMs: 60000,
                direction: 'down',
                spans: [{ started: 1000 }],
                isRunning: true,
            };
            const block = new ProxyBlock(createSerializedBlock({ timer }));

            const timerLocations = block.getMemoryByTag('time');
            expect(timerLocations).toHaveLength(1);
            expect(timerLocations[0].metrics.length).toBeGreaterThan(0);
        });

        it('should include timer in getAllMemory', () => {
            const timer: SerializedTimer = {
                format: 'mm:ss',
                durationMs: 60000,
                direction: 'down',
                spans: [],
                isRunning: false,
            };
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text' } as any]],
                timer,
            }));

            const all = block.getAllMemory();
            // 1 display location + 1 timer location
            expect(all).toHaveLength(2);
        });
    });

    describe('memory location (reactive)', () => {
        it('subscribe should receive future updates', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Run' } as any]],
            }));
            const locations = block.getMetricMemoryByVisibility('display');
            const received: IMetric[][] = [];
            const unsub = locations[0].subscribe((nv) => received.push(nv));

            // Trigger an update via ProxyBlock.update()
            block.update(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Changed' } as any]],
            }));

            expect(received).toHaveLength(1);
            expect(received[0][0].image).toBe('Changed');

            unsub();
        });

        it('update() should update metrics content in-place', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Run' } as any]],
            }));
            const loc = block.getMetricMemoryByVisibility('display')[0];

            block.update(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Changed' } as any]],
            }));

            expect(loc.metrics[0].image).toBe('Changed');
        });

        it('unsubscribe should stop receiving updates', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Run' } as any]],
            }));
            const locations = block.getMetricMemoryByVisibility('display');
            const received: IMetric[][] = [];
            const unsub = locations[0].subscribe((nv) => received.push(nv));
            unsub();

            block.update(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Changed' } as any]],
            }));

            expect(received).toHaveLength(0);
        });
    });

    describe('promote / result / private metrics tiers', () => {
        it('should return promote metric via getMetricMemoryByVisibility', () => {
            const block = new ProxyBlock(createSerializedBlock({
                promoteFragments: [[{ type: 'reps', image: '21' } as any]],
            }));
            const locs = block.getMetricMemoryByVisibility('promote');
            expect(locs).toHaveLength(1);
            expect(locs[0].metrics[0].image).toBe('21');
        });

        it('should return result metrics via getMetricMemoryByVisibility', () => {
            const block = new ProxyBlock(createSerializedBlock({
                resultFragments: [[{ type: 'time', image: '5:00' } as any]],
            }));
            const locs = block.getMetricMemoryByVisibility('result');
            expect(locs).toHaveLength(1);
            expect(locs[0].metrics[0].image).toBe('5:00');
        });

        it('should return private metrics via getMetricMemoryByVisibility', () => {
            const block = new ProxyBlock(createSerializedBlock({
                privateFragments: {
                    'metric:label': [[{ type: 'label', image: 'Round 1' } as any]],
                } as any,
            }));
            const locs = block.getMetricMemoryByVisibility('private');
            expect(locs).toHaveLength(1);
            expect(locs[0].metrics[0].image).toBe('Round 1');
        });

        it('should return private metrics via getMemoryByTag with private tag', () => {
            const block = new ProxyBlock(createSerializedBlock({
                privateFragments: {
                    'metric:label': [[{ type: 'label', image: 'MyLabel' } as any]],
                } as any,
            }));
            const locs = block.getMemoryByTag('metric:label' as any);
            expect(locs).toHaveLength(1);
            expect(locs[0].metrics[0].image).toBe('MyLabel');
        });

        it('getAllMemory should include all tiers plus timer and next', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Run' } as any]],
                promoteFragments: [[{ type: 'reps', image: '21' } as any]],
                resultFragments: [[{ type: 'time', image: '5:00' } as any]],
                privateFragments: {
                    'metric:label': [[{ type: 'label', image: 'L' } as any]],
                } as any,
                timer: {
                    format: 'mm:ss',
                    direction: 'down',
                    spans: [],
                    isRunning: false,
                    durationMs: 60000,
                },
                nextFragments: [{ type: 'effort', image: 'Squats' } as any],
            }));

            const all = block.getAllMemory();
            // display(1) + promote(1) + result(1) + private(1) + timer(1) + next(1) = 6
            expect(all).toHaveLength(6);
        });

        it('should update promote tier in-place on update()', () => {
            const block = new ProxyBlock(createSerializedBlock({
                promoteFragments: [[{ type: 'reps', image: '21' } as any]],
            }));
            const locs = block.getMetricMemoryByVisibility('promote');
            const received: IMetric[][] = [];
            locs[0].subscribe(nv => received.push(nv));

            block.update(createSerializedBlock({
                promoteFragments: [[{ type: 'reps', image: '15' } as any]],
            }));

            expect(received).toHaveLength(1);
            expect(received[0][0].image).toBe('15');
        });
    });

    describe('behavior metadata', () => {
        it('should expose empty behaviors array when no metadata', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.behaviors).toHaveLength(0);
        });

        it('should expose stub behaviors with correct names', () => {
            const block = new ProxyBlock(createSerializedBlock({
                behaviorsMetadata: [
                    { name: 'CountdownTimerBehavior' },
                    { name: 'RepSchemeBehavior' },
                ],
            }));
            expect(block.behaviors).toHaveLength(2);
            expect(block.behaviors[0].constructor.name).toBe('StubBehavior');
            // Names are stored on the stub
            expect((block.behaviors[0] as any).name).toBe('CountdownTimerBehavior');
            expect((block.behaviors[1] as any).name).toBe('RepSchemeBehavior');
        });

        it('should update behaviors on update()', () => {
            const block = new ProxyBlock(createSerializedBlock({
                behaviorsMetadata: [{ name: 'OldBehavior' }],
            }));
            expect(block.behaviors).toHaveLength(1);

            block.update(createSerializedBlock({
                behaviorsMetadata: [{ name: 'NewBehavior1' }, { name: 'NewBehavior2' }],
            }));

            expect(block.behaviors).toHaveLength(2);
            expect((block.behaviors[0] as any).name).toBe('NewBehavior1');
        });
    });

    describe('update() in-place reactivity', () => {
        it('should update isComplete in-place', () => {
            const block = new ProxyBlock(createSerializedBlock({ isComplete: false }));
            expect(block.isComplete).toBe(false);

            block.update(createSerializedBlock({ isComplete: true, completionReason: 'timer-expired' }));

            expect(block.isComplete).toBe(true);
            expect(block.completionReason).toBe('timer-expired');
        });

        it('should update timer location in-place and fire subscribers', () => {
            const timer: SerializedTimer = {
                format: 'mm:ss',
                direction: 'down',
                spans: [{ started: 1000 }],
                isRunning: true,
                durationMs: 60000,
            };
            const block = new ProxyBlock(createSerializedBlock({ timer }));
            const timerLocs = block.getMemoryByTag('time' as any);
            const received: IMetric[][] = [];
            timerLocs[0].subscribe(nv => received.push(nv));

            block.update(createSerializedBlock({
                timer: { ...timer, spans: [{ started: 1000, ended: 5000 }], isRunning: false },
            }));

            expect(received).toHaveLength(1);
            const state = received[0][0].value as any;
            expect(state.spans[0].ended).toBe(5000);
        });

        it('should update next-preview in-place and fire subscribers', () => {
            const block = new ProxyBlock(createSerializedBlock({
                nextFragments: [{ type: 'effort', image: 'Run' } as any],
            }));
            const nextLocs = block.getMemoryByTag('metric:next' as any);
            const received: IMetric[][] = [];
            nextLocs[0].subscribe(nv => received.push(nv));

            block.update(createSerializedBlock({
                nextFragments: [{ type: 'effort', image: 'Bike' } as any],
            }));

            expect(received).toHaveLength(1);
            expect(received[0][0].image).toBe('Bike');
        });

        it('should grow display locations when count increases', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Row1' } as any]],
            }));
            expect(block.getMetricMemoryByVisibility('display')).toHaveLength(1);

            block.update(createSerializedBlock({
                displayFragments: [
                    [{ type: 'text', image: 'Row1' } as any],
                    [{ type: 'text', image: 'Row2' } as any],
                ],
            }));

            expect(block.getMetricMemoryByVisibility('display')).toHaveLength(2);
        });

        it('should shrink display locations when count decreases', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [
                    [{ type: 'text', image: 'Row1' } as any],
                    [{ type: 'text', image: 'Row2' } as any],
                ],
            }));
            expect(block.getMetricMemoryByVisibility('display')).toHaveLength(2);

            block.update(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Row1' } as any]],
            }));

            expect(block.getMetricMemoryByVisibility('display')).toHaveLength(1);
        });
    });

    describe('lifecycle (no-ops)', () => {
        it('mount should return empty actions', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.mount({} as any)).toEqual([]);
        });

        it('next should return empty actions', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.next({} as any)).toEqual([]);
        });

        it('unmount should return empty actions', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.unmount({} as any)).toEqual([]);
        });

        it('dispose should not throw', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(() => block.dispose({} as any)).not.toThrow();
        });

        it('markComplete should not throw', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(() => block.markComplete('test')).not.toThrow();
        });

        it('getBehavior should return undefined', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.getBehavior(class {} as any)).toBeUndefined();
        });

        it('pushMemory should not throw', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(() => block.pushMemory({} as any)).not.toThrow();
        });
    });

    describe('memory API', () => {
        it('getMemoryByTag returns empty when no timer', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.getMemoryByTag('time' as any)).toHaveLength(0);
        });

        it("getMemoryByTag('time') returns TimerState via metrics value when timer present", () => {
            const timer: SerializedTimer = {
                format: 'mm:ss',
                durationMs: 60000,
                direction: 'down',
                label: 'AMRAP',
                spans: [{ started: 1000, ended: undefined }],
                isRunning: true,
            };
            const block = new ProxyBlock(createSerializedBlock({ timer }));

            const locs = block.getMemoryByTag('time' as any);
            expect(locs).toHaveLength(1);

            const state = locs[0]!.metrics[0]!.value as any;
            expect(state.direction).toBe('down');
            expect(state.durationMs).toBe(60000);
            expect(state.label).toBe('AMRAP');
            expect(state.spans).toHaveLength(1);
            expect(state.spans[0].started).toBe(1000);
            expect(state.spans[0].ended).toBeUndefined();
        });

        it("getMemoryByTag('time') returns TimerState with direction when timer present", () => {
            const timer: SerializedTimer = {
                format: 'up',
                direction: 'up',
                spans: [{ started: 5000 }],
                isRunning: true,
            };
            const block = new ProxyBlock(createSerializedBlock({ timer }));
            const locs = block.getMemoryByTag('time' as any);
            expect(locs).toHaveLength(1);
            expect((locs[0]!.metrics[0]!.value as any).direction).toBe('up');
        });

        it('no timer means getMemoryByTag returns empty array', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.getMemoryByTag('time' as any)).toHaveLength(0);
        });
    });
});
