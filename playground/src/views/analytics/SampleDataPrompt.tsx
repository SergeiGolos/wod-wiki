import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { WqlEmptyState } from '@/components/molecules/analytics';
import { hasSampleData, loadSampleData, purgeSampleData } from '@/services/analytics/sample';
import type { QueryResult } from '@/services/analytics/query';

interface SampleDataPromptProps {
  result?: QueryResult;
  onChanged?: () => void | Promise<void>;
  /** 'inline' keeps the prompt inside a chart-sized area; 'card' renders a full-width empty-state card; 'banner' renders only the sample-data banner (or nothing if no sample data). */
  layout?: 'inline' | 'card' | 'banner';
  refreshKey?: number | string;
}

export function SampleDataPrompt({ result, onChanged, layout = 'inline', refreshKey }: SampleDataPromptProps) {
  const [loaded, setLoaded] = useState<boolean | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    setLoaded(await hasSampleData());
    setDismissed(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const handleLoad = async () => {
    await loadSampleData();
    await refresh();
    onChanged?.();
  };

  const handlePurge = async () => {
    await purgeSampleData();
    await refresh();
    onChanged?.();
  };

  const banner = (
    <div className="flex items-center justify-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-foreground">
      <span>Sample data loaded</span>
      <button
        onClick={handlePurge}
        className="font-medium text-destructive hover:text-destructive/80 transition-colors"
      >
        Purge sample data
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );

  if (layout === 'banner') {
    return loaded && !dismissed ? banner : null;
  }

  const loadPrompt = (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-2">
        Facts appear when you log or run workouts.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleLoad}
          className="text-xs font-medium rounded-md bg-primary text-primary-foreground px-3 py-1.5 hover:opacity-90 transition-opacity"
        >
          Load sample data
        </button>
        <Link
          to="/collections"
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          Run a workout instead
        </Link>
      </div>
    </div>
  );

  const inner = loaded ? (dismissed ? null : banner) : loadPrompt;

  if (layout === 'card') {
    return (
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center text-sm text-muted-foreground">
        <WqlEmptyState result={result} />
        {loaded !== undefined && inner && <div className="mt-3">{inner}</div>}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <WqlEmptyState result={result} />
      {loaded !== undefined && inner && <div className="mt-3">{inner}</div>}
    </div>
  );
}
