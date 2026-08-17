/**
 * @wod-wiki/storybook
 * State-free Storybook workbench and golden fixture catalog.
 */

import { CODEMIRROR_SINGLETON_DEPS } from '@wod-wiki/ui';

export function getStorybookConfig(): { dedupe: readonly string[] } {
  return {
    dedupe: CODEMIRROR_SINGLETON_DEPS,
  };
}
