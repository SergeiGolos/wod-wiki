import { describe, it, expect, beforeEach, mock } from "bun:test";
import { JitCompiler } from "../JitCompiler";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { ParsedCodeStatement, ICodeStatement } from "@/core/models/CodeStatement";
import { MetricType } from "@/core/models/Metric";
import { IRuntimeBlockStrategy } from "../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../BlockBuilder";
import { TimerMetric } from "@/runtime/compiler/metrics/TimerMetric";
import { MemoryLocation } from "../../memory/MemoryLocation";

class MockStrategy implements IRuntimeBlockStrategy {
    priority = 100;
    capturedNodes: ICodeStatement[] = [];

    match(nodes: ICodeStatement[], runtime: IScriptRuntime): boolean {
        return true;
    }
    apply(builder: BlockBuilder, nodes: ICodeStatement[], runtime: IScriptRuntime): void {
        this.capturedNodes = nodes;
        builder.setBlockType("MockBlock");
        // Must provide context and key to build successfully
        builder.setContext({} as any).setKey({} as any);
    }
}

describe("JIT Compiler Injection", () => {
    let runtime: IScriptRuntime;
    let compiler: JitCompiler;
    let parentBlock: IRuntimeBlock;

    beforeEach(() => {
        parentBlock = {
            getMetricMemoryByVisibility: mock((visibility) => {
                if (visibility === 'promote') {
                    // Return a memory location with a promoted timer metrics
                    const timerFragment = new TimerMetric("60", { line: 0 } as any);
                    const loc = new MemoryLocation('metric:promote', [timerFragment]);
                    return [loc];
                }
                return [];
            }),
            behaviors: [],
            // Mock other required props slightly to satisfy TS if needed (though 'as any' covers it)
        } as any;

        runtime = {
            stack: {
                current: null
            },
            memory: { search: () => undefined },
        } as any;
        compiler = new JitCompiler();
    });

    it("should inject promoted metrics from parent block into child statements", () => {
        // Setup parent on stack
        (runtime.stack as any).current = parentBlock;

        // Register a mock strategy to capture the nodes passed to apply
        const strategy = new MockStrategy();
        compiler.registerStrategy(strategy);

        // Child node
        const childNode = new ParsedCodeStatement();
        childNode.metrics = [];

        // Compile
        compiler.compile([childNode], runtime);

        // Verify injection
        expect(strategy.capturedNodes.length).toBe(1);
        const injectedFragments = strategy.capturedNodes[0].metrics;
        expect(injectedFragments.length).toBeGreaterThan(0);

        const metrics = injectedFragments[0]; // Injected should be first (appended to empty)
        expect(metrics).toBeDefined();
        expect(metrics.metricType).toBe(MetricType.Duration);
        expect((metrics as TimerMetric).image).toBe("60");
    });

    it("should append promoted metrics to existing metrics", () => {
        // Setup parent on stack
        (runtime.stack as any).current = parentBlock;

        const strategy = new MockStrategy();
        compiler.registerStrategy(strategy);

        // Child node with existing metrics
        const childNode = new ParsedCodeStatement();
        const existingFragment = new TimerMetric("30", { line: 0 } as any);
        childNode.metrics = [existingFragment];

        compiler.compile([childNode], runtime);

        expect(strategy.capturedNodes.length).toBe(1);
        const metrics = strategy.capturedNodes[0].metrics;
        expect(metrics.length).toBe(2);

        // According to our logic: [...node.metrics, ...promotedFragments]
        // So existing first, promoted second
        expect(metrics[0]).toBe(existingFragment);
        expect((metrics[1] as TimerMetric).image).toBe("60");
    });

    it("should respect origin precedence when sorting metrics", () => {
        // Setup parent with higher precedence metric (compiler)
        parentBlock = {
            getMetricMemoryByVisibility: mock((visibility) => {
                if (visibility === 'promote') {
                    const timerFragment = new TimerMetric("60", { line: 0 } as any);
                    (timerFragment as any).origin = 'compiler'; // Higher precedence (rank 2)
                    const loc = new MemoryLocation('metric:promote', [timerFragment]);
                    return [loc];
                }
                return [];
            }),
            behaviors: [],
        } as any;
        (runtime.stack as any).current = parentBlock;

        const strategy = new MockStrategy();
        compiler.registerStrategy(strategy);

        // Child node with lower precedence metrics (parser, rank 3)
        const childNode = new ParsedCodeStatement();
        const existingFragment = new TimerMetric("30", { line: 0 } as any);
        (existingFragment as any).origin = 'parser';
        childNode.metrics = [existingFragment];

        compiler.compile([childNode], runtime);

        expect(strategy.capturedNodes.length).toBe(1);
        const compiledNode = strategy.capturedNodes[0] as ParsedCodeStatement;

        // Check getFragment behavior directly on the node (simulating behavior consumption)
        // Since clone preserves prototype, getMetric() should work
        // However, ParsedCodeStatement inherits CodeStatement methods.
        // Let's manually trigger the sort logic or just inspect order.

        // Default sort logic:
        // Rank(Compiler) = 2
        // Rank(Parser) = 3
        // Sort Ascending (smallest rank first) -> Compiler first.

        // BUT wait, CodeStatement.getAllMetricsByType sorts by rank.
        // If clone is created via Object.create(Object.getPrototypeOf(node)),
        // it should have getFragment method.

        // Let's verify getFragment works.
        const effectiveFragment = compiledNode.getMetric(MetricType.Duration);
        expect(effectiveFragment).toBeDefined();
        // Should be the one with higher precedence (compiler i.e. "60")
        expect((effectiveFragment as TimerMetric).image).toBe("60");
    });
});
