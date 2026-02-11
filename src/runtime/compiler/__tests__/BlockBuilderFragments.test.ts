import { describe, it, expect } from "bun:test";
import { BlockBuilder } from "../BlockBuilder";
import { BlockKey } from "@/core/models/BlockKey";
import { BlockContext } from "../../BlockContext";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { ICodeFragment, FragmentType } from "@/core/models/CodeFragment";
import { IFragmentSource } from "@/core/contracts/IFragmentSource";

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

    it("should make fragments accessible via fragment memory", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        // Fragments should be accessible via getMemory('fragment')
        const mem = block.getMemory('fragment');
        expect(mem).toBeDefined();
        const flat = mem!.value.groups.flat();
        expect(flat).toHaveLength(2);
        expect(flat).toContainEqual(timerFragment);
        expect(flat).toContainEqual(actionFragment);
    });

    it("should support getFragment via display memory on the built block", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        const displayMem = block.getMemory('fragment:display');
        expect(displayMem).toBeDefined();
        const found = (displayMem as any).getFragment(FragmentType.Timer);
        expect(found).toBeDefined();
        expect(found?.value).toBe(60000);
    });

    it("should support getAllFragmentsByType via display memory on the built block", () => {
        const block = buildWithFragments([[timerFragment, repFragment, actionFragment]]);

        const displayMem = block.getMemory('fragment:display');
        expect(displayMem).toBeDefined();
        const timers = (displayMem as any).getAllFragmentsByType(FragmentType.Timer);
        expect(timers).toHaveLength(1);

        const actions = (displayMem as any).getAllFragmentsByType(FragmentType.Action);
        expect(actions).toHaveLength(1);
    });

    it("should support hasFragment via display memory on the built block", () => {
        const block = buildWithFragments([[timerFragment]]);

        const displayMem = block.getMemory('fragment:display');
        expect(displayMem).toBeDefined();
        expect((displayMem as any).hasFragment(FragmentType.Timer)).toBe(true);
        expect((displayMem as any).hasFragment(FragmentType.Distance)).toBe(false);
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

        // Groups accessible via fragment memory
        const fragMem = block.getMemory('fragment');
        expect(fragMem!.value.groups).toHaveLength(2);
        expect(fragMem!.value.groups[0]).toHaveLength(2);
        expect(fragMem!.value.groups[1]).toHaveLength(1);
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

        expect(block.hasMemory('fragment')).toBe(false);
    });

    // Phase 3: Fragment display memory allocation
    // ========================================================================

    it("should allocate fragment:display memory alongside fragment memory", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        expect(block.hasMemory('fragment')).toBe(true);
        expect(block.hasMemory('fragment:display')).toBe(true);

        const displayMem = block.getMemory('fragment:display');
        expect(displayMem).toBeDefined();
        expect(displayMem!.value.fragments).toHaveLength(2);
        expect(displayMem!.value.resolved).toHaveLength(2);
    });

    it("should allocate fragment memory with proper IMemoryEntry interface", () => {
        const block = buildWithFragments([[timerFragment]]);

        const fragmentMem = block.getMemory('fragment');
        expect(fragmentMem).toBeDefined();
        // FragmentStateView returns groups via .value
        expect(fragmentMem!.value.groups).toHaveLength(1);
        // Has subscribe method (IMemoryEntry compliance)
        expect(typeof fragmentMem!.subscribe).toBe('function');
    });

    it("should not allocate fragment:display when no fragments are set", () => {
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString());

        const block = new BlockBuilder(runtime)
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Test")
            .setLabel("Test Block")
            .build();

        expect(block.hasMemory('fragment')).toBe(false);
        expect(block.hasMemory('fragment:display')).toBe(false);
    });

    it("should not allocate fragment:display when empty fragment groups are set", () => {
        const block = buildWithFragments([]);

        expect(block.hasMemory('fragment')).toBe(false);
        expect(block.hasMemory('fragment:display')).toBe(false);
    });

    it("should have fragment:display react to fragment store updates via addFragment", () => {
        const block = buildWithFragments([[timerFragment]]);

        const displayMem = block.getMemory('fragment:display');

        // Initial state: 1 fragment
        expect(displayMem!.value.fragments).toHaveLength(1);

        // Add a fragment through the display view's addFragment API
        (displayMem as any).addFragment(actionFragment);

        // Should now have 2 fragments
        expect(displayMem!.value.fragments).toHaveLength(2);
        expect(displayMem!.value.resolved).toHaveLength(2);
    });

    it("should apply precedence resolution in fragment:display", () => {
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

        const displayMem = block.getMemory('fragment:display');
        expect(displayMem).toBeDefined();

        // rawFragments should contain all 3
        expect(displayMem!.value.fragments).toHaveLength(3);

        // resolved should contain runtime timer (higher precedence) + action
        const resolved = displayMem!.value.resolved;
        expect(resolved).toHaveLength(2); // runtime timer wins over parser timer
        const timerResolved = resolved.find(f => f.fragmentType === FragmentType.Timer);
        expect(timerResolved?.origin).toBe('runtime');
    });

    it("should preserve multi-group structure in fragment memory and flatten in fragment:display", () => {
        const group1 = [timerFragment, actionFragment];
        const group2 = [repFragment];
        const block = buildWithFragments([group1, group2]);

        // Fragment memory preserves groups
        const fragmentMem = block.getMemory('fragment');
        expect(fragmentMem!.value.groups).toHaveLength(2);
        expect(fragmentMem!.value.groups[0]).toHaveLength(2);
        expect(fragmentMem!.value.groups[1]).toHaveLength(1);

        // Fragment display flattens for display
        const displayMem = block.getMemory('fragment:display');
        expect(displayMem!.value.fragments).toHaveLength(3);
        expect(displayMem!.value.resolved).toHaveLength(3);
    });

    it("should implement IFragmentSource on fragment:display memory", () => {
        const block = buildWithFragments([[timerFragment, actionFragment, repFragment]]);

        const displayMem = block.getMemory('fragment:display') as unknown as IFragmentSource;
        expect(displayMem).toBeDefined();

        // IFragmentSource methods
        const all = displayMem.getDisplayFragments();
        expect(all).toHaveLength(3);

        const timer = displayMem.getFragment(FragmentType.Timer);
        expect(timer).toBeDefined();
        expect(timer!.value).toBe(60000);

        const byType = displayMem.getAllFragmentsByType(FragmentType.Action);
        expect(byType).toHaveLength(1);
        expect(byType[0].value).toBe('Run');

        expect(displayMem.hasFragment(FragmentType.Rep)).toBe(true);
        expect(displayMem.hasFragment(FragmentType.Distance)).toBe(false);

        expect(displayMem.rawFragments).toHaveLength(3);
    });
});
