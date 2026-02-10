/**
 * AnalyzePanel - Placeholder comparative analysis panel
 *
 * Displays selected entries for multi-select mode.
 * Full implementation of comparative visualizations is a separate effort.
 */

import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { HistoryEntry } from '@/types/history';

export interface AnalyzePanelProps {
  /** Selected entries for comparative analysis */
  selectedEntries: HistoryEntry[];
}

export const AnalyzePanel: React.FC<AnalyzePanelProps> = ({
  selectedEntries,
}) => {
  return (
    <div className="h-full flex items-center justify-center bg-background p-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 text-foreground">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-xl font-semibold">
            Analyze
          </h2>
          <span className="text-sm text-muted-foreground">(Comparative View)</span>
        </div>

        {/* Selected Entries Card */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="text-sm font-medium text-foreground">
            Selected Entries: {selectedEntries.length}
          </div>

          {selectedEntries.length > 0 ? (
            <ul className="space-y-2">
              {selectedEntries.map(entry => (
                <li key={entry.id} className="flex items-baseline gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground">{entry.title}</span>
                  <span className="text-muted-foreground text-xs">
                    — {new Date(entry.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">
              No entries selected
            </div>
          )}

          <div className="border-t border-border pt-3 text-center text-sm text-muted-foreground">
            ── Comparative analysis coming soon ──
          </div>
        </div>
      </div>
    </div>
  );
};
