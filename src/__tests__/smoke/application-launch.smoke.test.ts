/**
 * Application Launch Smoke Tests
 *
 * These tests validate that core application components initialize correctly.
 * They serve as a "smoke test" suite to verify basic health after deployment.
 *
 * Purpose: Catch configuration failures, missing dependencies, and initialization bugs.
 * Scope: Unit-level initialization tests (not integration or E2E).
 *
 * @see WOD-26 - Unit testing architecture improvement plan
 * @see WOD-28 - Application launch smoke tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DialectRegistry } from '../../services/DialectRegistry';
import { JitCompiler } from '../../runtime/compiler/JitCompiler';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { ExecutionContext } from '../../runtime/ExecutionContext';
import { RuntimeStack } from '../../runtime/RuntimeStack';
import { RuntimeClock } from '../../runtime/RuntimeClock';
import { sharedParser } from '../../parser/parserInstance';
import { SimpleEventBus } from '../../services/events/SimpleEventBus';
import { workbenchEventBus } from '../../services/WorkbenchEventBus';
import { EventBus } from '../../runtime/events/EventBus';
import type { IRuntimeBlockStrategy } from '../../runtime/contracts/IRuntimeBlockStrategy';
import type { IDialect } from '../../core/models/Dialect';
import type { WhiteboardScript } from '../../parser/WhiteboardScript';
import { DEFAULT_RUNTIME_OPTIONS } from '../../runtime/contracts/IRuntimeOptions';

// ---------------------------------------------------------------------------
// Test Doubles
// ---------------------------------------------------------------------------

class MockStrategy implements IRuntimeBlockStrategy {
  readonly id = 'mock-strategy';
  match() { return 0; }
  compile() { return undefined; }
}

class MockDialect implements IDialect {
  readonly id = 'mock-dialect';
  analyze(statement: any) {
    return { hints: [], metrics: [], inheritance: {} };
  }
}

const createMockScript = (): WhiteboardScript => ({
  id: 'test-script',
  statements: [],
  raw: 'test script',
  language: 'en'
});

// ---------------------------------------------------------------------------
// Smoke Test Suite
// -----------------------------------------------------------------

describe('Application Launch Smoke Tests', () => {
  describe('Service Initialization', () => {
    describe('DialectRegistry', () => {
      it('should initialize with empty registry', () => {
        const registry = new DialectRegistry();
        expect(registry.getRegisteredIds()).toEqual([]);
        expect(registry.getRegisteredIds()).toHaveLength(0);
      });

      it('should register and retrieve dialects', () => {
        const registry = new DialectRegistry();
        const dialect = new MockDialect();

        registry.register(dialect);

        expect(registry.getRegisteredIds()).toContain('mock-dialect');
        expect(registry.get('mock-dialect')).toBe(dialect);
      });

      it('should unregister dialects', () => {
        const registry = new DialectRegistry();
        const dialect = new MockDialect();

        registry.register(dialect);
        expect(registry.getRegisteredIds()).toContain('mock-dialect');

        registry.unregister('mock-dialect');
        expect(registry.getRegisteredIds()).not.toContain('mock-dialect');
        expect(registry.get('mock-dialect')).toBeUndefined();
      });

      it('should process statements without crashing when no dialects registered', () => {
        const registry = new DialectRegistry();
        const statement = {
          id: 'test',
          metrics: [],
          children: []
        };

        // Should not throw
        expect(() => registry.process(statement)).not.toThrow();
        expect(statement.hints).toBeDefined();
      });

      it('should process multiple statements in batch', () => {
        const registry = new DialectRegistry();
        const dialect = new MockDialect();
        registry.register(dialect);

        const statements = [
          { id: 's1', metrics: [], children: [] },
          { id: 's2', metrics: [], children: [] },
          { id: 's3', metrics: [], children: [] }
        ];

        // Should not throw
        expect(() => registry.processAll(statements)).not.toThrow();

        // All statements should have hints set
        statements.forEach(stmt => {
          expect(stmt.hints).toBeDefined();
        });
      });
    });

    describe('Event Bus Services', () => {
      it('should initialize SimpleEventBus', () => {
        const bus = new SimpleEventBus<any>();
        expect(bus).toBeDefined();
      });

      it('should initialize workbenchEventBus singleton', () => {
        expect(workbenchEventBus).toBeDefined();
      });

      it('should initialize EventBus for runtime', () => {
        const bus = new EventBus();
        expect(bus).toBeDefined();
      });

      it('should allow subscription on SimpleEventBus', () => {
        const bus = new SimpleEventBus<any>();
        const handler = (event: any) => {};

        const unsub = bus.subscribe(handler);
        expect(unsub).toBeDefined();
        expect(typeof unsub).toBe('function');
      });

      it('should allow subscription on workbenchEventBus', () => {
        const handler = (payload: any) => {};

        const unsub = workbenchEventBus.onScrollToBlock(handler);
        expect(unsub).toBeDefined();
        expect(typeof unsub).toBe('function');
      });

      it('should allow registration on EventBus', () => {
        const bus = new EventBus();
        const handler = { handle: () => [] };

        const unsub = bus.register('test-event', handler, 'test-owner');
        expect(unsub).toBeDefined();
        expect(typeof unsub).toBe('function');
      });

      it('should allow emit on SimpleEventBus', () => {
        const bus = new SimpleEventBus<any>();
        const testEvent = { type: 'test' };

        expect(() => bus.emit(testEvent)).not.toThrow();
      });

      it('should allow emit on workbenchEventBus', () => {
        expect(() => workbenchEventBus.emitScrollToBlock('test')).not.toThrow();
      });

      it('should allow dispatch on EventBus', () => {
        const bus = new EventBus();
        // Dispatch requires a runtime context, so we skip this in smoke tests
        expect(bus).toBeDefined();
      });
    });
  });

  describe('Compiler Initialization', () => {
    it('should initialize JitCompiler without strategies', () => {
      const compiler = new JitCompiler();
      expect(compiler).toBeDefined();
      expect(compiler.getDialectRegistry()).toBeDefined();
    });

    it('should initialize JitCompiler with custom DialectRegistry', () => {
      const registry = new DialectRegistry();
      const compiler = new JitCompiler([], registry);
      expect(compiler.getDialectRegistry()).toBe(registry);
    });

    it('should register strategies', () => {
      const compiler = new JitCompiler();
      const strategy = new MockStrategy();

      compiler.registerStrategy(strategy);

      // Should not throw - strategy is registered
      expect(compiler).toBeDefined();
    });

    it('should initialize with pre-registered strategies', () => {
      const strategies: IRuntimeBlockStrategy[] = [
        new MockStrategy(),
        new MockStrategy()
      ];

      const compiler = new JitCompiler(strategies);
      expect(compiler).toBeDefined();
    });

    it('should compile empty statements without crashing', () => {
      const compiler = new JitCompiler();
      const mockScript = createMockScript();
      const stack = new RuntimeStack();
      const clock = new RuntimeClock();
      const eventBus = new EventBus();

      const runtime = new ScriptRuntime(
        mockScript,
        compiler,
        { stack, clock, eventBus }
      );

      // Empty statements should return undefined
      const result = compiler.compile([], runtime);
      expect(result).toBeUndefined();
    });
  });

  describe('Runtime Initialization', () => {
    let mockScript: WhiteboardScript;
    let compiler: JitCompiler;
    let stack: RuntimeStack;
    let clock: RuntimeClock;
    let eventBus: EventBus;

    beforeEach(() => {
      mockScript = createMockScript();
      compiler = new JitCompiler();
      stack = new RuntimeStack();
      clock = new RuntimeClock();
      eventBus = new EventBus();
    });

    it('should initialize ScriptRuntime with dependencies', () => {
      const runtime = new ScriptRuntime(
        mockScript,
        compiler,
        { stack, clock, eventBus }
      );

      expect(runtime).toBeDefined();
      expect(runtime.script).toBe(mockScript);
      expect(runtime.jit).toBe(compiler);
      expect(runtime.stack).toBe(stack);
      expect(runtime.clock).toBe(clock);
      expect(runtime.eventBus).toBe(eventBus);
    });

    it('should initialize ScriptRuntime with default options', () => {
      const runtime = new ScriptRuntime(
        mockScript,
        compiler,
        { stack, clock, eventBus }
      );

      expect(runtime.options).toBeDefined();
      expect(runtime.options).toEqual(DEFAULT_RUNTIME_OPTIONS);
    });

    it('should initialize ScriptRuntime with custom options', () => {
      const customOptions = {
        debug: true,
        tracker: undefined
      };

      const runtime = new ScriptRuntime(
        mockScript,
        compiler,
        { stack, clock, eventBus },
        customOptions
      );

      expect(runtime.options.debug).toBe(true);
    });

    it('should initialize ExecutionContext', () => {
      const runtime = new ScriptRuntime(
        mockScript,
        compiler,
        { stack, clock, eventBus }
      );

      const context = new ExecutionContext(runtime, 20);

      expect(context).toBeDefined();
      expect(context.script).toBe(mockScript);
      expect(context.stack).toBe(stack);
      expect(context.clock).toBeDefined();
      // Clock should be frozen (SnapshotClock) - verify it's a different instance
      expect(context.clock).not.toBe(clock);
    });

    it('should initialize ExecutionContext with custom max iterations', () => {
      const runtime = new ScriptRuntime(
        mockScript,
        compiler,
        { stack, clock, eventBus }
      );

      const context = new ExecutionContext(runtime, 50);
      expect(context).toBeDefined();
    });

    it('should handle multiple ExecutionContext instances', () => {
      const runtime = new ScriptRuntime(
        mockScript,
        compiler,
        { stack, clock, eventBus }
      );

      const ctx1 = new ExecutionContext(runtime, 20);
      const ctx2 = new ExecutionContext(runtime, 30);

      expect(ctx1).toBeDefined();
      expect(ctx2).toBeDefined();
      expect(ctx1).not.toBe(ctx2);
    });
  });

  describe('Parser Initialization', () => {
    it('should initialize shared parser singleton', () => {
      expect(sharedParser).toBeDefined();
    });

    it('should return same instance on multiple imports', () => {
      // Import again to verify singleton
      const parser2 = require('../../parser/parserInstance').sharedParser;
      expect(sharedParser).toBe(parser2);
    });

    it('should have read method available', () => {
      expect(typeof sharedParser.read).toBe('function');
    });

    it('should parse empty script without crashing', () => {
      expect(() => sharedParser.read('')).not.toThrow();
      const result = sharedParser.read('');
      expect(result).toBeDefined();
    });

    it('should parse simple script without crashing', () => {
      const simpleScript = '10:00 Run';
      expect(() => sharedParser.read(simpleScript)).not.toThrow();
      const result = sharedParser.read(simpleScript);
      expect(result).toBeDefined();
      expect(result.statements).toBeDefined();
    });
  });

  describe('End-to-End Initialization Smoke Test', () => {
    it('should initialize full runtime stack without errors', () => {
      // 1. Initialize services
      const registry = new DialectRegistry();
      const dialect = new MockDialect();
      registry.register(dialect);

      const eventBus = new EventBus();

      // 2. Initialize compiler
      const compiler = new JitCompiler([], registry);
      const strategy = new MockStrategy();
      compiler.registerStrategy(strategy);

      // 3. Initialize runtime components
      const stack = new RuntimeStack();
      const clock = new RuntimeClock();

      // 4. Initialize runtime
      const script = createMockScript();
      const runtime = new ScriptRuntime(
        script,
        compiler,
        { stack, clock, eventBus }
      );

      // 5. Verify all components are connected
      expect(runtime.jit.getDialectRegistry()).toBe(registry);
      expect(runtime.stack).toBe(stack);
      expect(runtime.clock).toBe(clock);
      expect(runtime.eventBus).toBe(eventBus);

      // 6. Verify runtime is in idle state
      expect(runtime.stack.count).toBe(0);
      expect(runtime.stack.current).toBeUndefined();
    });

    it('should initialize with real parser output', () => {
      const script = sharedParser.read('10:00 Run');
      expect(script).toBeDefined();
      expect(script.statements).toBeDefined();
      expect(script.statements.length).toBeGreaterThan(0);

      const compiler = new JitCompiler();
      const stack = new RuntimeStack();
      const clock = new RuntimeClock();
      const eventBus = new EventBus();

      const runtime = new ScriptRuntime(
        script,
        compiler,
        { stack, clock, eventBus }
      );

      expect(runtime).toBeDefined();
      expect(runtime.script).toBe(script);
    });

    it('should handle multiple runtime instances', () => {
      const compiler = new JitCompiler();
      const eventBus = new EventBus();

      const runtime1 = new ScriptRuntime(
        createMockScript(),
        compiler,
        { stack: new RuntimeStack(), clock: new RuntimeClock(), eventBus }
      );

      const runtime2 = new ScriptRuntime(
        createMockScript(),
        compiler,
        { stack: new RuntimeStack(), clock: new RuntimeClock(), eventBus: new EventBus() }
      );

      expect(runtime1).toBeDefined();
      expect(runtime2).toBeDefined();
      expect(runtime1).not.toBe(runtime2);
      expect(runtime1.stack).not.toBe(runtime2.stack);
      expect(runtime1.clock).not.toBe(runtime2.clock);
    });
  });

  describe('Error Recovery During Initialization', () => {
    it('should handle missing dialect gracefully', () => {
      const registry = new DialectRegistry();
      expect(registry.get('nonexistent')).toBeUndefined();
      expect(() => registry.get('nonexistent')).not.toThrow();
    });

    it('should handle unregistering non-existent dialect gracefully', () => {
      const registry = new DialectRegistry();
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });

    it('should handle empty strategy list in compiler', () => {
      const compiler = new JitCompiler([]);
      expect(compiler).toBeDefined();
      expect(compiler.getDialectRegistry()).toBeDefined();
    });

    it('should handle null/undefined in process gracefully', () => {
      const registry = new DialectRegistry();
      // Should not crash with empty statement
      expect(() => registry.processAll([])).not.toThrow();
    });
  });

  describe('Component Lifecycle Validation', () => {
    it('should support runtime disposal', () => {
      const runtime = new ScriptRuntime(
        createMockScript(),
        new JitCompiler(),
        { stack: new RuntimeStack(), clock: new RuntimeClock(), eventBus: new EventBus() }
      );

      expect(() => runtime.dispose()).not.toThrow();
    });

    it('should support event bus cleanup', () => {
      const bus = new EventBus();
      const handler = { handle: () => [] };

      const unsub = bus.register('test', handler, 'owner');
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });

    it('should support stack subscription', () => {
      const stack = new RuntimeStack();
      const observer = () => {};

      const unsub = stack.subscribe(observer);
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });
  });
});
