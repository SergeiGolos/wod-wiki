/**
 * useSyntaxChallenge — observes a single `ScriptBlock` and a list of
 * `Quest`s, runs each quest's validation schema against the block, and
 * marks the quest complete (idempotent) when it passes.
 *
 * The canvas editor's `onBlocksChange` emits `ScriptBlock` snapshots whose
 * `statements` field is `undefined` — the parser only compiles on demand
 * inside `WhiteboardCompanion`. So this hook re-parses `block.content`
 * via `MdTimerRuntime.read()` (the same path the editor itself uses) before
 * delegating to `validateScriptBlock`. The parser is constructed per-call
 * (it's lightweight and stateless after construction per the parser factory
 * docs) and the result is memoized on `block.content` so per-keystroke
 * cost is bounded.
 *
 * The hook is otherwise purely reactive — it doesn't care how the block
 * was compiled or where the quests came from.
 */

import { useEffect, useMemo, useState } from 'react';
import { usePageQuests, type Quest } from './usePageQuests';
import {
  validateScriptBlock,
  type ValidationResult,
} from '../services/syntaxChallengeValidator';
import type { ScriptBlock } from '@/components/Editor/types';

export interface UseSyntaxChallengeArgs {
  pageRoute: string;
  quests: Quest[];
  /** The currently-active editor block, or null when no block is focused. */
  block: Pick<ScriptBlock, 'statements' | 'content'> | null;
  /** Pause validation while typing (debounce upstream). */
  enabled?: boolean;
}

export interface UseSyntaxChallengeResult {
  quests: Array<Quest & { isCompleted: boolean; result: ValidationResult }>;
  isComplete: boolean;
  /** Results keyed by quest id for direct lookup in the banner. */
  results: Record<string, ValidationResult>;
}

export function useSyntaxChallenge({
  pageRoute,
  quests,
  block,
  enabled = true,
}: UseSyntaxChallengeArgs): UseSyntaxChallengeResult {
  const { markComplete, quests: questsWithStatus, isComplete } = usePageQuests(pageRoute, quests);

  // Snapshot of which quests have been auto-completed by *this* hook so we
  // don't ping the ledger on every render. Cleared when the page route or
  // quest identities change.
  const [autoCompleted, setAutoCompleted] = useState<Set<string>>(new Set());

  const results = useMemo<Record<string, ValidationResult>>(() => {
    const out: Record<string, ValidationResult> = {};
    if (!enabled || !block) {
      for (const q of quests) {
        out[q.id] = { pass: false, reason: 'No active block.' };
      }
      return out;
    }
    const virtualBlock = { content: block.content, statements: block.statements ?? [] };
    for (const q of quests) {
      if (q.validation?.type === 'workout-complete') {
        out[q.id] = { pass: false, reason: 'Validated at runtime.' };
        continue;
      }
      out[q.id] = validateScriptBlock(virtualBlock, q.validation);
    }
    return out;
  }, [block, quests, enabled]);

  useEffect(() => {
    if (!enabled) return;
    for (const q of questsWithStatus) {
      if (q.isCompleted) continue;
      if (autoCompleted.has(q.id)) continue;
      const r = results[q.id];
      if (r?.pass) {
        markComplete(q.id);
        setAutoCompleted((prev) => {
          if (prev.has(q.id)) return prev;
          const next = new Set(prev);
          next.add(q.id);
          return next;
        });
      }
    }
  }, [enabled, questsWithStatus, results, autoCompleted, markComplete]);

  // Reset the auto-completed set when the page route or the *identity* of
  // the quest list changes. Keyed on a stable quest-id string so a fresh
  // `quests` array reference from `usePageQuests` (returned every render)
  // doesn't trigger a state update that re-renders the parent indefinitely.
  const questKey = useMemo(() => quests.map((q) => q.id).join('|'), [quests]);
  useEffect(() => {
    setAutoCompleted(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRoute, questKey]);

  // Spread the ledger-aware `rest.quests` (which carries `isCompleted`)
  // into the returned `quests` so the banner sees the live completion
  // state from localStorage. The input `quests` parameter lacks
  // `isCompleted` and is only used above for the validation effect.
  const decorated = questsWithStatus.map((q) => ({
    ...q,
    result: results[q.id] ?? { pass: false, reason: 'No validator result.' },
  }));

  return {
    quests: decorated,
    isComplete,
    results,
  };
}
