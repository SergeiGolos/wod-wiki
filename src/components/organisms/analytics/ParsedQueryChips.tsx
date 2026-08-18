import type { ParsedQuery } from '@bitcobblers/wod-wiki-engine';
import { cn } from '@/lib/utils';

interface ChipProps {
  label: string;
  value: string;
  className?: string;
}

function Chip({ label, value, className }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border bg-background/60 px-2 py-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-xs', className ?? 'text-foreground')}>{value}</span>
    </span>
  );
}

export interface ParsedQueryChipsProps {
  parsed: ParsedQuery;
}

export function ParsedQueryChips({ parsed }: ParsedQueryChipsProps) {
  if (parsed.error) {
    return <div className="text-sm text-destructive font-mono">{parsed.error}</div>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip label="aggregate" value={parsed.agg} className="text-blue-400" />
      <Chip label="metric" value={parsed.metric} />
      {parsed.filters.map((f, i) => (
        <Chip
          key={i}
          label={f.negate ? 'exclude' : 'filter'}
          value={`${f.key}:${f.values.map((v) => `${v.value}${v.wildcard ? '*' : ''}`).join('|')}`}
          className="text-amber-400"
        />
      ))}
      {parsed.groupBy.map((d, i) => (
        <Chip key={i} label="group by" value={d} className="text-green-400" />
      ))}
      {parsed.rollup && (
        <Chip label="rollup" value={`${parsed.rollup.size}${parsed.rollup.unit}`} className="text-purple-400" />
      )}
      {parsed.displayUnit && (
        <Chip label="in" value={parsed.displayUnit} className="text-pink-400" />
      )}
    </div>
  );
}
