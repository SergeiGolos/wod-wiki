/**
 * Canonical array of CodeMirror & Lezer singleton dependency package names.
 * Consuming applications (such as wod-wiki) import this directly into vite.config.ts resolve.dedupe.
 */
export const CODEMIRROR_SINGLETON_DEPS = [
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/theme-one-dark',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr',
  '@lezer/markdown',
] as const;
