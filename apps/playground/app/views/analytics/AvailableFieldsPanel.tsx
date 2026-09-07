/**
 * AvailableFieldsPanel — the analytics explorer's discovery view (wayfinder
 * datadog-analytics ticket 15): lists discovered fields with kind, observed
 * units, and source-role provenance from the injected field catalog. Catalog
 * reads only — zero event/result history scans. The catalog's change
 * notification refreshes the list without reload.
 */

import { useEffect, useState } from 'react';
import type { CatalogFieldSuggestion, IFieldCatalog } from '@bitcobblers/wod-wiki-wql';

export function AvailableFieldsPanel({ catalog }: { catalog: IFieldCatalog }) {
  const [fields, setFields] = useState<CatalogFieldSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      catalog.listByPrefix(prefix, 50).then((entries) => {
        if (!cancelled) setFields(entries);
      }).catch(() => {});
    };
    load();
    const unsubscribe = catalog.onChange?.(() => load());
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [catalog, prefix]);

  return (
    <section className="rounded-lg border p-3 text-sm" data-testid="available-fields">
      <button
        type="button"
        className="flex w-full items-center justify-between font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Available fields ({fields.length})</span>
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <>
          <input
            className="mt-2 w-full rounded border px-2 py-1"
            placeholder="Filter fields…"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
            {fields.map((field) => (
              <li key={field.id} className="flex items-baseline justify-between gap-2">
                <span className="font-mono">{field.path}</span>
                <span className="text-xs opacity-70">
                  {field.kind}
                  {field.dimension ? ` · ${field.dimension}` : ''}
                  {field.units.length ? ` · ${field.units.join('/')}` : ''}
                  {field.spellings.length && field.spellings[0] !== field.path
                    ? ` · “${field.spellings[0]}”`
                    : ''}
                </span>
              </li>
            ))}
            {fields.length === 0 && (
              <li className="opacity-60">No discovered fields for this prefix.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
