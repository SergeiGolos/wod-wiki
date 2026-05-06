import { cn } from '@/lib/utils';
import { CanvasProse } from '../canvas/CanvasProse';
import type { ParsedCanvasPage } from '../canvas/parseCanvasMarkdown';

export interface ListPreludeCanvasProps {
  page: ParsedCanvasPage;
  className?: string;
}

export function ListPreludeCanvas({ page, className }: ListPreludeCanvasProps) {
  return (
    <div className={cn('px-6 py-8 lg:px-10 lg:py-10 border-b border-border/60 bg-muted/20', className)}>
      <div className="max-w-4xl space-y-8">
        {page.sections.map((section, index) => (
          <section key={section.id} className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-black tracking-tight text-foreground uppercase lg:text-2xl">
                {section.heading}
              </h2>
              {section.prose && <CanvasProse prose={section.prose} />}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
