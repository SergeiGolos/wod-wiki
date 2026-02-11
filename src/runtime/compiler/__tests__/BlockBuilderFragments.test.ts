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

    it("should make fragments accessible via fragment:display memory locations", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        const locations = block.getMemoryByTag('fragment:display');
        expect(locations).toHaveLength(1);
        expect(locations[0].fragments).toHaveLength(2);
        expect(locations[0].fragments).toContainEqual(timerFragment);
        expect(locations[0].fragments).toContainEqual(actionFragment);
    });

    it("should have fragment:display memory after build", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        expect(block.hasMemory('fragment:display')).toBe(true);
    });

    it("should preserve multi-group structure as separate memory locations", () => {
        const group1 = [timerFragment, actionFragment];
        const group2 = [repFragment];
        const block = buildWithFragments([group1, group2]);

        const locations = block.getMemoryByTag('fragment:display');
        expect(locations).toHaveLength(2);
        expect(locations[0].fragments).toHaveLength(2);
        expect(locations[1].fragments).toHaveLength(1);
    });

    it("should handle empty fragment groups gracefully", () => {
        const block = buildWithFragments([]);

        expect(block.hasMemory('fragment:display')).toBe(false);
        expect(block.getMemoryByTag('fragment:display')).toEqual([]);
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

        expect(block.hasMemory('fragment:display')).toBe(false);
    });

    it("should not allocate memory when empty fragment groups are set", () => {
        const block = buildWithFragments([]);

        expect(block.hasMemory('fragment:display')).toBe(false);
    });

    it("should store all fragment types correctly", () => {
        const block = buildWithFragments([[timerFragment, actionFragment, repFragment]]);

        const locations = block.getMemoryByTag('fragment:display');
        expect(locations).toHaveLength(1);
        expect(locations[0].fragments).toHaveLength(3);

        const types = locations[0].fragments.map(f => f.fragmentType);
        expect(types).toContain(FragmentType.Timer);
        expect(types).toContain(FragmentType.Action);
        expect(types).toContain(FragmentType.Rep);
    });

    it("should support fragment updates via location.update()", () => {
        const block = buildWithFragments([[timerFragment]]);

        const locations = block.getMemoryByTag('fragment:display');
        expect(locations[0].fragments).toHaveLength(1);

        // Update the location with additional fragments
        locations[0].update([timerFragment, actionFragment]);
        expect(locations[0].fragments).toHaveLength(2);
    });

    it("should support subscribing to fragment changes", () => {
        const block = buildWithFragments([[timerFragment]]);

        const locations = block.getMemoryByTag('fragment:display');
        let notifyCount = 0;
        const unsub = locations[0].subscribe(() => {
            notifyCount++;
        });

        locations[0].update([timerFragment, actionFragment]);
        expect(notifyCount).toBe(1);

        unsub();
    });

    it("should preserve fragment origins across parser and runtime", () => {
        const parserTimer: ICodeFragment = {
            type: 'timer',
            fragmentType: FragmentType.Timer,
            value: 600000,
            origin: 'parser'
        };
        const runtimeTimer: ICodeFragment = {
            type: 'timer',
            fragmentType: FragmentType.Timer,
            value: 432000,
            origin: 'runtime'
        };

        const block = buildWithFragments([[parserTimer, runtimeTimer, actionFragment]]);

        const locations = block.getMemoryByTag('fragment:display');
        expect(locations[0].fragments).toHaveLength(3);

        const parserFrags = locations[0].fragments.filter(f => f.origin === 'parser');
        const runtimeFrags = locations[0].fragments.filter(f => f.origin === 'runtime');
        expect(parserFrags).toHaveLength(2); // parserTimer + actionFrag
        expect(runtimeFrags).toHaveLength(1);
    });
});
