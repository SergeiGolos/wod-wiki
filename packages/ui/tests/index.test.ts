import { describe, it, expect } from 'vitest';
import { CODEMIRROR_SINGLETON_DEPS, formatMetricDisplay } from '../src/index';
import { editorPreset } from '../src/extensions';

describe('@wod-wiki/ui', () => {
  it('exports canonical CODEMIRROR_SINGLETON_DEPS', () => {
    expect(CODEMIRROR_SINGLETON_DEPS).toContain('@codemirror/state');
    expect(CODEMIRROR_SINGLETON_DEPS).toContain('@codemirror/view');
    expect(CODEMIRROR_SINGLETON_DEPS).toContain('@lezer/common');
  });

  it('formats metric display text', () => {
    expect(formatMetricDisplay('pullups', 21, 'reps')).toBe('21 reps (pullups)');
    expect(formatMetricDisplay('pullups', 21)).toBe('21 pullups');
  });

  it('creates editorPreset configuration', () => {
    const preset = editorPreset({ dialect: 'climb', readOnly: true });
    expect(preset.dialect).toBe('climb');
    expect(preset.readOnly).toBe(true);
  });
});
