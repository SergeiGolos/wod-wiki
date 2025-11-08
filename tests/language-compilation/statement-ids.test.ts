// Test to verify statement IDs use line numbers (not character offsets)
import { describe, it, expect, beforeEach } from 'vitest';
import { MdTimerRuntime } from '../../src/parser/md-timer';

describe('Statement ID Line Number Verification', () => {
  let runtime: MdTimerRuntime;

  beforeEach(() => {
    runtime = new MdTimerRuntime();
  });

  it('should assign line numbers as statement IDs', () => {
    const input = `first statement
second statement
third statement`;

    const result = runtime.read(input);
    
    // Verify we have 3 statements
    expect(result.statements.length).toBe(3);
    
    // Verify statement IDs are line numbers (1, 2, 3)
    expect(result.statements[0].id).toBe(1);
    expect(result.statements[1].id).toBe(2);
    expect(result.statements[2].id).toBe(3);
  });

  it('should use line numbers not character offsets for nested statements', () => {
    const input = `parent
  child 1
  child 2`;

    const result = runtime.read(input);
    
    // Parent on line 1, children on lines 2 and 3
    const parent = result.statements.find(stmt => stmt.id === 1);
    expect(parent).toBeDefined();
    expect(parent!.children).toBeDefined();
    
    // Children should have IDs 2 and 3 (line numbers)
    const allChildIds = parent!.children.flat();
    expect(allChildIds).toContain(2);
    expect(allChildIds).toContain(3);
  });

  it('should maintain line numbers across complex structures', () => {
    const input = `line one
line two
line three
line four
line five`;

    const result = runtime.read(input);
    
    // Verify all statement IDs match their line numbers
    result.statements.forEach((stmt, index) => {
      expect(stmt.id).toBe(index + 1);
      expect(stmt.meta.line).toBe(index + 1);
    });
  });

  it('should not use character offsets as IDs', () => {
    // This input has specific character offsets we can predict
    const input = `statement one
statement two
statement three`;

    const result = runtime.read(input);
    
    // Line 1 starts at offset 0
    // Line 2 starts at offset 14 (after "statement one\n")
    // Line 3 starts at offset 28 (after "statement one\nstatement two\n")
    
    // IDs should be 1, 2, 3 (line numbers)
    expect(result.statements[0].id).toBe(1);
    expect(result.statements[1].id).toBe(2);
    expect(result.statements[2].id).toBe(3);
    
    // Verify they are NOT character offsets (would be 0, 14, 28)
    expect(result.statements[0].id).not.toBe(0);
    expect(result.statements[1].id).not.toBe(14);
    expect(result.statements[2].id).not.toBe(28);
  });
});
