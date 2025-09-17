import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptRuntimeWithMemory } from './ScriptRuntimeWithMemory';
import { WodScript } from '../WodScript';
import { JitCompiler } from './JitCompiler';
import { StartHandler } from './handlers/StartHandler';
import { StopHandler } from './handlers/StopHandler';
import { StartEvent } from './events/StartEvent';
import { StopEvent } from './events/StopEvent';
import { RuntimeBlockWithMemoryBase } from './RuntimeBlockWithMemoryBase';
import { BlockKey } from '../BlockKey';
import { IRuntimeEvent, EventHandler } from './EventHandler';

// Mock block for testing spans
class MockSpanBlock extends RuntimeBlockWithMemoryBase {
    public spanStarted = false;
    public spanStopped = false;

    constructor(key: BlockKey) {
        super(key);
    }

    protected createSpansBuilder() {
        const self = this;
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {
                self.spanStarted = true;
                console.log(`🟢 Started span for ${self.key}`);
            },
            stop: () => {
                self.spanStopped = true;
                console.log(`🔴 Stopped span for ${self.key}`);
            }
        };
    }

    protected createInitialHandlers(): EventHandler[] {
        return [new StartHandler(), new StopHandler()];
    }

    protected onPush(): IRuntimeEvent[] { return []; }
    protected onNext() { return undefined; }
    protected onPop(): void {}
    protected initializeMemory(): void {}
}

describe('Global Start/Stop Event Handlers', () => {
    let runtime: ScriptRuntimeWithMemory;
    let mockScript: WodScript;
    let mockCompiler: JitCompiler;

    beforeEach(() => {
        mockScript = {} as WodScript;
        mockCompiler = {} as JitCompiler;
        runtime = new ScriptRuntimeWithMemory(mockScript, mockCompiler);
    });

    it('should start ALL spans in memory when start event occurs', () => {
        // Create multiple blocks with spans
        const block1 = new MockSpanBlock(new BlockKey('span-block-1', 1));
        const block2 = new MockSpanBlock(new BlockKey('span-block-2', 2));
        const block3 = new MockSpanBlock(new BlockKey('span-block-3', 3));

        // Push blocks to create spans in memory
        runtime.stack.push(block1);
        runtime.stack.push(block2);
        runtime.stack.push(block3);

        // Verify spans are not started initially
        expect(block1.spanStarted).toBe(false);
        expect(block2.spanStarted).toBe(false);
        expect(block3.spanStarted).toBe(false);

        // Process a start event - this should start ALL spans
        const startEvent = new StartEvent();
        runtime.handle(startEvent);

        // Verify ALL spans were started
        expect(block1.spanStarted).toBe(true);
        expect(block2.spanStarted).toBe(true);
        expect(block3.spanStarted).toBe(true);

        // Verify that all blocks are tracked as updated
        const updatedBlocks = runtime.getLastUpdatedBlocks();
        expect(updatedBlocks).toContain('span-block-1');
        expect(updatedBlocks).toContain('span-block-2');
        expect(updatedBlocks).toContain('span-block-3');
    });

    it('should stop ALL spans in memory when stop event occurs', () => {
        // Create multiple blocks with spans
        const block1 = new MockSpanBlock(new BlockKey('span-block-1', 1));
        const block2 = new MockSpanBlock(new BlockKey('span-block-2', 2));
        const block3 = new MockSpanBlock(new BlockKey('span-block-3', 3));

        runtime.stack.push(block1);
        runtime.stack.push(block2);
        runtime.stack.push(block3);

        // Verify spans are not stopped initially
        expect(block1.spanStopped).toBe(false);
        expect(block2.spanStopped).toBe(false);
        expect(block3.spanStopped).toBe(false);

        // Process a stop event - this should stop ALL spans
        const stopEvent = new StopEvent();
        runtime.handle(stopEvent);

        // Verify ALL spans were stopped
        expect(block1.spanStopped).toBe(true);
        expect(block2.spanStopped).toBe(true);
        expect(block3.spanStopped).toBe(true);

        // Verify that all blocks are tracked as updated
        const updatedBlocks = runtime.getLastUpdatedBlocks();
        expect(updatedBlocks).toContain('span-block-1');
        expect(updatedBlocks).toContain('span-block-2');
        expect(updatedBlocks).toContain('span-block-3');
    });

    it('should handle start/stop events as system-wide events affecting all spans', () => {
        const block1 = new MockSpanBlock(new BlockKey('block-1', 1));
        const block2 = new MockSpanBlock(new BlockKey('block-2', 2));

        runtime.stack.push(block1);
        runtime.stack.push(block2);

        // Start all spans
        runtime.handle(new StartEvent());
        expect(block1.spanStarted).toBe(true);
        expect(block2.spanStarted).toBe(true);

        // Stop all spans
        runtime.handle(new StopEvent());
        expect(block1.spanStopped).toBe(true);
        expect(block2.spanStopped).toBe(true);
    });
});