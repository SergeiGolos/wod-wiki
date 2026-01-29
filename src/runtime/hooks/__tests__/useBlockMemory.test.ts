/**
 * Tests for useBlockMemory hooks
 * 
 * These tests verify that the hooks correctly subscribe to block memory
 * and update when behaviors modify the memory state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useBlockMemory,
    useTimerState,
    useRoundState,
    useDisplayState,
    useTimerDisplay,
    useRoundDisplay
} from '../useBlockMemory';
import { IRuntimeBlock } from '../../contracts/IRuntimeBlock';
import { IMemoryEntry } from '../../memory/IMemoryEntry';
import { TimerState, RoundState, DisplayState } from '../../memory/MemoryTypes';
import { TimeSpan } from '../../models/TimeSpan';

// Mock block factory
function createMockBlock(initialMemory: Map<string, unknown> = new Map()): IRuntimeBlock {
    const memoryEntries = new Map<string, MockMemoryEntry>();

    // Initialize with any provided memory
    for (const [type, value] of initialMemory) {
        memoryEntries.set(type, new MockMemoryEntry(type, value));
    }

    return {
        key: { toString: () => 'test-block' },
        blockType: 'Test',
        label: 'Test Block',
        sourceIds: [],
        context: {} as any,
        executionTiming: {},
        getMemory: (type: string) => memoryEntries.get(type),
        hasMemory: (type: string) => memoryEntries.has(type),
        setMemoryValue: (type: string, value: unknown) => {
            const existing = memoryEntries.get(type);
            if (existing) {
                existing.update(value);
            } else {
                memoryEntries.set(type, new MockMemoryEntry(type, value));
            }
        },
        // Expose for test manipulation
        _memoryEntries: memoryEntries
    } as unknown as IRuntimeBlock;
}

// Mock memory entry with subscribe
class MockMemoryEntry implements IMemoryEntry<string, any> {
    private listeners = new Set<(val: any, old: any) => void>();
    private _value: any;

    constructor(public readonly type: string, initialValue: any) {
        this._value = initialValue;
    }

    get value() {
        return this._value;
    }

    update(newValue: any): void {
        const oldValue = this._value;
        this._value = newValue;
        for (const listener of this.listeners) {
            listener(newValue, oldValue);
        }
    }

    subscribe(listener: (val: any, old: any) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    dispose(): void {
        this.listeners.clear();
    }
}

describe('useBlockMemory', () => {
    describe('basic functionality', () => {
        it('should return undefined when block is undefined', () => {
            const { result } = renderHook(() =>
                useBlockMemory(undefined, 'timer')
            );
            expect(result.current).toBeUndefined();
        });

        it('should return initial value from memory', () => {
            const timerState: TimerState = {
                spans: [],
                direction: 'up',
                label: 'Test',
                role: 'primary'
            };
            const block = createMockBlock(new Map<string, unknown>([['timer', timerState]]));

            const { result } = renderHook(() =>
                useBlockMemory(block, 'timer')
            );

            expect(result.current).toEqual(timerState);
        });

        it('should update when memory changes', () => {
            const initialState: TimerState = {
                spans: [],
                direction: 'up',
                label: 'Test',
                role: 'primary'
            };
            const block = createMockBlock(new Map<string, unknown>([['timer', initialState]]));

            const { result } = renderHook(() =>
                useBlockMemory(block, 'timer')
            );

            expect(result.current).toEqual(initialState);

            // Update memory
            const updatedState: TimerState = {
                ...initialState,
                spans: [new TimeSpan(1000)]
            };

            act(() => {
                (block as any)._memoryEntries.get('timer')?.update(updatedState);
            });

            expect(result.current).toEqual(updatedState);
        });

        it('should clean up subscription on unmount', () => {
            const timerState: TimerState = {
                spans: [],
                direction: 'up',
                label: 'Test',
                role: 'primary'
            };
            const block = createMockBlock(new Map<string, unknown>([['timer', timerState]]));
            const entry = (block as any)._memoryEntries.get('timer') as MockMemoryEntry;

            const { unmount } = renderHook(() =>
                useBlockMemory(block, 'timer')
            );

            // Entry should have a subscriber
            expect((entry as any).listeners.size).toBe(1);

            unmount();

            // Subscriber should be removed
            expect((entry as any).listeners.size).toBe(0);
        });
    });
});

describe('useTimerState', () => {
    it('should return timer state from block', () => {
        const timerState: TimerState = {
            spans: [new TimeSpan(1000)],
            direction: 'down',
            durationMs: 60000,
            label: 'Countdown',
            role: 'primary'
        };
        const block = createMockBlock(new Map<string, unknown>([['timer', timerState]]));

        const { result } = renderHook(() => useTimerState(block));

        expect(result.current).toEqual(timerState);
        expect(result.current?.direction).toBe('down');
        expect(result.current?.durationMs).toBe(60000);
    });
});

describe('useRoundState', () => {
    it('should return round state from block', () => {
        const roundState: RoundState = {
            current: 3,
            total: 5
        };
        const block = createMockBlock(new Map<string, unknown>([['round', roundState]]));

        const { result } = renderHook(() => useRoundState(block));

        expect(result.current).toEqual(roundState);
        expect(result.current?.current).toBe(3);
        expect(result.current?.total).toBe(5);
    });
});

describe('useDisplayState', () => {
    it('should return display state from block', () => {
        const displayState: DisplayState = {
            mode: 'countdown',
            label: 'EMOM',
            roundDisplay: 'Round 2 of 10'
        };
        const block = createMockBlock(new Map<string, unknown>([['display', displayState]]));

        const { result } = renderHook(() => useDisplayState(block));

        expect(result.current).toEqual(displayState);
        expect(result.current?.mode).toBe('countdown');
    });
});

describe('useTimerDisplay', () => {
    let originalDateNow: () => number;

    beforeEach(() => {
        originalDateNow = Date.now;
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    it('should return null when no timer state', () => {
        const block = createMockBlock();

        const { result } = renderHook(() => useTimerDisplay(block));

        expect(result.current).toBeNull();
    });

    it('should calculate elapsed time from spans', () => {
        // Use completed spans so Date.now() isn't needed
        const timerState: TimerState = {
            spans: [new TimeSpan(5000, 8000)], // 3 seconds elapsed
            direction: 'up',
            label: 'Test',
            role: 'primary'
        };
        const block = createMockBlock(new Map<string, unknown>([['timer', timerState]]));

        const { result } = renderHook(() => useTimerDisplay(block));

        expect(result.current?.elapsed).toBe(3000);
        expect(result.current?.isRunning).toBe(false);
        expect(result.current?.formatted).toBe('0:03');
    });

    it('should calculate remaining time for countdown', () => {
        // Use completed spans so Date.now() isn't needed
        const timerState: TimerState = {
            spans: [new TimeSpan(5000, 8000)], // 3 seconds elapsed
            direction: 'down',
            durationMs: 60000, // 60 second countdown
            label: 'Countdown',
            role: 'primary'
        };
        const block = createMockBlock(new Map<string, unknown>([['timer', timerState]]));

        const { result } = renderHook(() => useTimerDisplay(block));

        expect(result.current?.elapsed).toBe(3000);
        expect(result.current?.remaining).toBe(57000); // 60s - 3s
        expect(result.current?.isComplete).toBe(false);
        expect(result.current?.direction).toBe('down');
        expect(result.current?.formatted).toBe('0:57'); // Shows remaining for countdown
    });

    it('should detect running timer', () => {
        // Mock Date.now for running timer test
        const mockNow = 10000;
        Date.now = () => mockNow;

        const timerState: TimerState = {
            spans: [new TimeSpan(5000)], // No end time = running
            direction: 'up',
            label: 'Test',
            role: 'primary'
        };
        const block = createMockBlock(new Map<string, unknown>([['timer', timerState]]));

        const { result } = renderHook(() => useTimerDisplay(block));

        expect(result.current?.isRunning).toBe(true);
        expect(result.current?.elapsed).toBe(5000); // now - started
    });

    it('should mark complete when countdown reaches 0', () => {
        // Use completed spans that exceed duration
        const timerState: TimerState = {
            spans: [new TimeSpan(0, 65000)], // 65 seconds elapsed
            direction: 'down',
            durationMs: 60000,
            label: 'Done',
            role: 'primary'
        };
        const block = createMockBlock(new Map<string, unknown>([['timer', timerState]]));

        const { result } = renderHook(() => useTimerDisplay(block));

        expect(result.current?.isComplete).toBe(true);
        expect(result.current?.remaining).toBe(0);
    });
});

describe('useRoundDisplay', () => {
    it('should return null when no round state', () => {
        const block = createMockBlock();

        const { result } = renderHook(() => useRoundDisplay(block));

        expect(result.current).toBeNull();
    });

    it('should format bounded rounds', () => {
        const roundState: RoundState = { current: 3, total: 5 };
        const block = createMockBlock(new Map<string, unknown>([['round', roundState]]));

        const { result } = renderHook(() => useRoundDisplay(block));

        expect(result.current?.current).toBe(3);
        expect(result.current?.total).toBe(5);
        expect(result.current?.label).toBe('Round 3 of 5');
        expect(result.current?.progress).toBeCloseTo(0.4); // (3-1)/5
    });

    it('should format unbounded rounds', () => {
        const roundState: RoundState = { current: 7, total: undefined };
        const block = createMockBlock(new Map<string, unknown>([['round', roundState]]));

        const { result } = renderHook(() => useRoundDisplay(block));

        expect(result.current?.label).toBe('Round 7');
        expect(result.current?.progress).toBeUndefined();
    });

    it('should use roundDisplay from display state if available', () => {
        const roundState: RoundState = { current: 2, total: 10 };
        const displayState: DisplayState = {
            mode: 'countdown',
            label: 'EMOM',
            roundDisplay: 'Minute 2 of 10'
        };
        const block = createMockBlock(new Map<string, unknown>([
            ['round', roundState],
            ['display', displayState]
        ]));

        const { result } = renderHook(() => useRoundDisplay(block));

        expect(result.current?.label).toBe('Minute 2 of 10');
    });
});
