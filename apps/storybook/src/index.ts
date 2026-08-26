/**
 * @bitcobblers/wod-wiki-storybook
 * State-free Storybook workbench and golden fixture catalog.
 */

import { CODEMIRROR_SINGLETON_DEPS } from '@bitcobblers/wod-wiki-ui';

export function getStorybookConfig(): { dedupe: readonly string[] } {
  return {
    dedupe: CODEMIRROR_SINGLETON_DEPS,
  };
}
