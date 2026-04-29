/**
 * useRuntimeParser — Public hook boundary for parser and compiler access.
 *
 * Re-exports parser utilities, the compiler singleton, and a `RuntimeFactory`
 * singleton so that components in `src/components/` never need to import
 * directly from `src/parser/` or `src/runtime/`.
 *
 * Provides a `useRuntimeParser` hook for React components that need
 * parse or compile operations.
 */

import { useMemo } from 'react';

// ── Parser exports ────────────────────────────────────────────────────────
export { sharedParser } from '@/parser/parserInstance';
export { MdTimerRuntime } from '@/parser/md-timer';
export { wodscriptLanguage } from '@/parser/wodscript-language';
export { extractStatements } from '@/parser/lezer-mapper';

// ── Compiler / runtime factory exports ───────────────────────────────────
export { globalCompiler, globalParser } from '@/runtime/services/runtimeServices';
export { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
export type { IRuntimeFactory } from '@/runtime/compiler/RuntimeFactory';

// ── Singleton factory ─────────────────────────────────────────────────────

import { RuntimeFactory } from '@/runtime/compiler/RuntimeFactory';
import { globalCompiler, globalParser } from '@/runtime/services/runtimeServices';

/**
 * Shared RuntimeFactory singleton — avoids re-constructing the compiler on
 * every render.  Import this instead of `new RuntimeFactory(globalCompiler)`.
 */
export const runtimeFactory = new RuntimeFactory(globalCompiler);

// ── React hook ────────────────────────────────────────────────────────────

export interface UseRuntimeParserReturn {
  /** Parse a WOD script string into an IScript */
  parse: (text: string) => ReturnType<typeof globalParser.read>;
  /** Shared RuntimeFactory instance */
  factory: RuntimeFactory;
}

/**
 * Hook that provides stable parse and factory helpers for React components.
 *
 * @example
 * ```tsx
 * const { parse, factory } = useRuntimeParser();
 * const script = parse(editorContent);
 * const runtime = factory.createRuntime(block);
 * ```
 */
export function useRuntimeParser(): UseRuntimeParserReturn {
  return useMemo(
    () => ({
      parse: (text: string) => globalParser.read(text),
      factory: runtimeFactory,
    }),
    [],
  );
}
