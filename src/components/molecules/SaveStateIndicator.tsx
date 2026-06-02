import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export type SaveState = 'idle' | 'changed' | 'saving' | 'saved' | 'error';

interface SaveStateIndicatorProps {
  state: SaveState;
}

export const SaveStateIndicator: React.FC<SaveStateIndicatorProps> = ({ state }) => {
  if (state === 'idle') return null;

  return (
    <div className="flex items-center transition-opacity duration-300">
      {state === 'changed' && (
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <span>Changed</span>
        </div>
      )}
      {state === 'saving' && (
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </div>
      )}
      {state === 'saved' && (
        <div className="bg-background/80 backdrop-blur-sm border border-input rounded-full px-3 py-1 flex items-center gap-2 text-xs text-emerald-500 shadow-sm animate-in fade-in zoom-in-95 duration-300">
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </div>
      )}
      {state === 'error' && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1 flex items-center gap-2 text-xs text-destructive shadow-sm">
          <AlertCircle className="h-3 w-3" />
          <span>Save Failed</span>
        </div>
      )}
    </div>
  );
};
