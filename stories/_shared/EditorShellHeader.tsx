/**
 * EditorShellHeader
 *
 * Consistent toolbar used across all web-editor views:
 *   - Syntax stories (StorybookWorkbench)
 *   - Pages/Note
 *   - Collections detail view
 *
 * Layout:
 *   [ ← back? | Collection? | Title ]   [ Cast · Theme · Debug · Download · Reset ]
 */

import React from 'react';
import { ArrowLeft, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CastButtonRpc } from '@/components/cast/CastButtonRpc';
import { DebugButton } from '@/components/layout/DebugModeContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export interface EditorShellHeaderProps {
  /** Shows a ← arrow button that calls this when clicked */
  onBack?: () => void;
  /** Optional collection label shown to the left of the separator */
  collection?: string;
  /** Document / page title (defaults to "WOD Wiki") */
  title?: string;
  /** Called when the Download button is clicked — button hidden if omitted */
  onDownload?: () => void;
  /** Called when the Reset button is clicked — button hidden if omitted */
  onReset?: () => void;
}

export function EditorShellHeader({
  onBack,
  collection,
  title = 'WOD Wiki',
  onDownload,
  onReset,
}: EditorShellHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0 h-12">
      {/* Left: back · collection · title */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        {onBack && (
          <>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-border shrink-0">|</span>
          </>
        )}

        {collection && (
          <>
            <span className="text-sm text-muted-foreground truncate">{collection}</span>
            <span className="text-border shrink-0">|</span>
          </>
        )}

        <span className="text-sm font-semibold text-foreground truncate">{title}</span>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <CastButtonRpc />
        <ThemeToggle />
        <DebugButton />
        {onDownload && (
          <Button variant="ghost" size="icon" title="Download" onClick={onDownload}>
            <Download className="size-4" />
          </Button>
        )}
        {onReset && (
          <Button variant="ghost" size="icon" title="Reset" onClick={onReset}>
            <RotateCcw className="size-4 text-red-500" />
          </Button>
        )}
      </div>
    </div>
  );
}
