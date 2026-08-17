import { describe, it, expect } from 'vitest';
import { getStorybookConfig } from '../src/index';

describe('@wod-wiki/storybook', () => {
  it('returns singleton deps for dedupe', () => {
    const config = getStorybookConfig();
    expect(config.dedupe).toContain('@codemirror/state');
  });
});
