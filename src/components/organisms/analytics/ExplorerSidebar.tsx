import { cn } from '@/lib/utils';

export interface ExplorerSidebarProps {
  metricKeys: string[];
  tagKeys: string[];
  query: string;
  onSelectMetric: (metric: string) => void;
}

export function ExplorerSidebar({ metricKeys, tagKeys, query, onSelectMetric }: ExplorerSidebarProps) {
  return (
    <aside className="w-56 shrink-0 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Metric namespace
        </div>
        <div className="flex flex-col gap-1">
          {metricKeys.map((key) => (
            <button
              key={key}
              onClick={() => onSelectMetric(key)}
              className={cn(
                'text-left text-xs px-2 py-1 rounded hover:bg-background/80 transition-colors',
                query.includes(key) ? 'text-primary font-medium' : 'text-muted-foreground',
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Tag keys
        </div>
        <div className="text-[11px] text-muted-foreground mb-2">
          Available filters; tag values are not enumerated yet.
        </div>
        <div className="flex flex-col gap-1">
          {tagKeys.map((key) => (
            <span
              key={key}
              className="text-left text-xs px-2 py-1 rounded text-muted-foreground"
            >
              {key}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
