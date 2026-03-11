import { describe, it, expect } from "bun:test";
import { BlockBuilder } from "../BlockBuilder";
import { BlockKey } from "@/core/models/BlockKey";
import { BlockContext } from "../../BlockContext";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { IMetric, MetricType } from "@/core/models/Metric";

describe("BlockBuilder Fragment Memory Allocation", () => {
    const runtime = {
        memory: { search: () => undefined }
    } as any as IScriptRuntime;

    const timerFragment: IMetric = {
        type: MetricType.Duration,
        value: 60000,
        origin: 'parser'
    };

    const actionFragment: IMetric = {
        type: MetricType.Action,
        value: 'Run',
        origin: 'parser'
    };

    const repFragment: IMetric = {
        type: MetricType.Rep,
        value: 21,
        origin: 'parser'
    };

    function buildWithFragments(metricGroups: IMetric[][]) {
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString());

        return new BlockBuilder(runtime)
            .setContext(context)
            .setKey(blockKey)
            .setBlockType("Test")
            .setLabel("Test Block")
            .setFragments(metricGroups)
            .build();
    }

    it("should make metrics accessible via metrics:display memory locations", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        const locations = block.getMemoryByTag('metric:display');
        expect(locations).toHaveLength(1);
        expect(locations[0].metrics).toHaveLength(2);
        expect(locations[0].metrics).toContainEqual(timerFragment);
        expect(locations[0].metrics).toContainEqual(actionFragment);
    });

    it("should have metrics:display memory after build", () => {
        const block = buildWithFragments([[timerFragment, actionFragment]]);

        expect(block.getMemoryByTag('metric:display')).toHaveLength(1);
    });

    it("should preserve multi-group structure as separate memory locations", () => {
        const group1 = [timerFragment, actionFragment];
        const group2 = [repFragment];
        const block = buildWithFragments([group1, group2]);

        const locations = block.getMemoryByTag('metric:display');
        expect(locations).toHaveLength(2);
        expect(locations[0].metrics).toHaveLength(2);
        expect(locations[1].metrics).toHaveLength(1);
    });

    it("should handle empty metrics groups gracefully", () => {
        const block = buildWithFragments([]);

        expect(block.getMemoryByTag('metric:display')).toHaveLength(0);
        expect(block.getMemoryByTag('metric:display')).toEqual([]);
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

        expect(block.getMemoryByTag('metric:display')).toHaveLength(0);
    });

    it("should not allocate memory when empty metrics groups are set", () => {
        const block = buildWithFragments([]);

        expect(block.getMemoryByTag('metric:display')).toHaveLength(0);
    });

    it("should store all metrics types correctly", () => {
        const block = buildWithFragments([[timerFragment, actionFragment, repFragment]]);

        const locations = block.getMemoryByTag('metric:display');
        expect(locations).toHaveLength(1);
        expect(locations[0].metrics).toHaveLength(3);

        const types = locations[0].metrics.map(f => f.type);
        expect(types).toContain(MetricType.Duration);
        expect(types).toContain(MetricType.Action);
        expect(types).toContain(MetricType.Rep);
    });

    it("should support metrics updates via location.update()", () => {
        const block = buildWithFragments([[timerFragment]]);

        const locations = block.getMemoryByTag('metric:display');
        expect(locations[0].metrics).toHaveLength(1);

        // Update the location with additional metrics
        locations[0].update([timerFragment, actionFragment]);
        expect(locations[0].metrics).toHaveLength(2);
    });

    it("should support subscribing to metrics changes", () => {
        const block = buildWithFragments([[timerFragment]]);

        const locations = block.getMemoryByTag('metric:display');
        let notifyCount = 0;
        const unsub = locations[0].subscribe(() => {
            notifyCount++;
        });

        locations[0].update([timerFragment, actionFragment]);
        expect(notifyCount).toBe(1);

        unsub();
    });

    it("should preserve metrics origins across parser and runtime", () => {
        const parserTimer: IMetric = {
            type: MetricType.Duration,
            value: 600000,
            origin: 'parser'
        };
        const runtimeTimer: IMetric = {
            type: MetricType.Duration,
            value: 432000,
            origin: 'runtime'
        };

        const block = buildWithFragments([[parserTimer, runtimeTimer, actionFragment]]);

        const locations = block.getMemoryByTag('metric:display');
        expect(locations[0].metrics).toHaveLength(3);

        const parserFrags = locations[0].metrics.filter(f => f.origin === 'parser');
        const runtimeFrags = locations[0].metrics.filter(f => f.origin === 'runtime');
        expect(parserFrags).toHaveLength(2); // parserTimer + actionFrag
        expect(runtimeFrags).toHaveLength(1);
    });
});
