import { describe, it, expect } from "bun:test";
import { BlockBuilder } from "../../compiler/BlockBuilder";
import { BlockKey } from "@/core/models/BlockKey";
import { BlockContext } from "../../BlockContext";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { ICodeFragment, FragmentType } from "@/core/models/CodeFragment";

/**
 * Phase 4 Tests: Fragment Source Access from Blocks (List-Based Memory)
 *
 * These tests verify that:
 * 1. Blocks built via BlockBuilder store fragments as MemoryLocation entries
 * 2. The fragment:display memory locations are accessible and reactive
 * 3. Stack display items can access fragment data from memory locations
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
    // Fragment access via list-based memory locations
    // ========================================================================

    describe("Fragment memory locations from block", () => {
        it("should return fragment:display memory locations from built block", () => {
            const timerFrag = createFragment('duration', FragmentType.Duration, 60000);
            const block = buildBlock([[timerFrag]]);

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations).toHaveLength(1);
            expect(locations[0].fragments).toHaveLength(1);
            expect(locations[0].fragments[0].fragmentType).toBe(FragmentType.Duration);
        });

        it("should return correct fragment values", () => {
            const timerFrag = createFragment('duration', FragmentType.Duration, 60000);
            const block = buildBlock([[timerFrag]]);

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations[0].fragments[0].value).toBe(60000);
        });

        it("should return multiple fragments in a single location", () => {
            const timerFrag = createFragment('duration', FragmentType.Duration, 60000);
            const actionFrag = createFragment('action', FragmentType.Action, 'Run');
            const repFrag = createFragment('rep', FragmentType.Rep, 21);

            const block = buildBlock([[timerFrag, actionFrag, repFrag]]);

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations).toHaveLength(1);
            expect(locations[0].fragments).toHaveLength(3);
        });

        it("should filter fragments by type", () => {
            const timerFrag = createFragment('duration', FragmentType.Duration, 60000);
            const actionFrag = createFragment('action', FragmentType.Action, 'Run');
            const repFrag = createFragment('rep', FragmentType.Rep, 21);

            const block = buildBlock([[timerFrag, actionFrag, repFrag]]);

            const locations = block.getMemoryByTag('fragment:display');
            const timersOnly = locations[0].fragments.filter(f => f.fragmentType === FragmentType.Duration);
            expect(timersOnly).toHaveLength(1);
            expect(timersOnly[0].value).toBe(60000);
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

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations).toHaveLength(0);
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

            const locations = block.getMemoryByTag('fragment:display');
            const reps = locations[0].fragments.filter(f => f.fragmentType === FragmentType.Rep);
            expect(reps).toHaveLength(3);

            const actions = locations[0].fragments.filter(f => f.fragmentType === FragmentType.Action);
            expect(actions).toHaveLength(1);
        });

        it("should preserve both parser and runtime fragments", () => {
            const parserTimer = createFragment('duration', FragmentType.Duration, 600000, 'parser');
            const runtimeTimer = createFragment('duration', FragmentType.Duration, 432000, 'runtime');
            const actionFrag = createFragment('action', FragmentType.Action, 'Run', 'parser');

            const block = buildBlock([[parserTimer, runtimeTimer, actionFrag]]);

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations[0].fragments).toHaveLength(3);

            const parserFrags = locations[0].fragments.filter(f => f.origin === 'parser');
            const runtimeFrags = locations[0].fragments.filter(f => f.origin === 'runtime');
            expect(parserFrags).toHaveLength(2); // parserTimer + actionFrag are both parser origin
            // Actually both parserTimer and actionFrag are 'parser' origin
        });

        it("should handle user override fragments", () => {
            const runtimeRep = createFragment('rep', FragmentType.Rep, 19, 'runtime');
            const userRep = createFragment('rep', FragmentType.Rep, 18, 'user');

            const block = buildBlock([[runtimeRep, userRep]]);

            const locations = block.getMemoryByTag('fragment:display');
            const reps = locations[0].fragments.filter(f => f.fragmentType === FragmentType.Rep);
            expect(reps).toHaveLength(2);

            const userFrags = reps.filter(f => f.origin === 'user');
            expect(userFrags).toHaveLength(1);
            expect(userFrags[0].value).toBe(18);
        });
    });

    // ========================================================================
    // Reactive updates through MemoryLocation
    // ========================================================================

    describe("Reactive fragment updates", () => {
        it("should notify subscribers when fragments are updated", () => {
            const timerFrag = createFragment('duration', FragmentType.Duration, 60000);
            const block = buildBlock([[timerFrag]]);

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations).toHaveLength(1);

            let notifyCount = 0;
            const unsub = locations[0].subscribe(() => {
                notifyCount++;
            });

            // Update the location with additional fragments
            const actionFrag = createFragment('action', FragmentType.Action, 'Run');
            locations[0].update([timerFrag, actionFrag]);

            expect(notifyCount).toBe(1);
            expect(locations[0].fragments).toHaveLength(2);
            unsub();
        });

        it("should provide updated fragments after update", () => {
            const parserTimer = createFragment('duration', FragmentType.Duration, 600000, 'parser');
            const block = buildBlock([[parserTimer]]);

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations[0].fragments[0].origin).toBe('parser');

            // Simulate runtime updating the timer
            const runtimeTimer = createFragment('duration', FragmentType.Duration, 432000, 'runtime');
            locations[0].update([runtimeTimer]);

            expect(locations[0].fragments).toHaveLength(1);
            expect(locations[0].fragments[0].origin).toBe('runtime');
            expect(locations[0].fragments[0].value).toBe(432000);
        });
    });

    // ========================================================================
    // Multi-group structure
    // ========================================================================

    describe("Multi-group fragment locations", () => {
        it("should preserve multi-group structure as separate locations", () => {
            const frag1 = createFragment('duration', FragmentType.Duration, 60000);
            const frag2 = createFragment('action', FragmentType.Action, 'Run');

            const block = buildBlock([[frag1], [frag2]]);

            const locations = block.getMemoryByTag('fragment:display');
            expect(locations).toHaveLength(2);
            expect(locations[0].fragments[0].fragmentType).toBe(FragmentType.Duration);
            expect(locations[1].fragments[0].fragmentType).toBe(FragmentType.Action);
        });

        it("should support building stack display entries from memory locations", () => {
            const frag1 = createFragment('duration', FragmentType.Duration, 60000);
            const frag2 = createFragment('action', FragmentType.Action, 'Run');

            const block1 = buildBlock([[frag1]]);
            const block2 = buildBlock([[frag2]]);

            const locs1 = block1.getMemoryByTag('fragment:display');
            const locs2 = block2.getMemoryByTag('fragment:display');

            // Simulate stack display entries
            const entries = [
                { block: block1, fragments: locs1[0].fragments, depth: 0, isLeaf: false, label: 'Parent' },
                { block: block2, fragments: locs2[0].fragments, depth: 1, isLeaf: true, label: 'Child' }
            ];

            expect(entries[0].isLeaf).toBe(false);
            expect(entries[1].isLeaf).toBe(true);
            expect(entries[0].depth).toBe(0);
            expect(entries[1].depth).toBe(1);
            expect(entries[0].fragments[0].fragmentType).toBe(FragmentType.Duration);
            expect(entries[1].fragments[0].fragmentType).toBe(FragmentType.Action);
        });
    });
});
