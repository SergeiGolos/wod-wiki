import { describe, it, expect } from "bun:test";
import { BlockBuilder } from "../BlockBuilder";
import { BlockKey } from "@/core/models/BlockKey";
import { BlockContext } from "../../BlockContext";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { ICodeFragment, FragmentType } from "@/core/models/CodeFragment";

describe("BlockBuilder Fragment Memory Allocation", () => {
    const runtime = {
        memory: { search: () => undefined }
    } as any as IScriptRuntime;

    const timerFragment: ICodeFragment = {
        type: 'timer',
        fragmentType: FragmentType.Timer,
        value: 60000,
        origin: 'parser'
    };

    const actionFragment: ICodeFragment = {
        type: 'action',
        fragmentType: FragmentType.Action,
        value: 'Run',
        origin: 'parser'
    };

    const repFragment: ICodeFragment = {
        type: 'rep',
        fragmentType: FragmentType.Rep,
        value: 21,
        origin: 'parser'
    };

    function buildWithFragments(fragmentGroups: ICodeFragment[][]) {
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

    it("should make fragments accessible on the built block via .fragments getter", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        // Fragments should be accessible via the getter (reads from memory)
        expect(block.fragments).toBeDefined();
        expect(block.fragments.length).toBeGreaterThan(0);
        
        const flat = block.fragments.flat();
        expect(flat).toHaveLength(2);
        expect(flat).toContainEqual(timerFragment);
        expect(flat).toContainEqual(actionFragment);
    });

    it("should support findFragment on the built block", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        const found = block.findFragment(FragmentType.Timer);
        expect(found).toBeDefined();
        expect(found?.value).toBe(60000);
    });

    it("should support filterFragments on the built block", () => {
        const block = buildWithFragments([[timerFragment, repFragment, actionFragment]]);

        const timers = block.filterFragments(FragmentType.Timer);
        expect(timers).toHaveLength(1);

        const actions = block.filterFragments(FragmentType.Action);
        expect(actions).toHaveLength(1);
    });

    it("should support hasFragment on the built block", () => {
        const block = buildWithFragments([[timerFragment]]);

        expect(block.hasFragment(FragmentType.Timer)).toBe(true);
        expect(block.hasFragment(FragmentType.Distance)).toBe(false);
    });

    it("should preserve multi-group structure in memory", () => {
        const group1 = [timerFragment, actionFragment];
        const group2 = [repFragment];
        const block = buildWithFragments([group1, group2]);

        // Groups should be preserved, not flattened
        const mem = block.getMemory('fragment');
        expect(mem).toBeDefined();
        expect(mem!.value.groups).toHaveLength(2);
        expect(mem!.value.groups[0]).toHaveLength(2);
        expect(mem!.value.groups[1]).toHaveLength(1);

        // And accessible via the fragments getter
        expect(block.fragments).toHaveLength(2);
        expect(block.fragments[0]).toHaveLength(2);
        expect(block.fragments[1]).toHaveLength(1);
    });

    it("should allocate fragment memory in the block's memory system", () => {
        const block = buildWithFragments([[timerFragment]]);

        // Verify fragment memory is accessible via getMemory
        expect(block.hasMemory('fragment')).toBe(true);
        const mem = block.getMemory('fragment');
        expect(mem).toBeDefined();
        expect(mem!.value.groups).toHaveLength(1);
        expect(mem!.value.groups[0]).toHaveLength(1);
    });

    it("should handle empty fragment groups gracefully", () => {
        const block = buildWithFragments([]);

        expect(block.fragments).toEqual([]);
        expect(block.hasMemory('fragment')).toBe(false);
    });

    it("should handle no setFragments call gracefully", () => {
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString());

        const block = new BlockBuilder(runtime)
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Test")
            .setLabel("Test Block")
            .build();

        expect(block.fragments).toEqual([]);
        expect(block.hasFragment(FragmentType.Timer)).toBe(false);
    });
});
