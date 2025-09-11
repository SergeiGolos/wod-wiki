import { describe, it, expect } from 'vitest';
import { RuntimeStack } from './RuntimeStack';
import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';

function makeBlock(id: string): IRuntimeBlock {
  return {
    key: new BlockKey(id),
    handlers: [],
    tick: () => [],
    inherit: () => [],
    spans: {} as any,
  metrics: [],
  isDone: () => false,
  reset: () => {}
  };
}

describe('RuntimeStack ordering', () => {
  it('getParentBlocks should return from outermost (root) to immediate parent', () => {
    const stack = new RuntimeStack();

    const root = makeBlock('root');
    const parent = makeBlock('parent');
    const child = makeBlock('child');

    stack.push(root);
    stack.push(parent);
    stack.push(child);

  const parents = stack.getParentBlocks();
  expect(parents.map(p => p.key.blockId)).toEqual(['root', 'parent']);
  });

  it('blocksTopFirst should return [current..root]', () => {
    const stack = new RuntimeStack();
    stack.push(makeBlock('root'));
    stack.push(makeBlock('parent'));
    stack.push(makeBlock('child'));

  expect(stack.blocksTopFirst.map(b => b.key.blockId)).toEqual(['child', 'parent', 'root']);
  });

  it('blocksBottomFirst should return [root..current]', () => {
    const stack = new RuntimeStack();
    stack.push(makeBlock('root'));
    stack.push(makeBlock('parent'));
    stack.push(makeBlock('child'));

  expect(stack.blocksBottomFirst.map(b => b.key.blockId)).toEqual(['root', 'parent', 'child']);
  });
});
