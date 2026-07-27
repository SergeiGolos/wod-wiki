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
import { createParser } from '@/parser/parserInstance';
import type { MdTimerRuntime } from '@/parser/md-timer';

// ── Parser exports ────────────────────────────────────────────────────────
export { createParser } from '@/parser/parserInstance';
export { MdTimerRuntime } from '@/parser/md-timer';
export { whiteboardScriptLanguage } from '@/parser/whiteboard-script-language';
export { extractStatements } from '@/parser/lezer-mapper';

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
