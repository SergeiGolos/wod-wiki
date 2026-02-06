import { describe, it, expect } from 'bun:test';
import { ExecutionContext } from '../ExecutionContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

/**
 * Creates a minimal mock runtime for testing ExecutionContext in isolation.
 */
function createMockRuntime(): IScriptRuntime {
    return {
        clock: {
            now: new Date('2024-01-01T12:00:00Z'),
            start: () => {},
            stop: () => {},
            isRunning: true
        },
        stack: {
            current: undefined,
            count: 0,
            blocks: [],
            push: () => {},
            pop: () => undefined,
        },
        eventBus: {
            register: () => () => {},
            on: () => () => {},
            dispatch: () => [],
            emit: () => {},
        },
        script: {} as any,
        jit: {} as any,
        errors: [],
        do: () => {},
        doAll: () => {},
        handle: () => {},
        pushBlock: () => {},
        popBlock: () => {},
        subscribeToOutput: () => () => {},
        getOutputStatements: () => [],
        addOutput: () => {},
        dispose: () => {},
    } as any;
}

describe('ExecutionContext LIFO Stack Behavior', () => {
    it('should process actions in LIFO (stack) order', () => {
        const mockRuntime = createMockRuntime();
        const executionOrder: string[] = [];

        const actionA: IRuntimeAction = {
            type: 'action-A',
            do: (_runtime: IScriptRuntime) => {
                executionOrder.push('A');
            }
        };

        const actionB: IRuntimeAction = {
            type: 'action-B',
            do: (_runtime: IScriptRuntime) => {
                executionOrder.push('B');
            }
        };

        // Push both actions manually then execute
        // With LIFO: if we push A first, then B, B should pop first
        const ctx = new ExecutionContext(mockRuntime, 20);

        // Use a wrapper action that pushes A and B
        const wrapper: IRuntimeAction = {
            type: 'wrapper',
            do: (runtime: IScriptRuntime) => {
                runtime.do(actionA);
                runtime.do(actionB);
            }
        };

        ctx.execute(wrapper);

        // LIFO: B was pushed last, so B pops and executes first, then A
        expect(executionOrder).toEqual(['B', 'A']);
    });

    it('should process child actions depth-first before siblings', () => {
        const mockRuntime = createMockRuntime();
        const executionOrder: string[] = [];

        const childOfA: IRuntimeAction = {
            type: 'child-of-A',
            do: () => { executionOrder.push('childA'); }
        };

        const actionA: IRuntimeAction = {
            type: 'action-A',
            do: (runtime: IScriptRuntime) => {
                executionOrder.push('A');
                runtime.do(childOfA);
            }
        };

        const actionB: IRuntimeAction = {
            type: 'action-B',
            do: () => { executionOrder.push('B'); }
        };

        // Push A and B onto the stack via a parent action
        const ctx = new ExecutionContext(mockRuntime, 20);

        // Push in reverse order so A executes first (LIFO)
        const parent: IRuntimeAction = {
            type: 'parent',
            do: (runtime: IScriptRuntime) => {
                // Push B first (goes to bottom), then A (goes to top)
                // LIFO pops A first
                runtime.do(actionB);
                runtime.do(actionA);
            }
        };

        ctx.execute(parent);

        // LIFO depth-first: A executes first, pushes childA.
        // childA is on top of stack (above B), so childA executes next.
        // Then B executes last.
        expect(executionOrder).toEqual(['A', 'childA', 'B']);
    });

    it('should process nested children before parent siblings (pop chain)', () => {
        const mockRuntime = createMockRuntime();
        const executionOrder: string[] = [];

        // Simulates: pop-action runs, produces unmount-action and next-action
        // unmount-action runs first (depth-first), then next-action
        const unmountAction: IRuntimeAction = {
            type: 'unmount',
            do: () => { executionOrder.push('unmount'); }
        };

        const pushNewChild: IRuntimeAction = {
            type: 'push-new-child',
            do: () => { executionOrder.push('push-new-child'); }
        };

        const nextAction: IRuntimeAction = {
            type: 'next',
            do: (runtime: IScriptRuntime) => {
                executionOrder.push('next');
                runtime.do(pushNewChild);
            }
        };

        const popAction: IRuntimeAction = {
            type: 'pop',
            do: (runtime: IScriptRuntime) => {
                executionOrder.push('pop');
                // Push next-action first (bottom), then unmount (top) for correct LIFO ordering
                runtime.do(nextAction);
                runtime.do(unmountAction);
            }
        };

        const ctx = new ExecutionContext(mockRuntime, 20);
        ctx.execute(popAction);

        // pop runs → pushes next (bottom) and unmount (top)
        // LIFO: unmount pops first → executes
        // next pops next → executes, pushes pushNewChild
        // LIFO: pushNewChild pops → executes
        expect(executionOrder).toEqual(['pop', 'unmount', 'next', 'push-new-child']);
    });

    it('should freeze clock for all actions in the turn', () => {
        const mockRuntime = createMockRuntime();
        const timestamps: number[] = [];

        const actionA: IRuntimeAction = {
            type: 'A',
            do: (runtime: IScriptRuntime) => {
                timestamps.push(runtime.clock.now.getTime());
                runtime.do({
                    type: 'B',
                    do: (rt: IScriptRuntime) => {
                        timestamps.push(rt.clock.now.getTime());
                    }
                });
            }
        };

        const ctx = new ExecutionContext(mockRuntime, 20);
        ctx.execute(actionA);

        expect(timestamps).toHaveLength(2);
        expect(timestamps[0]).toBe(timestamps[1]);
    });

    it('should enforce max iteration limit', () => {
        const mockRuntime = createMockRuntime();

        const infiniteAction: IRuntimeAction = {
            type: 'infinite',
            do: (runtime: IScriptRuntime) => {
                runtime.do(infiniteAction);
            }
        };

        const ctx = new ExecutionContext(mockRuntime, 5);
        expect(() => ctx.execute(infiniteAction)).toThrow(/Max iterations/);
    });

    it('should process deeply nested chains correctly', () => {
        const mockRuntime = createMockRuntime();
        const executionOrder: string[] = [];

        // Simulate: grandchild completes before parent sibling
        const grandchild: IRuntimeAction = {
            type: 'grandchild',
            do: () => { executionOrder.push('grandchild'); }
        };

        const child: IRuntimeAction = {
            type: 'child',
            do: (runtime: IScriptRuntime) => {
                executionOrder.push('child');
                runtime.do(grandchild);
            }
        };

        const sibling: IRuntimeAction = {
            type: 'sibling',
            do: () => { executionOrder.push('sibling'); }
        };

        const parent: IRuntimeAction = {
            type: 'parent',
            do: (runtime: IScriptRuntime) => {
                executionOrder.push('parent');
                // Push sibling first (bottom), child on top
                runtime.do(sibling);
                runtime.do(child);
            }
        };

        const ctx = new ExecutionContext(mockRuntime, 20);
        ctx.execute(parent);

        // LIFO depth-first: parent → child (on top) → grandchild (child's child, on top) → sibling
        expect(executionOrder).toEqual(['parent', 'child', 'grandchild', 'sibling']);
    });
});

describe('ExecutionContext.doAll()', () => {
    it('should execute actions in array order (first element first)', () => {
        const mockRuntime = createMockRuntime();
        const executionOrder: string[] = [];

        const actions: IRuntimeAction[] = [
            { type: 'A', do: () => { executionOrder.push('A'); } },
            { type: 'B', do: () => { executionOrder.push('B'); } },
            { type: 'C', do: () => { executionOrder.push('C'); } },
        ];

        const ctx = new ExecutionContext(mockRuntime, 20);
        // Use a wrapper to call doAll from within the execution loop
        ctx.execute({
            type: 'wrapper',
            do: (runtime: IScriptRuntime) => {
                runtime.doAll(actions);
            }
        });

        expect(executionOrder).toEqual(['A', 'B', 'C']);
    });

    it('should handle empty actions array', () => {
        const mockRuntime = createMockRuntime();
        const ctx = new ExecutionContext(mockRuntime, 20);

        ctx.execute({
            type: 'wrapper',
            do: (runtime: IScriptRuntime) => {
                runtime.doAll([]);
            }
        });

        // Should not throw or produce any errors
    });

    it('should process doAll children depth-first before siblings', () => {
        const mockRuntime = createMockRuntime();
        const executionOrder: string[] = [];

        const ctx = new ExecutionContext(mockRuntime, 20);
        ctx.execute({
            type: 'parent',
            do: (runtime: IScriptRuntime) => {
                executionOrder.push('parent');
                // Use doAll for sibling pair
                runtime.doAll([
                    {
                        type: 'first',
                        do: (rt: IScriptRuntime) => {
                            executionOrder.push('first');
                            // First action pushes a child via doAll
                            rt.doAll([
                                { type: 'first-child', do: () => { executionOrder.push('first-child'); } }
                            ]);
                        }
                    },
                    {
                        type: 'second',
                        do: () => { executionOrder.push('second'); }
                    }
                ]);
            }
        });

        // parent → first (doAll puts first on top) → first-child (depth-first) → second
        expect(executionOrder).toEqual(['parent', 'first', 'first-child', 'second']);
    });

    it('should interleave doAll and do correctly', () => {
        const mockRuntime = createMockRuntime();
        const executionOrder: string[] = [];

        const ctx = new ExecutionContext(mockRuntime, 20);
        ctx.execute({
            type: 'start',
            do: (runtime: IScriptRuntime) => {
                executionOrder.push('start');
                // Mix do() and doAll() calls
                runtime.doAll([
                    { type: 'batch-1', do: () => { executionOrder.push('batch-1'); } },
                    { type: 'batch-2', do: () => { executionOrder.push('batch-2'); } },
                ]);
                runtime.do({
                    type: 'single',
                    do: () => { executionOrder.push('single'); }
                });
            }
        });

        // LIFO: 'single' was pushed last (on top), so it executes first
        // Then batch-1 (top of doAll), then batch-2
        expect(executionOrder).toEqual(['start', 'single', 'batch-1', 'batch-2']);
    });
});
