/**
 * Catalog / Organisms / WqlComposer
 *
 * Renders: {@link import('../../../src/components/organisms/wql-composer').WqlComposer}
 *
 * Shared omni command bar (Variant B3, issue #829) — token-slot pills with
 * placeholder guidance, clause popovers, add-filter menu, and a where-join
 * editor composing a WQL `find:` query. Tab / Shift+Tab traverses slots,
 * Up/Down cycles options, Enter selects, Escape dismisses.
 *
 * Stories:
 *  1. Default — uncontrolled, seeded with target/scope/time clauses
 *  2. Controlled — clauses + composed WQL / validation / AST surfaced live
 *  3. CustomSlots — consumer-supplied extension content inside the bar
 *  4. RegisteredSlot — ComposerRegistry date-range picker plugin (issue #830)
 *  5. LiveDiagnostics — diagnostics strip with debounced stage counts (issue #832)
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  WqlComposer,
  composerRegistry,
  dateRangeSlot,
  defaultClauses,
  CLAUSE_META,
  type QueryClause,
  type WqlExecutor,
  type WqlValidationState,
} from '@bitcobblers/wod-wiki-ui';
import type { AnyParsedQuery, FindQueryResult, QueryResult } from '@bitcobblers/wod-wiki-engine';
import { isFindQuery } from '@bitcobblers/wod-wiki-engine';

const meta: Meta<typeof WqlComposer> = {
  title: 'Workbench/WQL Composer',
  component: WqlComposer,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof WqlComposer>;

export const Default: Story = {
  render: () => (
    <div className="max-w-3xl">
      <WqlComposer />
    </div>
  ),
};

const ControlledHarness: React.FC = () => {
  const [clauses, setClauses] = useState<QueryClause[]>(defaultClauses());
  const [wql, setWql] = useState('');
  const [validation, setValidation] = useState<WqlValidationState>({ valid: true });
  const [ast, setAst] = useState<AnyParsedQuery | null>(null);

  return (
    <div className="max-w-3xl space-y-3">
      <WqlComposer
        clauses={clauses}
        onClausesChange={setClauses}
        onWqlChange={setWql}
        onValidationChange={setValidation}
        onAstChange={setAst}
      />
      <div className="font-mono text-xs break-all">
        <span className={validation.valid ? 'text-green-600' : 'text-red-600'}>
          {validation.valid ? 'valid' : `error: ${validation.error}`}
        </span>
        {' — '}
        {wql}
      </div>
      <pre className="text-[10px] text-muted-foreground overflow-x-auto">
        {JSON.stringify(ast, null, 2)}
      </pre>
    </div>
  );
};

export const Controlled: Story = {
  render: () => <ControlledHarness />,
};

export const CustomSlots: Story = {
  render: () => (
    <div className="max-w-3xl">
      <WqlComposer
        customSlots={
          <button
            type="button"
            className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Run ▶
          </button>
        }
      />
    </div>
  ),
};

const RegisteredSlotHarness: React.FC = () => {
  const [wql, setWql] = useState('');
  const [validation, setValidation] = useState<WqlValidationState>({ valid: true });

  // Pages register their custom slots during initialization; unregister on teardown.
  useEffect(() => composerRegistry.registerSlot(dateRangeSlot), []);

  return (
    <div className="max-w-3xl space-y-3">
      <WqlComposer onWqlChange={setWql} onValidationChange={setValidation} />
      <div className="font-mono text-xs break-all">
        <span className={validation.valid ? 'text-green-600' : 'text-red-600'}>
          {validation.valid ? 'valid' : `error: ${validation.error}`}
        </span>
        {' — '}
        {wql}
      </div>
      <p className="text-[10px] text-muted-foreground">
        The “Date Range” entry in Add Filter comes from the ComposerRegistry demo
        slot (dateRangeSlot). Pick start + end, Set Range — the pill serializes
        the range and the composer emits a parseable `daterange:` fragment.
      </p>
    </div>
  );
};

export const RegisteredSlot: Story = {
  render: () => <RegisteredSlotHarness />,
};

const LiveDiagnosticsHarness: React.FC = () => {
  // Deterministic stand-in for queryService: counts scale with the number of
  // active filter clauses so edits visibly move the numbers.
  const execute: WqlExecutor = async (ast: AnyParsedQuery) => {
    if (isFindQuery(ast)) {
      return {
        parsed: ast,
        notes: [],
        blocks: [],
        stages: { selected: 128, matched: Math.max(0, 128 - ast.filters.length * 37) },
      } as FindQueryResult
    }
    return {
      parsed: ast,
      series: [],
      stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
    } as QueryResult
  }

  return (
    <div className="max-w-3xl space-y-2">
      <WqlComposer execute={execute} />
      <p className="text-[10px] text-muted-foreground">
        The strip under the bar re-parses on every clause change: green/red
        validity badge (red names the offending slot), AST summary
        (source · window · join), and debounced (150ms) matched/selected
        stage counts. Type “garbage” into a Metric Join slot to see the error
        attribution; add Tag filters to move the counts.
      </p>
    </div>
  );
};

export const LiveDiagnostics: Story = {
  render: () => <LiveDiagnosticsHarness />,
};

const AnalyticsCompositionHarness: React.FC = () => {
  const [clauses, setClauses] = useState<QueryClause[]>([
    { id: 'c-source', type: 'source', ...CLAUSE_META.source, value: 'metrics' },
    { id: 'c-agg', type: 'agg', ...CLAUSE_META.agg, value: 'sum' },
    { id: 'c-metric', type: 'metric', ...CLAUSE_META.metric, value: 'totalVolume' },
    { id: 'c-groupby', type: 'groupby', ...CLAUSE_META.groupby, value: 'week' },
    { id: 'c-rollup', type: 'rollup', ...CLAUSE_META.rollup, value: '1w' },
  ]);

  const execute: WqlExecutor = async (ast: AnyParsedQuery) => {
    return {
      parsed: ast,
      series: [],
      stages: { selected: 12, buckets: 4, aggregated: 4, groups: 2 },
    } as QueryResult;
  };

  return (
    <div className="max-w-3xl space-y-2">
      <WqlComposer clauses={clauses} onClausesChange={setClauses} execute={execute} />
      <p className="text-[10px] text-muted-foreground">
        Analytics composition (issue #838): the source pill pivots to the
        metrics plane, revealing the aggregate head (agg · metric · groupby ·
        rollup). The diagnostics strip shows aggregate chips and the aggregate
        stage counts (selected · buckets · aggregated · groups).
      </p>
    </div>
  );
};

export const AnalyticsComposition: Story = {
  render: () => <AnalyticsCompositionHarness />,
};
