/**
 * Catalog / Pages / LibraryPrototypePage
 *
 * Renders: {@link import('../../../playground/src/views/prototype/LibraryPrototypePage').LibraryPrototypePage}
 *
 * Three variants of the unified Library layout, side by side. Issue #808.
 *   A — Dated stream + Static shelf
 *   B — Stream + Catalogues bucket
 *   C — Mode strip + Pinned shelf
 *
 * Stories include a single-variant view (for screenshot capture) and a
 * three-up comparison view (for at-a-glance judgement).
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { LibraryPrototypePage } from '../../../playground/src/views/prototype/LibraryPrototypePage';
import { VariantA } from '../../../playground/src/views/prototype/variants/VariantA';
import { VariantB } from '../../../playground/src/views/prototype/variants/VariantB';
import { VariantC } from '../../../playground/src/views/prototype/variants/VariantC';

const meta: Meta<typeof LibraryPrototypePage> = {
  title: 'catalog/pages/LibraryPrototypePage',
  component: LibraryPrototypePage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Library prototype — three placements for the unified Entry list. ' +
          'Issue #808. Delete once a variant is promoted.',
      },
    },
  },
};

export default meta;

export const Variant_A: StoryObj<typeof LibraryPrototypePage> = {
  name: 'A — Dated stream + Static shelf',
  parameters: { router: { initialEntries: ['/prototype/library?variant=A'] } },
  render: () => (
    <MemoryRouter initialEntries={['/prototype/library?variant=A']}>
      <LibraryPrototypePage />
    </MemoryRouter>
  ),
};

export const Variant_B: StoryObj<typeof LibraryPrototypePage> = {
  name: 'B — Stream + Catalogues bucket',
  parameters: { router: { initialEntries: ['/prototype/library?variant=B'] } },
  render: () => (
    <MemoryRouter initialEntries={['/prototype/library?variant=B']}>
      <LibraryPrototypePage />
    </MemoryRouter>
  ),
};

export const Variant_C: StoryObj<typeof LibraryPrototypePage> = {
  name: 'C — Mode strip + Pinned shelf',
  parameters: { router: { initialEntries: ['/prototype/library?variant=C'] } },
  render: () => (
    <MemoryRouter initialEntries={['/prototype/library?variant=C']}>
      <LibraryPrototypePage />
    </MemoryRouter>
  ),
};

export const All: StoryObj = {
  name: 'All three (compare)',
  render: () => (
    <div className="grid grid-cols-1 gap-4 p-4 bg-muted/30">
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2 px-2">
          A — Dated stream + Static shelf
        </h2>
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <VariantA />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2 px-2">
          B — Stream + Catalogues bucket
        </h2>
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <VariantB />
        </div>
      </section>
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2 px-2">
          C — Mode strip + Pinned shelf
        </h2>
        <div className="border border-border rounded-md overflow-hidden bg-card">
          <VariantC />
        </div>
      </section>
    </div>
  ),
};
