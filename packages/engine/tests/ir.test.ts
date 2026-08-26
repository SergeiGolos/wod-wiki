import { describe, it, expect } from 'vitest';
import {
  createIRFile,
  isIRFile,
  buildStatementTree,
  createParser,
  type StatementNode,
} from '../src/index';

describe('IR Envelope and StatementNode', () => {
  it('creates and validates a WodWikiIRFile envelope', () => {
    const ir = createIRFile('parse-tree', { hello: 'world' }, 'test-source', 1234567890);
    expect(ir.$schema).toBe('https://wod-wiki.dev/ir/v1.json');
    expect(ir.kind).toBe('parse-tree');
    expect(ir.generatedAt).toBe(1234567890);
    expect(ir.source).toBe('test-source');
    expect(ir.data).toEqual({ hello: 'world' });

    expect(isIRFile(ir)).toBe(true);
    expect(isIRFile({ foo: 'bar' })).toBe(false);
    expect(isIRFile(null)).toBe(false);
  });

  it('builds StatementNode tree from parsed WhiteboardScript', () => {
    const source = `(21-15-9)\n  Thrusters @95lb\n  Pull-ups`;
    const parser = createParser();
    const script = parser.read(source);

    const tree: StatementNode = buildStatementTree(script);

    expect(tree).toBeDefined();
    expect(tree.id).toBeDefined();
    expect(tree.type).toBeDefined();
    expect(tree.raw).toBeDefined();
    expect(typeof tree.from).toBe('number');
    expect(typeof tree.to).toBe('number');
    expect(Array.isArray(tree.metrics)).toBe(true);
    expect(Array.isArray(tree.children)).toBe(true);
    expect(tree.children.length).toBeGreaterThan(0);
  });
});
