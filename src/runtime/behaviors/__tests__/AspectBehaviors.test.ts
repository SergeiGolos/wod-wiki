import { describe, expect, it, vi } from 'bun:test';
import { TimerBehavior } from '../TimerBehavior';
import { TimerEndingBehavior } from '../TimerEndingBehavior';
import { ReEntryBehavior } from '../ReEntryBehavior';
import { RoundsEndBehavior } from '../RoundsEndBehavior';
import { LabelingBehavior } from '../LabelingBehavior';
import { LeafExitBehavior } from '../LeafExitBehavior';
import { ButtonBehavior } from '../ButtonBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMemoryLocation, MemoryTag, MemoryLocation } from '../../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryLocations: IMemoryLocation[] = [];

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            getMemoryByTag: (tag: MemoryTag) => memoryLocations.filter(l => l.tag === tag),
            pushMemory: (loc: IMemoryLocation) => memoryLocations.push(loc),
            getAllMemory: () => [...memoryLocations],
            getBehavior: () => undefined,
        },
        clock: { now: new Date(1000) }, // 1 second epoch
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => {
            const locs = memoryLocations.filter(l => l.tag === type);
            if (locs.length > 0 && locs[0].fragments.length > 0) {
                return locs[0].fragments[0].value;
            }
            return undefined;
        }),
        setMemory: vi.fn(),
        pushMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
        }),
        updateMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const locs = memoryLocations.filter(l => l.tag === tag);
            if (locs.length > 0) {
                locs[0].update(fragments);
            } else {
                memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
            }
        }),
        ...overrides
    } as unknown as IBehaviorContext;
}

describe('Time Aspect Behaviors', () => {
    describe('TimerBehavior', () => {
        it('should initialize timer state on mount', () => {
             const ctx = createMockContext();
            const behavior = new TimerBehavior({
                direction: 'down',
                durationMs: 30000,
                label: 'Work Timer'
            });

            behavior.onMount(ctx);

            expect(ctx. import { describe, expect, it, vi } from 'bun:test';
import { TimerBehavior } from '../TimerBehavior';
import { TimerEndingBehavior } from '../TimerEndingBehavior';
import { ReEntryBehavior } from '../ReEntryBehavior';
import { RoundsEndBehavior } from '../RoundsEndBehavior';
import { LabelingBehavior } from '../LabelingBehavior';
import { LeafExitBehavior } from '../LeafExitBehavior';
import { ButtonBehavior } from '../ButtonBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMemoryLocation, MemoryTag, MemoryLocation } from '../../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryLocations: IMemoryLocation[] = [];

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            getMemoryByTag: (tag: MemoryTag) => memoryLocations.filter(l => l.tag === tag),
            pushMemory: (loc: IMemoryLocation) => memoryLocations.push(loc),
            getAllMemory: () => [...memoryLocations],
            getBehavior: () => undefined,
        },
        clock: { now: new Date(1000) }, // 1 second epoch
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => {
            const locs = memoryLocations.filter(l => l.tag === type);
            if (locs.length > 0 && locs[0].fragments.length > 0) {
                return locs[0].fragments[0].value;
            }
            return undefined;
        }),
        setMemory: vi.fn(),
        pushMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
        }),
        updateMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const locs = memoryLocations.filter(l => l.tag === tag);
            if (locs.length > 0) {
                locs[0].update(fragments);
            } else {
                memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
            }
        }),
        ...overrides
    } as unknown as IBehaviorContext;
}

describe('Time Aspect Behaviors', () => {
    describe('TimerBehavior', () => {
        it('should initialize timer state on mount', () => {
             const ctx = createMockContext();
            const behavior = new TimerBehavior({
                direction: 'down',
                durationMs: 30000,
                label: 'Work Timer'
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('timer', expect.arrayContaining([
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
            const ctx = createMockContext();
            const behavior = new TimerBehavior({ direction: 'up' });

            behavior.onMount(ctx);

            // Timer start is signaled by timer memory with an open span
            expect(ctx.pushMemory).toHaveBeenCalledWith('timer', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({
                        direction: 'up',
                        spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })])
                    })
                })
            ]));
            // No event emission - timer start is implicit from memory
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('TimerEndingBehavior', () => {
        it('should subscribe to tick events', () => {
            const ctx = createMockContext();
            const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function), { scope: 'bubble' });
        });
    });
});

describe('Iteration Aspect Behaviors', () => {
    describe('ReEntryBehavior', () => {
        it('should initialize round state with defaults', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior();

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({
                    value: { current: 1, total: undefined }
                })
            ]));
        });

        it('should initialize with custom config', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior({
                totalRounds: 5,
                startRound: 2
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({
                    value: { current: 2, total: 5 }
                })
            ]));
        });
    });

    describe('ReEntryBehavior onNext', () => {
        it('is a no-op (round advancement handled by ChildSelectionBehavior)', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior({ totalRounds: 5, startRound: 2 });
            behavior.onMount(ctx);

            behavior.onNext(ctx);

            // onNext no longer advances rounds — ChildSelectionBehavior does that
            expect(ctx.updateMemory).not.toHaveBeenCalled();
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('RoundsEndBehavior', () => {
        it('should mark complete when rounds exceeded', () => {
            const ctx = createMockContext();
            // Set up round memory with current > total
            const reEntry = new ReEntryBehavior({ totalRounds: 3, startRound: 4 });
            reEntry.onMount(ctx);

            const behavior = new RoundsEndBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).toHaveBeenCalledWith('rounds-exhausted');
        });

        it('should not mark complete when rounds remaining', () => {
            const ctx = createMockContext();
            const reEntry = new ReEntryBehavior({ totalRounds: 3, startRound: 2 });
            reEntry.onMount(ctx);

            const behavior = new RoundsEndBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
        });
    });
});

describe('Display Aspect Behaviors', () => {
    describe('LabelingBehavior', () => {
        it('should initialize display state', () => {
            const ctx = createMockContext();
            const behavior = new LabelingBehavior({
                mode: 'countdown',
                label: 'Rest'
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('display', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Rest', role: 'label' })
                })
            ]));
        });

        it('should use block label as default', () => {
            const ctx = createMockContext();
            const behavior = new LabelingBehavior();

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('display', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Test Block' })
                })
            ]));
        });
    });
});

describe('Completion Aspect Behaviors', () => {
    describe('LeafExitBehavior', () => {
        it('should subscribe to specified event types', () => {
            const ctx = createMockContext();
            const behavior = new LeafExitBehavior({ onNext: false, onEvents: ['timer:complete', 'user:skip'] });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});

describe('Controls Aspect Behaviors', () => {
    describe('ButtonBehavior', () => {
        it('should set controls memory on mount', () => {
            const ctx = createMockContext();
            const behavior = new ButtonBehavior({
                buttons: [
                    { id: 'next', label: 'Next', variant: 'primary', visible: true, enabled: true }
                ]
            });

            behavior.onMount(ctx);

            // Controls state is pushed as fragments to memory, not emitted as event
            expect(ctx.pushMemory).toHaveBeenCalledWith('controls', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ id: 'next' })
                })
            ]));
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });

        it('should clear controls memory on unmount', () => {
            const ctx = createMockContext();
            const behavior = new ButtonBehavior({ buttons: [] });

            behavior.onUnmount(ctx);

            // Controls cleared (empty array) on unmount
            expect(ctx.updateMemory).toHaveBeenCalledWith('controls', []);
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });
});

describe('Output Aspect Behaviors', () => {
    describe('HistoryRecordBehavior', () => {
        it('should emit history:record event on unmount', async () => {
            const { HistoryRecordBehavior } = await import('../HistoryRecordBehavior');
            const ctx = createMockContext();
            const behavior = new HistoryRecordBehavior();

            behavior.onUnmount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'history:record',
                data: expect.objectContaining({
                    blockKey: 'test-block'
                })
            }));
        });
    });

    describe('SoundCueBehavior', () => {
        it('should emit sound output on mount for mount triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });

            behavior.onMount(ctx);

            // Sound cues emit milestone outputs with SoundFragment, not events
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'start-beep',
                        trigger: 'mount'
                    })
                ]),
                expect.any(Object)
            );
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });

        it('should subscribe to tick for countdown cues', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }]
            });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function), { scope: 'bubble' });
        });

        it('should emit sound output on unmount for complete triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'complete-chime', trigger: 'complete' }]
            });

            behavior.onUnmount(ctx);

            // Sound cues emit milestone outputs with SoundFragment, not events
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'complete-chime',
                        trigger: 'complete'
                    })
                ]),
                expect.any(Object)
            );
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('TimerBehavior pause/resume', () => {
        it('should subscribe to pause and resume events', async () => {
            const { TimerBehavior } = await import('../TimerBehavior');
            const ctx = createMockContext();
            const behavior = new TimerBehavior({ direction: 'up' });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});
.Value -replace "'timer'", "'time'" , expect.arrayContaining([
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
            const ctx = createMockContext();
            const behavior = new TimerBehavior({ direction: 'up' });

            behavior.onMount(ctx);

            // Timer start is signaled by timer memory with an open span
            expect(ctx. import { describe, expect, it, vi } from 'bun:test';
import { TimerBehavior } from '../TimerBehavior';
import { TimerEndingBehavior } from '../TimerEndingBehavior';
import { ReEntryBehavior } from '../ReEntryBehavior';
import { RoundsEndBehavior } from '../RoundsEndBehavior';
import { LabelingBehavior } from '../LabelingBehavior';
import { LeafExitBehavior } from '../LeafExitBehavior';
import { ButtonBehavior } from '../ButtonBehavior';
import { IBehaviorContext } from '../../contracts/IBehaviorContext';
import { IMemoryLocation, MemoryTag, MemoryLocation } from '../../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
    const memoryLocations: IMemoryLocation[] = [];

    return {
        block: {
            key: { toString: () => 'test-block' },
            label: 'Test Block',
            fragments: [],
            getMemoryByTag: (tag: MemoryTag) => memoryLocations.filter(l => l.tag === tag),
            pushMemory: (loc: IMemoryLocation) => memoryLocations.push(loc),
            getAllMemory: () => [...memoryLocations],
            getBehavior: () => undefined,
        },
        clock: { now: new Date(1000) }, // 1 second epoch
        stackLevel: 0,
        subscribe: vi.fn(),
        emitEvent: vi.fn(),
        emitOutput: vi.fn(),
        markComplete: vi.fn(),
        getMemory: vi.fn((type: string) => {
            const locs = memoryLocations.filter(l => l.tag === type);
            if (locs.length > 0 && locs[0].fragments.length > 0) {
                return locs[0].fragments[0].value;
            }
            return undefined;
        }),
        setMemory: vi.fn(),
        pushMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
        }),
        updateMemory: vi.fn((tag: string, fragments: ICodeFragment[]) => {
            const locs = memoryLocations.filter(l => l.tag === tag);
            if (locs.length > 0) {
                locs[0].update(fragments);
            } else {
                memoryLocations.push(new MemoryLocation(tag as MemoryTag, fragments));
            }
        }),
        ...overrides
    } as unknown as IBehaviorContext;
}

describe('Time Aspect Behaviors', () => {
    describe('TimerBehavior', () => {
        it('should initialize timer state on mount', () => {
             const ctx = createMockContext();
            const behavior = new TimerBehavior({
                direction: 'down',
                durationMs: 30000,
                label: 'Work Timer'
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('timer', expect.arrayContaining([
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
            const ctx = createMockContext();
            const behavior = new TimerBehavior({ direction: 'up' });

            behavior.onMount(ctx);

            // Timer start is signaled by timer memory with an open span
            expect(ctx.pushMemory).toHaveBeenCalledWith('timer', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({
                        direction: 'up',
                        spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })])
                    })
                })
            ]));
            // No event emission - timer start is implicit from memory
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('TimerEndingBehavior', () => {
        it('should subscribe to tick events', () => {
            const ctx = createMockContext();
            const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function), { scope: 'bubble' });
        });
    });
});

describe('Iteration Aspect Behaviors', () => {
    describe('ReEntryBehavior', () => {
        it('should initialize round state with defaults', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior();

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({
                    value: { current: 1, total: undefined }
                })
            ]));
        });

        it('should initialize with custom config', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior({
                totalRounds: 5,
                startRound: 2
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({
                    value: { current: 2, total: 5 }
                })
            ]));
        });
    });

    describe('ReEntryBehavior onNext', () => {
        it('is a no-op (round advancement handled by ChildSelectionBehavior)', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior({ totalRounds: 5, startRound: 2 });
            behavior.onMount(ctx);

            behavior.onNext(ctx);

            // onNext no longer advances rounds — ChildSelectionBehavior does that
            expect(ctx.updateMemory).not.toHaveBeenCalled();
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('RoundsEndBehavior', () => {
        it('should mark complete when rounds exceeded', () => {
            const ctx = createMockContext();
            // Set up round memory with current > total
            const reEntry = new ReEntryBehavior({ totalRounds: 3, startRound: 4 });
            reEntry.onMount(ctx);

            const behavior = new RoundsEndBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).toHaveBeenCalledWith('rounds-exhausted');
        });

        it('should not mark complete when rounds remaining', () => {
            const ctx = createMockContext();
            const reEntry = new ReEntryBehavior({ totalRounds: 3, startRound: 2 });
            reEntry.onMount(ctx);

            const behavior = new RoundsEndBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
        });
    });
});

describe('Display Aspect Behaviors', () => {
    describe('LabelingBehavior', () => {
        it('should initialize display state', () => {
            const ctx = createMockContext();
            const behavior = new LabelingBehavior({
                mode: 'countdown',
                label: 'Rest'
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('display', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Rest', role: 'label' })
                })
            ]));
        });

        it('should use block label as default', () => {
            const ctx = createMockContext();
            const behavior = new LabelingBehavior();

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('display', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Test Block' })
                })
            ]));
        });
    });
});

describe('Completion Aspect Behaviors', () => {
    describe('LeafExitBehavior', () => {
        it('should subscribe to specified event types', () => {
            const ctx = createMockContext();
            const behavior = new LeafExitBehavior({ onNext: false, onEvents: ['timer:complete', 'user:skip'] });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});

describe('Controls Aspect Behaviors', () => {
    describe('ButtonBehavior', () => {
        it('should set controls memory on mount', () => {
            const ctx = createMockContext();
            const behavior = new ButtonBehavior({
                buttons: [
                    { id: 'next', label: 'Next', variant: 'primary', visible: true, enabled: true }
                ]
            });

            behavior.onMount(ctx);

            // Controls state is pushed as fragments to memory, not emitted as event
            expect(ctx.pushMemory).toHaveBeenCalledWith('controls', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ id: 'next' })
                })
            ]));
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });

        it('should clear controls memory on unmount', () => {
            const ctx = createMockContext();
            const behavior = new ButtonBehavior({ buttons: [] });

            behavior.onUnmount(ctx);

            // Controls cleared (empty array) on unmount
            expect(ctx.updateMemory).toHaveBeenCalledWith('controls', []);
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });
});

describe('Output Aspect Behaviors', () => {
    describe('HistoryRecordBehavior', () => {
        it('should emit history:record event on unmount', async () => {
            const { HistoryRecordBehavior } = await import('../HistoryRecordBehavior');
            const ctx = createMockContext();
            const behavior = new HistoryRecordBehavior();

            behavior.onUnmount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'history:record',
                data: expect.objectContaining({
                    blockKey: 'test-block'
                })
            }));
        });
    });

    describe('SoundCueBehavior', () => {
        it('should emit sound output on mount for mount triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });

            behavior.onMount(ctx);

            // Sound cues emit milestone outputs with SoundFragment, not events
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'start-beep',
                        trigger: 'mount'
                    })
                ]),
                expect.any(Object)
            );
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });

        it('should subscribe to tick for countdown cues', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }]
            });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function), { scope: 'bubble' });
        });

        it('should emit sound output on unmount for complete triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'complete-chime', trigger: 'complete' }]
            });

            behavior.onUnmount(ctx);

            // Sound cues emit milestone outputs with SoundFragment, not events
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'complete-chime',
                        trigger: 'complete'
                    })
                ]),
                expect.any(Object)
            );
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('TimerBehavior pause/resume', () => {
        it('should subscribe to pause and resume events', async () => {
            const { TimerBehavior } = await import('../TimerBehavior');
            const ctx = createMockContext();
            const behavior = new TimerBehavior({ direction: 'up' });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});
.Value -replace "'timer'", "'time'" , expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({
                        direction: 'up',
                        spans: expect.arrayContaining([expect.objectContaining({ started: expect.any(Number) })])
                    })
                })
            ]));
            // No event emission - timer start is implicit from memory
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('TimerEndingBehavior', () => {
        it('should subscribe to tick events', () => {
            const ctx = createMockContext();
            const behavior = new TimerEndingBehavior({ ending: { mode: 'complete-block' } });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function), { scope: 'bubble' });
        });
    });
});

describe('Iteration Aspect Behaviors', () => {
    describe('ReEntryBehavior', () => {
        it('should initialize round state with defaults', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior();

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({
                    value: { current: 1, total: undefined }
                })
            ]));
        });

        it('should initialize with custom config', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior({
                totalRounds: 5,
                startRound: 2
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('round', expect.arrayContaining([
                expect.objectContaining({
                    value: { current: 2, total: 5 }
                })
            ]));
        });
    });

    describe('ReEntryBehavior onNext', () => {
        it('is a no-op (round advancement handled by ChildSelectionBehavior)', () => {
            const ctx = createMockContext();
            const behavior = new ReEntryBehavior({ totalRounds: 5, startRound: 2 });
            behavior.onMount(ctx);

            behavior.onNext(ctx);

            // onNext no longer advances rounds — ChildSelectionBehavior does that
            expect(ctx.updateMemory).not.toHaveBeenCalled();
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('RoundsEndBehavior', () => {
        it('should mark complete when rounds exceeded', () => {
            const ctx = createMockContext();
            // Set up round memory with current > total
            const reEntry = new ReEntryBehavior({ totalRounds: 3, startRound: 4 });
            reEntry.onMount(ctx);

            const behavior = new RoundsEndBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).toHaveBeenCalledWith('rounds-exhausted');
        });

        it('should not mark complete when rounds remaining', () => {
            const ctx = createMockContext();
            const reEntry = new ReEntryBehavior({ totalRounds: 3, startRound: 2 });
            reEntry.onMount(ctx);

            const behavior = new RoundsEndBehavior();
            behavior.onNext(ctx);

            expect(ctx.markComplete).not.toHaveBeenCalled();
        });
    });
});

describe('Display Aspect Behaviors', () => {
    describe('LabelingBehavior', () => {
        it('should initialize display state', () => {
            const ctx = createMockContext();
            const behavior = new LabelingBehavior({
                mode: 'countdown',
                label: 'Rest'
            });

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('display', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Rest', role: 'label' })
                })
            ]));
        });

        it('should use block label as default', () => {
            const ctx = createMockContext();
            const behavior = new LabelingBehavior();

            behavior.onMount(ctx);

            expect(ctx.pushMemory).toHaveBeenCalledWith('display', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ text: 'Test Block' })
                })
            ]));
        });
    });
});

describe('Completion Aspect Behaviors', () => {
    describe('LeafExitBehavior', () => {
        it('should subscribe to specified event types', () => {
            const ctx = createMockContext();
            const behavior = new LeafExitBehavior({ onNext: false, onEvents: ['timer:complete', 'user:skip'] });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});

describe('Controls Aspect Behaviors', () => {
    describe('ButtonBehavior', () => {
        it('should set controls memory on mount', () => {
            const ctx = createMockContext();
            const behavior = new ButtonBehavior({
                buttons: [
                    { id: 'next', label: 'Next', variant: 'primary', visible: true, enabled: true }
                ]
            });

            behavior.onMount(ctx);

            // Controls state is pushed as fragments to memory, not emitted as event
            expect(ctx.pushMemory).toHaveBeenCalledWith('controls', expect.arrayContaining([
                expect.objectContaining({
                    value: expect.objectContaining({ id: 'next' })
                })
            ]));
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });

        it('should clear controls memory on unmount', () => {
            const ctx = createMockContext();
            const behavior = new ButtonBehavior({ buttons: [] });

            behavior.onUnmount(ctx);

            // Controls cleared (empty array) on unmount
            expect(ctx.updateMemory).toHaveBeenCalledWith('controls', []);
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });
});

describe('Output Aspect Behaviors', () => {
    describe('HistoryRecordBehavior', () => {
        it('should emit history:record event on unmount', async () => {
            const { HistoryRecordBehavior } = await import('../HistoryRecordBehavior');
            const ctx = createMockContext();
            const behavior = new HistoryRecordBehavior();

            behavior.onUnmount(ctx);

            expect(ctx.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
                name: 'history:record',
                data: expect.objectContaining({
                    blockKey: 'test-block'
                })
            }));
        });
    });

    describe('SoundCueBehavior', () => {
        it('should emit sound output on mount for mount triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'start-beep', trigger: 'mount' }]
            });

            behavior.onMount(ctx);

            // Sound cues emit milestone outputs with SoundFragment, not events
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'start-beep',
                        trigger: 'mount'
                    })
                ]),
                expect.any(Object)
            );
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });

        it('should subscribe to tick for countdown cues', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }]
            });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledWith('tick', expect.any(Function), { scope: 'bubble' });
        });

        it('should emit sound output on unmount for complete triggers', async () => {
            const { SoundCueBehavior } = await import('../SoundCueBehavior');
            const ctx = createMockContext();
            const behavior = new SoundCueBehavior({
                cues: [{ sound: 'complete-chime', trigger: 'complete' }]
            });

            behavior.onUnmount(ctx);

            // Sound cues emit milestone outputs with SoundFragment, not events
            expect(ctx.emitOutput).toHaveBeenCalledWith(
                'milestone',
                expect.arrayContaining([
                    expect.objectContaining({
                        sound: 'complete-chime',
                        trigger: 'complete'
                    })
                ]),
                expect.any(Object)
            );
            expect(ctx.emitEvent).not.toHaveBeenCalled();
        });
    });

    describe('TimerBehavior pause/resume', () => {
        it('should subscribe to pause and resume events', async () => {
            const { TimerBehavior } = await import('../TimerBehavior');
            const ctx = createMockContext();
            const behavior = new TimerBehavior({ direction: 'up' });

            behavior.onMount(ctx);

            expect(ctx.subscribe).toHaveBeenCalledTimes(2);
        });
    });
});
