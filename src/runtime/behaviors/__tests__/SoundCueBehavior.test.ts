import { describe, it, expect, afterEach } from 'bun:test';
import { SoundCueBehavior } from '../SoundCueBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('SoundCueBehavior', () => {
    let harness: BehaviorTestHarness;

    afterEach(() => { harness?.dispose(); });

    function setup(cues: any[]) {
        harness = new BehaviorTestHarness().withClock(new Date(1000));
        const behavior = new SoundCueBehavior({ cues });
        const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
        harness.push(block);
        return block;
    }

    describe('mount trigger', () => {
        it('should emit system output for mount trigger sounds', () => {
            const block = setup([{ sound: 'start-beep', trigger: 'mount' }]);
            harness.mount();

            expect(block.recordings.emitOutput).toHaveLength(1);
            expect(block.recordings.emitOutput[0].type).toBe('system');
            expect(block.recordings.emitOutput[0].metrics).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'start-beep',
                        trigger: 'mount'
                    })
                ])
            );
        });

        it('should not emit events (only outputs)', () => {
            const block = setup([{ sound: 'start-beep', trigger: 'mount' }]);
            harness.mount();

            expect(block.recordings.emitEvent).toHaveLength(0);
        });

        it('should not emit for non-mount triggers during mount', () => {
            const block = setup([
                { sound: 'complete-chime', trigger: 'complete' },
                { sound: 'unmount-beep', trigger: 'unmount' }
            ]);
            harness.mount();

            expect(block.recordings.emitOutput).toHaveLength(0);
        });
    });

    describe('countdown trigger', () => {
        it('should subscribe to tick events for countdown cues', () => {
            const block = setup([{ sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }]);
            harness.mount();

            const tickSubs = block.recordings.subscribe.filter(s => s.eventType === 'tick');
            expect(tickSubs).toHaveLength(1);
            expect(tickSubs[0].options?.scope).toBe('bubble');
        });

        it('should not subscribe to tick when no countdown cues', () => {
            const block = setup([{ sound: 'start-beep', trigger: 'mount' }]);
            harness.mount();

            const tickSubs = block.recordings.subscribe.filter(s => s.eventType === 'tick');
            expect(tickSubs).toHaveLength(0);
        });
    });

    describe('unmount/complete trigger', () => {
        it('should emit system output for complete trigger on unmount', () => {
            const block = setup([{ sound: 'complete-chime', trigger: 'complete' }]);
            harness.mount();
            harness.unmount();

            const completeCalls = block.recordings.emitOutput.filter(o =>
                o.metrics.some((m: any) => m.sound === 'complete-chime')
            );
            expect(completeCalls).toHaveLength(1);
            expect(completeCalls[0].type).toBe('system');
        });

        it('should emit system output for unmount trigger on unmount', () => {
            const block = setup([{ sound: 'unmount-beep', trigger: 'unmount' }]);
            harness.mount();
            harness.unmount();

            const unmountCalls = block.recordings.emitOutput.filter(o =>
                o.metrics.some((m: any) => m.sound === 'unmount-beep')
            );
            expect(unmountCalls).toHaveLength(1);
            expect(unmountCalls[0].type).toBe('system');
        });

        it('should emit multiple sound outputs if multiple cues match', () => {
            const block = setup([
                { sound: 'complete-chime', trigger: 'complete' },
                { sound: 'unmount-beep', trigger: 'unmount' }
            ]);
            harness.mount();
            harness.unmount();

            const unmountOutputs = block.recordings.emitOutput.filter(o =>
                o.metrics.some((m: any) => m.trigger === 'complete' || m.trigger === 'unmount')
            );
            expect(unmountOutputs).toHaveLength(2);
        });

        it('should not emit mount triggers during unmount', () => {
            const block = setup([{ sound: 'start-beep', trigger: 'mount' }]);
            harness.mount();
            // Clear mount recordings to isolate unmount behavior
            const mountOutputCount = block.recordings.emitOutput.length;
            harness.unmount();

            // No new outputs beyond what mount produced
            expect(block.recordings.emitOutput.length).toBe(mountOutputCount);
        });
    });

    describe('onNext', () => {
        it('should return no actions on next', () => {
            const block = setup([{ sound: 'beep', trigger: 'mount' }]);
            harness.mount();
            const actions = harness.next();
            expect(actions).toEqual([]);
        });
    });

    describe('rest block sound cues', () => {
        it('should support rest-over complete cue', () => {
            const block = setup([
                { sound: 'rest-over', trigger: 'complete' },
                { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] }
            ]);
            harness.mount();
            harness.unmount();

            const restOverCalls = block.recordings.emitOutput.filter(o =>
                o.metrics.some((m: any) => m.sound === 'rest-over')
            );
            expect(restOverCalls).toHaveLength(1);
            expect(restOverCalls[0].type).toBe('system');
        });
    });
});
