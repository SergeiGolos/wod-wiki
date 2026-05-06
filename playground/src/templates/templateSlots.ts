import type { ReactNode } from 'react';

export type TemplateSlot<TContext> = ReactNode | ((context: TContext) => ReactNode);

export function renderTemplateSlot<TContext>(
  slot: TemplateSlot<TContext> | undefined,
  context: TContext,
): ReactNode {
  if (typeof slot === 'function') {
    return (slot as (context: TContext) => ReactNode)(context);
  }

  return slot ?? null;
}
