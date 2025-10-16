import { describe, it, expect } from 'vitest';
import {
  EditorPanel,
  RuntimeStackPanel,
  MemoryPanel,
  Toolbar,
  CompilationPanel,
  ControlsPanel,
  StatusFooter
} from '../../../src/runtime-test-bench/components';

describe('Runtime Test Bench Components', () => {
  it('should export all components', () => {
    expect(EditorPanel).toBeDefined();
    expect(RuntimeStackPanel).toBeDefined();
    expect(MemoryPanel).toBeDefined();
    expect(Toolbar).toBeDefined();
    expect(CompilationPanel).toBeDefined();
    expect(ControlsPanel).toBeDefined();
    expect(StatusFooter).toBeDefined();
  });

  it('should be functions/components', () => {
    expect(typeof EditorPanel).toBe('function');
    expect(typeof RuntimeStackPanel).toBe('function');
    expect(typeof MemoryPanel).toBe('function');
    expect(typeof Toolbar).toBe('function');
    expect(typeof CompilationPanel).toBe('function');
    expect(typeof ControlsPanel).toBe('function');
    expect(typeof StatusFooter).toBe('function');
  });
});