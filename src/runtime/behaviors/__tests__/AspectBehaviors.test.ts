import { describe, expect, it, afterEach } from 'bun:test';
import { CountdownTimerBehavior } from '../CountdownTimerBehavior';
import { CountupTimerBehavior } from '../CountupTimerBehavior';
import { LabelingBehavior } from '../LabelingBehavior';
import { ButtonBehavior } from '../ButtonBehavior';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('Time Aspect Behaviors', () => {
    let harness: BehaviorTestHarness;
    afterEach(() => { harness?.dispose(); });

    describe('CountdownTimerBehavior', () => {
        it('should initialize timer state on mount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new CountdownTimerBehavior({ durationMs: 30000, label: 'Work Timer' });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const timePush = block.recordings.pushMemory.find(p => p.tag === 'time');
            expect(timePush).toBeDefined();
            expect(timePush!.metrics).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({
                        direction: 'down',
                        durationMs: 30000,
                        label: 'Work Timer'
                    })
                })
            ]));
        });

        it('should initialize timer memory with open span (signals timer started)', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new CountupTimerBehavior();
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const timePush = block.recordings.pushMemory.find(p => p.tag === 'time');
            expect(timePush).toBeDefined();
            expect(timePush!.metrics).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({
                        direction: 'up',
                        spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })])
                    })
                })
            ]));
            // No event emission - timer start is implicit from memory
            expect(block.recordings.emitEvent).toHaveLength(0);
        });
    });

    describe('CountdownTimerBehavior completion', () => {
        it('should subscribe to tick events', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new CountdownTimerBehavior({ durationMs: 30000, mode: 'complete-block' });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            expect(block.recordings.subscribe.some(s => s.eventType === 'tick')).toBe(true);
        });
    });
});

describe('Display Aspect Behaviors', () => {
    let harness: BehaviorTestHarness;
    afterEach(() => { harness?.dispose(); });

    describe('LabelingBehavior', () => {
        it('should initialize display state', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new LabelingBehavior({ mode: 'countdown', label: 'Rest' });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const displayPush = block.recordings.pushMemory.find(p => p.tag === 'display');
            expect(displayPush).toBeDefined();
            expect(displayPush!.metrics).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Rest', role: 'label' })
                })
            ]));
        });

        it('should use block label as default', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new LabelingBehavior();
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const displayPush = block.recordings.pushMemory.find(p => p.tag === 'display');
            expect(displayPush).toBeDefined();
            expect(displayPush!.metrics).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Test Block' })
                })
            ]));
        });
    });
});

describe('Controls Aspect Behaviors', () => {
    let harness: BehaviorTestHarness;
    afterEach(() => { harness?.dispose(); });

    describe('ButtonBehavior', () => {
        it('should set controls memory on mount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new ButtonBehavior({
                buttons: [
                    { id: 'next', label: 'Next', variant: 'primary', visible: true, enabled: true }
                ]
            });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const controlsPush = block.recordings.pushMemory.find(p => p.tag === 'controls');
            expect(controlsPush).toBeDefined();
            expect(controlsPush!.metrics).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ id: 'next' })
                })
            ]));
            expect(block.recordings.emitEvent).toHaveLength(0);
        });

        it('should clear controls memory on unmount', () => {
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new ButtonBehavior({ buttons: [] });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();
            harness.unmount();

            expect(block.recordings.updateMemory.some(u => u.tag === 'controls' && u.metrics.length === 0)).toBe(true);
            expect(block.recordings.emitEvent).toHaveLength(0);
        });
    });
});

describe('Output Aspect Behaviors', () => {
    let harness: BehaviorTestHarness;
    afterEach(() => { harness?.dispose(); });

    describe('SoundCueBehavior', () => {
        it('should emit sound output on mount for mount triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            const systemOutputs = block.recordings.emitOutput.filter(o => o.type === 'system');
            expect(systemOutputs).toHaveLength(1);
            expect(systemOutputs[0].metrics).toEqual(expect.arrayContaining([
                expect.objectContaining({ sound: 'start-beep', trigger: 'mount' })
            ]));
            expect(block.recordings.emitEvent).toHaveLength(0);
        });

        it('should subscribe to tick for countdown cues', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }]
            });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            expect(block.recordings.subscribe.some(s => s.eventType === 'tick')).toBe(true);
        });

        it('should emit sound output on unmount for complete triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'complete-chime', trigger: 'complete' }]
            });
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();
            harness.unmount();

            const systemOutputs = block.recordings.emitOutput.filter(o => o.type === 'system');
            expect(systemOutputs).toHaveLength(1);
            expect(systemOutputs[0].metrics).toEqual(expect.arrayContaining([
                expect.objectContaining({ sound: 'complete-chime', trigger: 'complete' })
            ]));
            expect(block.recordings.emitEvent).toHaveLength(0);
        });
    });

    describe('CountupTimerBehavior pause/resume', () => {
        it('should subscribe to pause and resume events', async () => {
            const { CountupTimerBehavior: CB } = await import('../CountupTimerBehavior');
            harness = new BehaviorTestHarness().withClock(new Date(1000));
            const behavior = new CB();
            const block = new MockBlock('test-block', [behavior], { label: 'Test Block' });
            harness.push(block);
            harness.mount();

            expect(block.recordings.subscribe).toHaveLength(2);
        });
    });
});
