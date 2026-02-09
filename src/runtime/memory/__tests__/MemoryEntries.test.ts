import { describe, it, expect, vi } from 'bun:test';
import { TimerMemory } from '../TimerMemory';
import { RoundMemory } from '../RoundMemory';
import { FragmentMemory } from '../FragmentMemory';
import { TimeSpan } from '../../models/TimeSpan';

describe('Memory Implementations', () => {
    describe('TimerMemory', () => {
        it('should initialize with correct values', () => {
            const timer = new TimerMemory({ direction: 'down', label: 'Test', durationMs: 60000 });
            expect(timer.type).toBe('timer');
            expect(timer.value.direction).toBe('down');
            expect(timer.value.label).toBe('Test');
            expect(timer.value.durationMs).toBe(60000);
            expect(timer.value.spans).toEqual([]);
            expect(timer.isRunning).toBe(false);
        });

        it('should start and notify subscribers', () => {
            const timer = new TimerMemory({ direction: 'up', label: 'Test' });
            const listener = vi.fn();
            timer.subscribe(listener);

            timer.start(1000);

            expect(timer.isRunning).toBe(true);
            expect(timer.value.spans.length).toBe(1);
            expect(timer.value.spans[0].started).toBe(1000);
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ spans: expect.any(Array) }),
                expect.objectContaining({ spans: [] })
            );
        });

        it('should stop and notify subscribers', () => {
            const timer = new TimerMemory({ direction: 'up', label: 'Test', initialSpans: [new TimeSpan(1000)] });
            const listener = vi.fn();
            timer.subscribe(listener);

            timer.stop(2000);

            expect(timer.isRunning).toBe(false);
            expect(timer.value.spans[0].ended).toBe(2000);
            expect(listener).toHaveBeenCalled();
        });

        it('should notify with undefined when disposed', () => {
            const timer = new TimerMemory({ direction: 'up', label: 'Test' });
            const listener = vi.fn();
            timer.subscribe(listener);

            timer.dispose();

            expect(listener).toHaveBeenCalledWith(undefined, expect.any(Object));
        });
    });

    describe('RoundMemory', () => {
        it('should increment round', () => {
            const round = new RoundMemory(1, 10);
            round.next();
            expect(round.value.current).toBe(2);
        });

        it('should reset round', () => {
            const round = new RoundMemory(5, 10);
            round.reset();
            expect(round.value.current).toBe(1);
        });
    });

    describe('FragmentMemory', () => {
        it('should manage fragments', () => {
            const fragment = new FragmentMemory();
            const mockFragment: any = { fragmentType: 'text', image: 'test' };

            fragment.addFragment(mockFragment);
            expect(fragment.value.groups[0]).toContain(mockFragment);

            fragment.clear();
            expect(fragment.value.groups.length).toBe(0);
        });
    });
});
