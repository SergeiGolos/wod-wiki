import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WqlHumanTranslationBannerProps {
  translation: string;
  query: string;
  className?: string;
  onCopy?: () => void;
}

export function WqlHumanTranslationBanner({
  translation,
  query,
  className,
  onCopy,
}: WqlHumanTranslationBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(query);
    }
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'nord-card rounded-xl p-4 border-l-4 border-l-primary bg-card/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4',
        className,
      )}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            Human Translation
          </span>
          <span className="text-xs text-muted-foreground font-mono">Live output from active query AST</span>
        </div>
        <p className="text-sm font-medium text-foreground">{translation}</p>
      </div>

      <div className="flex items-center gap-2 bg-background/90 px-3 py-2 rounded-lg border border-border font-mono text-xs text-primary shrink-0">
        <span className="text-muted-foreground text-[10px]">WQL:</span>
        <code className="font-bold text-foreground">{query}</code>
        <button
          onClick={handleCopy}
          aria-label="Copy WQL query"
          title="Copy WQL query"
          className="ml-2 text-muted-foreground hover:text-foreground text-xs px-1.5 py-0.5 rounded bg-muted border border-border flex items-center gap-1 transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
