import { describe, it, expect } from "bun:test";
import { BlockBuilder } from "../../compiler/BlockBuilder";
import { BlockKey } from "@/core/models/BlockKey";
import { BlockContext } from "../../BlockContext";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { ICodeFragment, FragmentType } from "@/core/models/CodeFragment";
import { DisplayFragmentMemory } from "../../memory/DisplayFragmentMemory";
import { IFragmentSource } from "@/core/contracts/IFragmentSource";

/**
 * Phase 4 Tests: Hook Integration & IFragmentSource Access
 *
 * These tests verify that:
 * 1. Blocks built via BlockBuilder expose DisplayFragmentMemory as IFragmentSource
 * 2. The fragment:display memory entry is accessible and reactive
 * 3. Stack display items use precedence-resolved fragments
 * 4. The IFragmentSource can be obtained from a block's memory system
 */
describe("Phase 4: Fragment Source Access from Blocks", () => {
    const runtime = {
        memory: { search: () => undefined }
    } as any as IScriptRuntime;

    function createFragment(type: string, fragType: FragmentType, value: unknown, origin: string = 'parser'): ICodeFragment {
        return { type, fragmentType: fragType, value, origin } as ICodeFragment;
    }

    function buildBlock(fragmentGroups: ICodeFragment[][]) {
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString());

        return new BlockBuilder(runtime)
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Test")
            .setLabel("Test Block")
            .setFragments(fragmentGroups)
            .build();
    }

    // ========================================================================
    // useFragmentSource integration tests (non-React, verifying the data path)
    // ========================================================================

    describe("IFragmentSource from block memory", () => {
        it("should return IFragmentSource from fragment:display memory entry", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const block = buildBlock([[timerFrag]]);

            const entry = block.getMemory('fragment:display');
            expect(entry).toBeDefined();

            // Cast to IFragmentSource (as the hook would do)
            const source = entry as unknown as IFragmentSource;
            expect(source.getDisplayFragments).toBeDefined();
            expect(source.getFragment).toBeDefined();
            expect(source.getAllFragmentsByType).toBeDefined();
            expect(source.hasFragment).toBeDefined();
            expect(source.rawFragments).toBeDefined();
            expect(source.id).toBeDefined();
        });

        it("should provide correct id from IFragmentSource", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const block = buildBlock([[timerFrag]]);

            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;
            // ID should be the block key
            expect(source.id).toBe(block.key.toString());
        });

        it("should return precedence-resolved fragments from getDisplayFragments()", () => {
            const parserTimer = createFragment('timer', FragmentType.Timer, 600000, 'parser');
            const runtimeTimer = createFragment('timer', FragmentType.Timer, 432000, 'runtime');
            const actionFrag = createFragment('action', FragmentType.Action, 'Run', 'parser');

            const block = buildBlock([[parserTimer, runtimeTimer, actionFrag]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            const display = source.getDisplayFragments();
            // Runtime timer should win over parser timer, action preserved
            expect(display).toHaveLength(2);
            const timer = display.find(f => f.fragmentType === FragmentType.Timer);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe(432000);
        });

        it("should support FragmentFilter in getDisplayFragments()", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const actionFrag = createFragment('action', FragmentType.Action, 'Run');
            const repFrag = createFragment('rep', FragmentType.Rep, 21);

            const block = buildBlock([[timerFrag, actionFrag, repFrag]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            // Filter by types
            const timersOnly = source.getDisplayFragments({ types: [FragmentType.Timer] });
            expect(timersOnly).toHaveLength(1);
            expect(timersOnly[0].fragmentType).toBe(FragmentType.Timer);

            // Filter by excludeTypes
            const noTimers = source.getDisplayFragments({ excludeTypes: [FragmentType.Timer] });
            expect(noTimers).toHaveLength(2);
            expect(noTimers.every(f => f.fragmentType !== FragmentType.Timer)).toBe(true);
        });

        it("should support getFragment() for single best fragment", () => {
            const parserRep = createFragment('rep', FragmentType.Rep, 21, 'parser');
            const runtimeRep = createFragment('rep', FragmentType.Rep, 19, 'runtime');

            const block = buildBlock([[parserRep, runtimeRep]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            const best = source.getFragment(FragmentType.Rep);
            expect(best).toBeDefined();
            expect(best!.origin).toBe('runtime');
            expect(best!.value).toBe(19);
        });

        it("should support getAllFragmentsByType() ordered by precedence", () => {
            const parserRep = createFragment('rep', FragmentType.Rep, 21, 'parser');
            const runtimeRep = createFragment('rep', FragmentType.Rep, 19, 'runtime');

            const block = buildBlock([[parserRep, runtimeRep]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            const allReps = source.getAllFragmentsByType(FragmentType.Rep);
            expect(allReps).toHaveLength(2);
            // Highest precedence (runtime) first
            expect(allReps[0].origin).toBe('runtime');
            expect(allReps[1].origin).toBe('parser');
        });

        it("should support hasFragment()", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const block = buildBlock([[timerFrag]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            expect(source.hasFragment(FragmentType.Timer)).toBe(true);
            expect(source.hasFragment(FragmentType.Distance)).toBe(false);
        });

        it("should provide raw fragments through rawFragments", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const actionFrag = createFragment('action', FragmentType.Action, 'Run');
            const block = buildBlock([[timerFrag, actionFrag]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            const raw = source.rawFragments;
            expect(raw).toHaveLength(2);
        });

        it("should return undefined when block has no fragment:display memory", () => {
            const blockKey = new BlockKey();
            const context = new BlockContext(runtime, blockKey.toString());

            const block = new BlockBuilder(runtime)
                .setContext(context)
                .setKey(blockKey)
                .setBlockType("Test")
                .setLabel("Test Block")
                .build();

            // No fragments were set, so no fragment:display memory
            const entry = block.getMemory('fragment:display');
            expect(entry).toBeUndefined();
        });
    });

    // ========================================================================
    // Multi-fragment scenarios (21-15-9 rep scheme, multi-action)
    // ========================================================================

    describe("Multi-fragment per type scenarios", () => {
        it("should handle multiple rep fragments (21-15-9 scheme)", () => {
            const rep21 = createFragment('rep', FragmentType.Rep, 21);
            const rep15 = createFragment('rep', FragmentType.Rep, 15);
            const rep9 = createFragment('rep', FragmentType.Rep, 9);
            const action = createFragment('action', FragmentType.Action, 'Thrusters');

            const block = buildBlock([[rep21, rep15, rep9, action]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            // All 3 reps from same origin should be preserved
            const display = source.getDisplayFragments();
            const reps = display.filter(f => f.fragmentType === FragmentType.Rep);
            expect(reps).toHaveLength(3);

            const actions = display.filter(f => f.fragmentType === FragmentType.Action);
            expect(actions).toHaveLength(1);
        });

        it("should replace all parser reps with runtime rep when tracked", () => {
            const rep21 = createFragment('rep', FragmentType.Rep, 21, 'parser');
            const rep15 = createFragment('rep', FragmentType.Rep, 15, 'parser');
            const rep9 = createFragment('rep', FragmentType.Rep, 9, 'parser');
            const trackedRep = createFragment('rep', FragmentType.Rep, 19, 'runtime');

            const block = buildBlock([[rep21, rep15, rep9, trackedRep]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            const display = source.getDisplayFragments();
            const reps = display.filter(f => f.fragmentType === FragmentType.Rep);
            // Runtime rep should win, parser reps excluded
            expect(reps).toHaveLength(1);
            expect(reps[0].origin).toBe('runtime');
            expect(reps[0].value).toBe(19);
        });

        it("should handle user override replacing runtime fragments", () => {
            const runtimeRep = createFragment('rep', FragmentType.Rep, 19, 'runtime');
            const userRep = createFragment('rep', FragmentType.Rep, 18, 'user');

            const block = buildBlock([[runtimeRep, userRep]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            const display = source.getDisplayFragments();
            const reps = display.filter(f => f.fragmentType === FragmentType.Rep);
            // User origin wins
            expect(reps).toHaveLength(1);
            expect(reps[0].origin).toBe('user');
            expect(reps[0].value).toBe(18);
        });
    });

    // ========================================================================
    // Reactive updates through DisplayFragmentMemory
    // ========================================================================

    describe("Reactive fragment updates", () => {
        it("should update IFragmentSource when fragments are added to source memory", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const block = buildBlock([[timerFrag]]);
            const source = block.getMemory('fragment:display') as unknown as IFragmentSource;

            // Initially 1 fragment
            expect(source.getDisplayFragments()).toHaveLength(1);

            // Add a fragment to the underlying FragmentMemory
            const fragmentMem = block.getMemory('fragment');
            (fragmentMem as any).addFragment(
                createFragment('action', FragmentType.Action, 'Run')
            );

            // DisplayFragmentMemory should auto-sync
            expect(source.getDisplayFragments()).toHaveLength(2);
        });

        it("should update precedence resolution when higher-priority fragment is added", () => {
            const parserTimer = createFragment('timer', FragmentType.Timer, 600000, 'parser');
            const block = buildBlock([[parserTimer]]);

            const displayMem = block.getMemory('fragment:display') as unknown as DisplayFragmentMemory;

            // Initially parser timer
            expect(displayMem.getFragment(FragmentType.Timer)?.origin).toBe('parser');

            // Add runtime timer (higher precedence)
            displayMem.addFragment(
                createFragment('timer', FragmentType.Timer, 432000, 'runtime')
            );

            // Runtime should now win
            const timer = displayMem.getFragment(FragmentType.Timer);
            expect(timer?.origin).toBe('runtime');
            expect(timer?.value).toBe(432000);
        });

        it("should notify subscribers when fragments change", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const block = buildBlock([[timerFrag]]);

            const displayEntry = block.getMemory('fragment:display');
            expect(displayEntry).toBeDefined();

            let notifyCount = 0;
            const unsub = displayEntry!.subscribe(() => {
                notifyCount++;
            });

            // Add fragment to source memory
            const fragmentMem = block.getMemory('fragment');
            (fragmentMem as any).addFragment(
                createFragment('action', FragmentType.Action, 'Run')
            );

            expect(notifyCount).toBeGreaterThan(0);
            unsub();
        });
    });

    // ========================================================================
    // Stack display items precedence integration
    // ========================================================================

    describe("Stack display items with precedence-resolved fragments", () => {
        it("should return resolved fragments from fragment:display memory value", () => {
            const parserTimer = createFragment('timer', FragmentType.Timer, 600000, 'parser');
            const runtimeTimer = createFragment('timer', FragmentType.Timer, 432000, 'runtime');
            const actionFrag = createFragment('action', FragmentType.Action, 'Run', 'parser');

            const block = buildBlock([[parserTimer, runtimeTimer, actionFrag]]);

            // Simulate what useStackDisplayItems now does:
            const displayMemory = block.getMemory('fragment:display');
            const fragments = displayMemory
                ? (displayMemory.value?.resolved ?? [])
                : [];

            // Should get precedence-resolved fragments
            expect(fragments).toHaveLength(2);
            const timer = fragments.find(f => f.fragmentType === FragmentType.Timer);
            expect(timer?.origin).toBe('runtime');
        });

        it("should fall back to empty when no fragment:display memory exists", () => {
            const blockKey = new BlockKey();
            const context = new BlockContext(runtime, blockKey.toString());

            const block = new BlockBuilder(runtime)
                .setContext(context)
                .setKey(blockKey)
                .setBlockType("Root")
                .setLabel("")
                .build();

            // Simulate what useStackDisplayItems does for blocks without fragment:display
            const displayMemory = block.getMemory('fragment:display');
            const fragments = displayMemory
                ? (displayMemory.value?.resolved ?? [])
                : [];

            expect(fragments).toEqual([]);
        });
    });

    // ========================================================================
    // StackFragmentEntry shape tests
    // ========================================================================

    describe("StackFragmentEntry data shape", () => {
        it("should provide source, block, depth, isLeaf, and label", () => {
            const timerFrag = createFragment('timer', FragmentType.Timer, 60000);
            const block = buildBlock([[timerFrag]]);

            const displayEntry = block.getMemory('fragment:display');
            const source = displayEntry as unknown as IFragmentSource;

            // Simulate StackFragmentEntry construction
            const entry = {
                source,
                block,
                depth: 0,
                isLeaf: true,
                label: block.label
            };

            expect(entry.source.id).toBeDefined();
            expect(entry.source.getDisplayFragments()).toHaveLength(1);
            expect(entry.block).toBe(block);
            expect(entry.depth).toBe(0);
            expect(entry.isLeaf).toBe(true);
            expect(entry.label).toBe("Test Block");
        });

        it("should support multiple entries with different depths", () => {
            const frag1 = createFragment('timer', FragmentType.Timer, 60000);
            const frag2 = createFragment('action', FragmentType.Action, 'Run');

            const block1 = buildBlock([[frag1]]);
            const block2 = buildBlock([[frag2]]);

            const source1 = block1.getMemory('fragment:display') as unknown as IFragmentSource;
            const source2 = block2.getMemory('fragment:display') as unknown as IFragmentSource;

            const entries = [
                { source: source1, block: block1, depth: 0, isLeaf: false, label: 'Parent' },
                { source: source2, block: block2, depth: 1, isLeaf: true, label: 'Child' }
            ];

            expect(entries[0].isLeaf).toBe(false);
            expect(entries[1].isLeaf).toBe(true);
            expect(entries[0].depth).toBe(0);
            expect(entries[1].depth).toBe(1);
        });
    });
});
