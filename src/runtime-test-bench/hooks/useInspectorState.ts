/**
 * useInspectorState — reducer + state machine for WodBlockInspector.
 *
 * Manages the InspectorPhase lifecycle and accumulates spans/entries
 * as each pipeline phase reports results.
 */

import { useReducer } from 'react';
import type {
  InspectorState,
  InspectorAction,
  InspectorPhase,
  MetricSpan,
  MetricEntry,
  EngineSnapshot,
} from '../types/inspector';

// ─── Phase transition table ───────────────────────────────────────────────────
// What phase each action moves us into.

const PHASE_TRANSITIONS: Partial<Record<InspectorAction['type'], InspectorPhase>> = {
  SET_CONTENT:              'idle',
  COMPILE_COMPLETE:         'compile_ready',
  PLAN_COMPLETE:            'plan_ready',
  RUNTIME_BLOCK_REPORTED:   'running',
  PROCESSING_COMPLETE:      'processing',
  COLLECTED:                'collected',
  ENGINE_COMPLETE:          'analytics_ready',   // re-evaluated below
  SUMMARY_COMPLETE:         'complete',
  RESET:                    'idle',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function indexBy<T extends { spanId?: string; entryId?: string }>(
  existing: Record<string, T>,
  items: T[],
  key: keyof T,
): Record<string, T> {
  const next = { ...existing };
  for (const item of items) {
    next[item[key] as string] = item;
  }
  return next;
}

function mergeEngineStatus(
  engines: EngineSnapshot[],
  engineName: string,
  patch: Partial<EngineSnapshot>,
): EngineSnapshot[] {
  return engines.map(e =>
    e.engine.name === engineName ? { ...e, ...patch } : e,
  );
}

function allEnginesComplete(engines: EngineSnapshot[]): boolean {
  return engines.length > 0 && engines.every(e => e.status === 'complete' || e.status === 'error');
}

// ─── Initial state ────────────────────────────────────────────────────────────

export const initialInspectorState: InspectorState = {
  phase:   'idle',
  dialect: '',
  content: '',
  spans:   {},
  entries: {},
  engines: [],
  errors:  [],
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function inspectorReducer(
  state: InspectorState,
  action: InspectorAction,
): InspectorState {
  switch (action.type) {

    case 'SET_CONTENT':
      return {
        ...initialInspectorState,
        phase:   'idle',
        content: action.payload.content,
        dialect: action.payload.dialect,
      };

    case 'COMPILE_COMPLETE':
      return {
        ...state,
        phase:   'compile_ready',
        spans:   indexBy(state.spans,   action.payload.spans,   'spanId'  as keyof MetricSpan),
        entries: indexBy(state.entries, action.payload.entries, 'entryId' as keyof MetricEntry),
        errors:  [],
      };

    case 'PLAN_COMPLETE':
      return {
        ...state,
        phase:   'plan_ready',
        spans:   indexBy(state.spans,   action.payload.spans,   'spanId'  as keyof MetricSpan),
        entries: indexBy(state.entries, action.payload.entries, 'entryId' as keyof MetricEntry),
      };

    case 'RUNTIME_BLOCK_REPORTED':
      return {
        ...state,
        phase:   'running',
        spans:   indexBy(state.spans,   action.payload.spans,   'spanId'  as keyof MetricSpan),
        entries: indexBy(state.entries, action.payload.entries, 'entryId' as keyof MetricEntry),
      };

    case 'PROCESSING_COMPLETE':
      return {
        ...state,
        phase:   'processing',
        spans:   indexBy(state.spans,   action.payload.spans,   'spanId'  as keyof MetricSpan),
        entries: indexBy(state.entries, action.payload.entries, 'entryId' as keyof MetricEntry),
      };

    case 'COLLECTED':
      return {
        ...state,
        phase:   'collected',
        spans:   indexBy(state.spans,   action.payload.spans,   'spanId'  as keyof MetricSpan),
        entries: indexBy(state.entries, action.payload.entries, 'entryId' as keyof MetricEntry),
      };

    case 'ENGINE_STARTED':
      return {
        ...state,
        engines: mergeEngineStatus(state.engines, action.payload.engineName, { status: 'running' }),
      };

    case 'ENGINE_COMPLETE': {
      const engines = mergeEngineStatus(state.engines, action.payload.engineName, {
        status: 'complete',
        results: action.payload.results,
      });
      return {
        ...state,
        phase:   allEnginesComplete(engines) ? 'analytics_ready' : state.phase,
        engines,
      };
    }

    case 'ENGINE_ERROR': {
      const engines = mergeEngineStatus(state.engines, action.payload.engineName, {
        status: 'error',
        error:  action.payload.error,
      });
      return {
        ...state,
        phase:   allEnginesComplete(engines) ? 'analytics_ready' : state.phase,
        engines,
      };
    }

    case 'SUMMARY_COMPLETE':
      return {
        ...state,
        phase:   'complete',
        spans:   indexBy(state.spans,   action.payload.spans,   'spanId'  as keyof MetricSpan),
        entries: indexBy(state.entries, action.payload.entries, 'entryId' as keyof MetricEntry),
      };

    case 'SET_ERRORS':
      return { ...state, errors: action.payload };

    case 'RESET':
      return { ...initialInspectorState };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInspectorState() {
  return useReducer(inspectorReducer, initialInspectorState);
}
