import type { DashboardToken } from '@/lib/dashboard/model';
import { cn } from '@/lib/utils';

export interface DashboardTokenControlsProps {
  tokens: DashboardToken[];
  /** Current value per token name (defaults applied by the caller). */
  values: Record<string, string>;
  /** Present when the note is editable — changes write back to frontmatter. */
  onChange?: (name: string, value: string) => void;
}

/**
 * DashboardTokenControls — the control row a dashboard note's frontmatter
 * tokens render as (#899): scalar tokens become inputs, list tokens segmented
 * controls (first entry = default). Read-only views (no onChange) render the
 * current values as static text.
 */
export function DashboardTokenControls({ tokens, values, onChange }: DashboardTokenControlsProps) {
  if (tokens.length === 0) return null;
  const readOnly = !onChange;

  return (
    <div
      data-testid="dashboard-token-controls"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4"
    >
      {tokens.map((token) => {
        const current = values[token.name] ?? token.values[0];
        return (
          <div key={token.name} className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">${token.name}</span>
            {token.isList ? (
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                {token.values.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange?.(token.name, option)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-md transition-colors',
                      option === current
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      readOnly && 'cursor-default',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : readOnly ? (
              <span className="text-xs text-foreground font-mono">{current}</span>
            ) : (
              <input
                type="text"
                value={current}
                onChange={(e) => onChange(token.name, e.target.value)}
                className="w-20 rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
