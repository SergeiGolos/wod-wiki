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
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  WqlComposer,
  composerRegistry,
  dateRangeSlot,
  defaultClauses,
  type QueryClause,
  type WqlValidationState,
} from '../../../src/components/organisms/wql-composer';
import type { AnyParsedQuery } from '../../../src/services/analytics/query/wql';

const meta: Meta<typeof WqlComposer> = {
  title: 'Organisms/WqlComposer',
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
