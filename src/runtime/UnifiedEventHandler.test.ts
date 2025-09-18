import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptRuntimeWithMemory } from './ScriptRuntimeWithMemory';
import { WodScript } from '../WodScript';
import { JitCompiler } from './JitCompiler';
import { IEventHandler, HandlerResponse, IRuntimeEvent, IRuntimeAction } from './EventHandler';
import { IScriptRuntime } from './IScriptRuntime';
import { StartEvent } from './events/StartEvent';
import { StopEvent } from './events/StopEvent';
import { TickEvent } from './events/TickEvent';
import { RuntimeBlockWithMemoryBase } from './RuntimeBlockWithMemoryBase';
import { BlockKey } from '../BlockKey';
import { IRuntimeEvent as IEvent } from './EventHandler';

// Mock block that creates a test handler
class TestBlock extends RuntimeBlockWithMemoryBase {
    constructor(key: BlockKey, private handlerName: string) {
        super(key);
    }

    protected createSpansBuilder() {
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => console.log(`🟢 Started span for ${this.key}`),
            stop: () => console.log(`🔴 Stopped span for ${this.key}`)
        };
    }

    protected createInitialHandlers(): IEventHandler[] {
        return [new TestEventHandler(this.handlerName, this.key.toString())];
    }

    protected onPush(): IRuntimeEvent[] { return []; }
    protected onNext() { return undefined; }
    protected onPop(): void {}
    protected initializeMemory(): void {}
}

// Test handler that can handle multiple event types
class TestEventHandler implements IEventHandler {
    public readonly id: string;
    public readonly name: string;
    public handledEvents: IRuntimeEvent[] = [];

    constructor(name: string, blockKey: string) {
        this.name = name;
        this.id = `${name}-${blockKey}`;
    }

    handler(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {
        // Record that this handler processed the event
        this.handledEvents.push(event);
        
        if (event.name === 'tick' || event.name === 'start' || event.name === 'stop') {
            return {
                handled: true,
                shouldContinue: true,
                actions: [new TestAction(this.name, event.name)]
            };
        }

        return { handled: false, shouldContinue: true, actions: [] };
    }
}

// Test action to track execution
class TestAction implements IRuntimeAction {
    public readonly type = 'TestAction';
    public executed = false;

    constructor(
        public handlerName: string, 
        public eventName: string
    ) {}

    do(script: IScriptRuntime): void {
        this.executed = true;
        console.log(`✅ TestAction executed - Handler: ${this.handlerName}, Event: ${this.eventName}`);
    }
}

describe('Unified Runtime Event Handler', () => {
    let runtime: ScriptRuntimeWithMemory;
    let mockScript: WodScript;
    let mockCompiler: JitCompiler;

    beforeEach(() => {
        mockScript = {} as WodScript;
        mockCompiler = {} as JitCompiler;
        runtime = new ScriptRuntimeWithMemory(mockScript, mockCompiler);
    });

    it('should process events against ALL handlers in memory, not just current block', () => {
        // Create multiple blocks with different handlers
        const block1 = new TestBlock(new BlockKey('block1', 1), 'Handler1');
        const block2 = new TestBlock(new BlockKey('block2', 2), 'Handler2');
        const block3 = new TestBlock(new BlockKey('block3', 3), 'Handler3');

        // Push all blocks to create handlers in memory
        runtime.stack.push(block1);
        runtime.stack.push(block2);
        runtime.stack.push(block3);

        // Get references to handlers for testing
        const handler1 = runtime.memory.searchReferences<TestEventHandler>({ ownerId: 'block1', type: 'handler' })[0]?.get();
        const handler2 = runtime.memory.searchReferences<TestEventHandler>({ ownerId: 'block2', type: 'handler' })[0]?.get();
        const handler3 = runtime.memory.searchReferences<TestEventHandler>({ ownerId: 'block3', type: 'handler' })[0]?.get();

        expect(handler1).toBeDefined();
        expect(handler2).toBeDefined();
        expect(handler3).toBeDefined();

        // Create a tick event
        const tickEvent = new TickEvent();

        // Process the event - this should reach ALL handlers, not just the current block's handler
        runtime.handle(tickEvent);

        // Verify that ALL handlers processed the event
        expect(handler1!.handledEvents).toHaveLength(1);
        expect(handler2!.handledEvents).toHaveLength(1);
        expect(handler3!.handledEvents).toHaveLength(1);

        // Verify they all received the same event
        expect(handler1!.handledEvents[0]).toBe(tickEvent);
        expect(handler2!.handledEvents[0]).toBe(tickEvent);
        expect(handler3!.handledEvents[0]).toBe(tickEvent);

        // Verify that updated blocks are tracked
        const updatedBlocks = runtime.getLastUpdatedBlocks();
        expect(updatedBlocks).toContain('block1');
        expect(updatedBlocks).toContain('block2'); 
        expect(updatedBlocks).toContain('block3');
    });

    it('should track which blocks were updated during event processing', () => {
        const block1 = new TestBlock(new BlockKey('test-block-1', 1), 'TestHandler1');
        const block2 = new TestBlock(new BlockKey('test-block-2', 2), 'TestHandler2');

        runtime.stack.push(block1);
        runtime.stack.push(block2);

        // Initially no blocks updated
        expect(runtime.getLastUpdatedBlocks()).toEqual([]);

        // Process an event
        runtime.handle(new TickEvent());

        // Both blocks should be marked as updated since their handlers processed the event
        const updatedBlocks = runtime.getLastUpdatedBlocks();
        expect(updatedBlocks).toContain('test-block-1');
        expect(updatedBlocks).toContain('test-block-2');
    });

    it('should provide event, timestamp, stack, script, and memory reference to handlers', () => {
        const block = new TestBlock(new BlockKey('test-block', 1), 'TestHandler');
        runtime.stack.push(block);

        const handler = runtime.memory.searchReferences<TestEventHandler>({ ownerId: 'test-block', type: 'handler' })[0]?.get();
        expect(handler).toBeDefined();

        // Mock the handler to verify it receives the correct parameters
        const originalHandleEvent = handler!.handler;
        let receivedEvent: IRuntimeEvent | undefined;
        let receivedRuntime: IScriptRuntime | undefined;

        handler!.handler = (event: IRuntimeEvent, runtimeParam: IScriptRuntime): HandlerResponse => {
            receivedEvent = event;
            receivedRuntime = runtimeParam;
            return originalHandleEvent.call(handler, event, runtimeParam);
        };

        const testEvent = new StartEvent(new Date());
        runtime.handle(testEvent);

        // Verify handler received correct parameters
        expect(receivedEvent).toBe(testEvent);
        expect(receivedRuntime).toBe(runtime);
        
        // Verify the runtime has access to stack, memory, etc.
        expect(receivedRuntime!.stack).toBeDefined();
        expect((receivedRuntime as any).memory).toBeDefined();
    });
});