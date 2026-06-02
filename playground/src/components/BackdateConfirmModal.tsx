/**
 * BackdateConfirmModal
 *
 * Confirmation modal for importing a journal entry to a past date.
 * Displays the date being backdated to and requires explicit confirmation.
 */

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';

export interface BackdateConfirmModalProps {
  /** The date being backdated to (YYYY-MM-DD format) */
  dateKey: string;
  /** Called when user confirms the backdate action */
  onConfirm: () => Promise<void>;
  /** Called when user cancels or dismisses the modal */
  onCancel: () => void;
  /** Whether the confirmation is in progress */
  isLoading?: boolean;
}

export const BackdateConfirmModal: React.FC<BackdateConfirmModalProps> = ({
  dateKey,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [confirming, setConfirming] = React.useState(false);

  // Parse date for display
  const date = new Date(`${dateKey}T00:00:00`);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-in fade-in" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-4 animate-in zoom-in-95 fade-in">
        <div className="bg-background rounded-lg border border-border shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold">Backdate Journal Entry</h2>
            <button
              onClick={onCancel}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              The date you selected is in the past.
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Import to: </span>
              <span className="font-medium text-foreground">{formattedDate}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              This will create a journal entry for the selected date. Are you sure you want to proceed?
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading || confirming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || confirming}
              className={cn(
                isLoading || confirming ? 'opacity-70' : '',
              )}
            >
              {confirming ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Importing...
                </>
              ) : (
                'Confirm & Import'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
