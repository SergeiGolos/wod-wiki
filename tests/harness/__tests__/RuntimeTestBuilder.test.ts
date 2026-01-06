import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { IRuntimeBlockStrategy } from '@/runtime/contracts';
import { MockBlock } from '@/testing/harness/MockBlock';
import { BlockBuilder } from '@/runtime/BlockBuilder';
import { BlockContext } from '@/runtime/BlockContext';
import { BlockKey } from '@/core/models/BlockKey';

// Mock strategy for testing
class MockStrategy implements IRuntimeBlockStrategy {
  priority = 100;
  match() { return true; }
  apply(builder: BlockBuilder, statements: any[], runtime: any) {
      const key = new BlockKey();
      const context = new BlockContext(runtime, key.toString(), 'test');
      builder.setContext(context);
      builder.setKey(key);
      builder.setBlockType('MockType');
  }
}

describe('RuntimeTestBuilder', () => {
  it('should build harness with script and strategies', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run')
      .withStrategy(new MockStrategy())
      .build();

    expect(harness.script).toBeDefined();
    expect(harness.jit).toBeDefined();
    expect(harness.runtime).toBeDefined();
  });

  it('should compile and push block from script', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run')
      .withStrategy(new MockStrategy())
      .build();

    harness.pushStatement(0);

    expect(harness.stackDepth).toBe(1);
    expect(harness.currentBlock).toBeDefined();
    expect(harness.currentBlock?.blockType).toBe('MockType');
  });

  it('should fail if statement index out of bounds', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run')
      .withStrategy(new MockStrategy())
      .build();

    expect(() => harness.pushStatement(99)).toThrow();
  });
});
