import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '../RuntimeTestBuilder';
import { IRuntimeBlockStrategy } from '@/runtime/contracts';
import { IRuntimeBlock } from '@/runtime/contracts';
import { MockBlock } from '../MockBlock';

// Mock strategy for testing
class MockStrategy implements IRuntimeBlockStrategy {
  match() { return true; }
  compile(statements: any[]) {
    return new MockBlock(`block-${statements[0].id}`);
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
  });

  it('should fail if statement index out of bounds', () => {
    const harness = new RuntimeTestBuilder()
      .withScript('10:00 Run')
      .withStrategy(new MockStrategy())
      .build();

    expect(() => harness.pushStatement(99)).toThrow();
  });
});
