import { describe, it, expect } from 'bun:test';
import { ProxyBlock } from '../ProxyBlock';
import { SerializedBlock, SerializedTimer } from '../RpcMessages';
import { ICodeFragment } from '@/core/models/CodeFragment';

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

    describe('display fragments', () => {
        it('should return empty for no display fragments', () => {
            const block = new ProxyBlock(createSerializedBlock({ displayFragments: [] }));
            const locations = block.getFragmentMemoryByVisibility('display');
            expect(locations).toHaveLength(0);
        });

        it('should return memory locations for display fragments', () => {
            const fragments: ICodeFragment[][] = [
                [{ type: 'text', image: 'Run' } as any],
                [{ type: 'timer', image: '10:00' } as any],
            ];
            const block = new ProxyBlock(createSerializedBlock({ displayFragments: fragments }));

            const locations = block.getFragmentMemoryByVisibility('display');
            expect(locations).toHaveLength(2);
            expect(locations[0].fragments).toHaveLength(1);
            expect(locations[0].fragments[0].image).toBe('Run');
            expect(locations[1].fragments[0].image).toBe('10:00');
        });

        it('should return empty for non-display visibility', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text' } as any]],
            }));
            expect(block.getFragmentMemoryByVisibility('output' as any)).toHaveLength(0);
        });

        it('should return display via getMemoryByTag fragment:display', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text' } as any]],
            }));
            expect(block.getMemoryByTag('fragment:display')).toHaveLength(1);
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
            expect(timerLocations[0].fragments.length).toBeGreaterThan(0);
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

    describe('memory location (static)', () => {
        it('subscribe should return no-op unsubscribe', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text' } as any]],
            }));
            const locations = block.getFragmentMemoryByVisibility('display');
            const unsub = locations[0].subscribe(() => {});
            expect(typeof unsub).toBe('function');
            expect(() => unsub()).not.toThrow();
        });

        it('update should be no-op', () => {
            const block = new ProxyBlock(createSerializedBlock({
                displayFragments: [[{ type: 'text', image: 'Run' } as any]],
            }));
            const loc = block.getFragmentMemoryByVisibility('display')[0];
            loc.update([{ type: 'text', image: 'Changed' } as any]);
            // Should not change since it's static
            expect(loc.fragments[0].image).toBe('Run');
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

        it("getMemoryByTag('time') returns TimerState via fragment value when timer present", () => {
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

            const state = locs[0]!.fragments[0]!.value as any;
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
            expect((locs[0]!.fragments[0]!.value as any).direction).toBe('up');
        });

        it('no timer means getMemoryByTag returns empty array', () => {
            const block = new ProxyBlock(createSerializedBlock());
            expect(block.getMemoryByTag('time' as any)).toHaveLength(0);
        });
    });
});
