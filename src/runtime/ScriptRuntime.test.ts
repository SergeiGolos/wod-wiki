import { describe, it, expect, vi } from 'vitest';
import { ScriptRuntime } from './ScriptRuntime';
import { WodScript } from '../WodScript';
import { IRuntimeEvent, IRuntimeAction, EventHandler, HandlerResponse } from './EventHandler';
import { IRuntimeBlock } from './IRuntimeBlock';
import { JitCompiler, RuntimeJitStrategies } from './JitCompiler';
import { FragmentCompilationManager } from './FragmentCompilationManager';
import { CountdownStrategy, EffortStrategy, RoundsStrategy } from './strategies';
import { compilers } from './FragmentCompilationManager.fixture';
import { BlockKey } from '../BlockKey';
import { IResultSpanBuilder } from './ResultSpanBuilder';
import { NextEvent } from './events/NextEvent';
import { EffortBlock } from './blocks/EffortBlock';

describe('ScriptRuntime', () => {
    it('should handle events by iterating through handlers', () => {
        // Arrange
        const script = new WodScript('', [], []);
       const fragmentCompiler = new FragmentCompilationManager(compilers);
        const strategyManager = new RuntimeJitStrategies()
            .addStrategy(new CountdownStrategy())
            .addStrategy(new RoundsStrategy())
            .addStrategy(new EffortStrategy());
        const jitCompiler = new JitCompiler(script, fragmentCompiler, strategyManager);
        const runtime = new ScriptRuntime(script, jitCompiler);

        const action1: IRuntimeAction = { type: 'action1', do: vi.fn() };
        const action2: IRuntimeAction = { type: 'action2', do: vi.fn() };

        const handler1: EventHandler = {
            id: 'handler1',
            name: 'Handler 1',
            handleEvent: vi.fn().mockReturnValue({ handled: true, shouldContinue: true, actions: [action1] } as HandlerResponse)
        };

        const handler2: EventHandler = {
            id: 'handler2',
            name: 'Handler 2',
            handleEvent: vi.fn().mockReturnValue({ handled: true, shouldContinue: true, actions: [action2] } as HandlerResponse)
        };

        const block: IRuntimeBlock = {
            key: new BlockKey('block1'),
            handlers: [handler1, handler2],
            tick: () => [],
            inherit: () => [],
            spans: {} as IResultSpanBuilder,
            metrics: []
        };

        runtime.stack.push(block);

        const event: IRuntimeEvent = { name: 'test-event', timestamp: new Date() };

        // Act
        runtime.handle(event);

        // Assert
        expect(handler1.handleEvent).toHaveBeenCalledWith(event);
        expect(handler2.handleEvent).toHaveBeenCalledWith(event);
        expect(action1.do).toHaveBeenCalledWith(runtime);
        expect(action2.do).toHaveBeenCalledWith(runtime);
    });

    it('should stop processing when a handler returns shouldContinue: false', () => {
        // Arrange
        const script = new WodScript('', [], []);
               const fragmentCompiler = new FragmentCompilationManager(compilers);
        const strategyManager = new RuntimeJitStrategies()
            .addStrategy(new CountdownStrategy())
            .addStrategy(new RoundsStrategy())
            .addStrategy(new EffortStrategy());
        const jitCompiler = new JitCompiler(script, fragmentCompiler, strategyManager);
        const runtime = new ScriptRuntime(script, jitCompiler);

        const action1: IRuntimeAction = { type: 'action1', do: vi.fn() };

        const handler1: EventHandler = {
            id: 'handler1',
            name: 'Handler 1',
            handleEvent: vi.fn().mockReturnValue({ handled: true, shouldContinue: false, actions: [action1] } as HandlerResponse)
        };

        const handler2: EventHandler = {
            id: 'handler2',
            name: 'Handler 2',
            handleEvent: vi.fn()
        };

        const block: IRuntimeBlock = {
            key: new BlockKey('block1'),                        
            handlers: [handler1, handler2],
            tick: () => [],
            inherit: () => [],
            spans: {} as IResultSpanBuilder,
            metrics: []
        };

        runtime.stack.push(block);

        const event: IRuntimeEvent = { name: 'test-event', timestamp: new Date() };

        // Act
        runtime.handle(event);

        // Assert
        expect(handler1.handleEvent).toHaveBeenCalledWith(event);
        expect(handler2.handleEvent).not.toHaveBeenCalled();
        expect(action1.do).toHaveBeenCalledWith(runtime);
    });

    it('should call the correct action when a NextEvent is handled by a block', () => {
        // Arrange
        const script = new WodScript('', [], []);
        const fragmentCompiler = new FragmentCompilationManager(compilers);
        const strategyManager = new RuntimeJitStrategies()
            .addStrategy(new CountdownStrategy())
            .addStrategy(new RoundsStrategy())
            .addStrategy(new EffortStrategy());
        const jitCompiler = new JitCompiler(script, fragmentCompiler, strategyManager);
        const runtime = new ScriptRuntime(script, jitCompiler);

        const block = new EffortBlock(new BlockKey('effort'), []);
        const popSpy = vi.spyOn(runtime.stack, 'pop');

        runtime.stack.push(block);

        const event = new NextEvent();

        // Act
        runtime.handle(event);

        // Assert
        expect(popSpy).toHaveBeenCalled();
    });
});
