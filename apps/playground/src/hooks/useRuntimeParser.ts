/**
 * useRuntimeParser — Public hook boundary for parser access.
 *
 * Re-exports lightweight parser utilities so that components in
 * `src/components/` never need to import directly from `src/parser/`.
 *
 * For compiler/factory access, use `useRuntimeFactory` from
 * `@/hooks/useRuntimeFactory`.
 */

import { useMemo } from 'react';
import { createParser } from '@bitcobblers/wod-wiki-engine';
import type { MdTimerRuntime } from '@bitcobblers/wod-wiki-engine';

// ── Parser exports ────────────────────────────────────────────────────────
export { createParser } from '@bitcobblers/wod-wiki-engine';
export { MdTimerRuntime } from '@bitcobblers/wod-wiki-engine';
export { whiteboardScriptLanguage } from '@bitcobblers/wod-wiki-engine';
export { extractStatements } from '@bitcobblers/wod-wiki-engine';

// ── React hook ────────────────────────────────────────────────────────────

export interface UseRuntimeParserReturn {
  /** Parse a Whiteboard script string into an IScript */
  parse: (text: string) => ReturnType<MdTimerRuntime['read']>;
}

/**
 * Hook that provides a stable parse helper for React components.
 *
 * For compiler/factory operations use `useRuntimeFactory()` instead.
 *
 * @example
 * ```tsx
 * const { parse } = useRuntimeParser();
 * const script = parse(editorContent);
 * ```
 */
export function useRuntimeParser(): UseRuntimeParserReturn {
  return useMemo(
    () => ({
      parse: (text: string) => createParser().read(text),
    }),
    [],
  );
}
