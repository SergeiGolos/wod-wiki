import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface WidgetFrameProps {
  title: string;
  question: string;
  query: string;
  span?: string;
  children: ReactNode;
}

export function WidgetFrame({ title, question, query, span, children }: WidgetFrameProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg p-4 flex flex-col min-h-0',
        span,
      )}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        <span className="text-[11px] text-muted-foreground italic text-right max-w-[60%] line-clamp-2">{question}</span>
      </div>
      <div className="font-mono text-[11px] text-primary/90 bg-background/60 rounded px-2 py-1 mb-3 overflow-x-auto whitespace-nowrap">
        {query}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
