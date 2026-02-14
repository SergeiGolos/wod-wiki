/**
 * UserOverrideDialog — Popover/modal for entering user override values.
 *
 * Opened by double-clicking a fragment cell in the grid.
 * Allows the user to enter a value that creates an ICodeFragment
 * with `origin: 'user'`, stored in the override map.
 *
 * Features:
 * - Shows existing runtime values for context
 * - Text input for the new value (auto-detects numeric)
 * - Clear button to remove existing user override
 * - Positioned relative to the triggering cell via absolute positioning
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FragmentType, type ICodeFragment } from '@/core/models/CodeFragment';
import { getFragmentColorClasses, getFragmentIcon } from '@/views/runtime/fragmentColorMap';

// ─── Props ─────────────────────────────────────────────────────

export interface UserOverrideDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The block key of the row being edited */
  blockKey: string;
  /** The fragment type (column) being edited */
  fragmentType: FragmentType;
  /** Existing fragments in the cell (for context display) */
  existingFragments: ICodeFragment[];
  /** Existing user override value (if any) */
  existingUserValue?: unknown;
  /** Position anchor (relative to viewport) */
  anchorRect?: DOMRect;
  /** Callback to save the override */
  onSave: (blockKey: string, fragmentType: FragmentType, value: unknown, image?: string) => void;
  /** Callback to remove the override */
  onRemove: (blockKey: string, fragmentType: FragmentType) => void;
  /** Callback to close the dialog */
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────

export const UserOverrideDialog: React.FC<UserOverrideDialogProps> = ({
  isOpen,
  blockKey,
  fragmentType,
  existingFragments,
  existingUserValue,
  anchorRect,
  onSave,
  onRemove,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Initialize input with existing user value
  useEffect(() => {
    if (isOpen) {
      setInputValue(existingUserValue !== undefined ? String(existingUserValue) : '');
      // Focus after a tick so the dialog has rendered
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, existingUserValue]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing immediately from the triggering double-click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  const handleSave = useCallback(() => {
    if (inputValue.trim() === '') return;

    // Auto-detect numeric values
    const numValue = Number(inputValue.trim());
    const value = !isNaN(numValue) && inputValue.trim() !== '' ? numValue : inputValue.trim();

    onSave(blockKey, fragmentType, value, String(value));
    onClose();
  }, [inputValue, blockKey, fragmentType, onSave, onClose]);

  const handleRemove = useCallback(() => {
    onRemove(blockKey, fragmentType);
    onClose();
  }, [blockKey, fragmentType, onRemove, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  if (!isOpen) return null;

  const icon = getFragmentIcon(fragmentType);
  const colorClasses = getFragmentColorClasses(fragmentType);
  const hasUserOverride = existingUserValue !== undefined;

  // Existing runtime (non-user) fragments for context
  const runtimeFragments = existingFragments.filter((f) => f.origin !== 'user');

  // Position the dialog near the anchor cell
  const style = anchorRect
    ? {
        position: 'fixed' as const,
        top: anchorRect.bottom + 4,
        left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 280)),
        zIndex: 50,
      }
    : {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="w-64 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
        style={style}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          {icon && <span className="text-sm">{icon}</span>}
          <span className="text-sm font-medium capitalize">{fragmentType}</span>
          <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[100px]" title={blockKey}>
            {blockKey}
          </span>
        </div>

        {/* Existing values context */}
        {runtimeFragments.length > 0 && (
          <div className="px-3 py-1.5 border-b border-border/50 bg-muted/10">
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Current</div>
            <div className="flex flex-wrap gap-1">
              {runtimeFragments.map((frag, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${colorClasses}`}
                >
                  {frag.image ?? String(frag.value ?? frag.type)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
            {hasUserOverride ? 'Update override' : 'Enter value'}
          </label>
          <input
            ref={inputRef}
            type="text"
            className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder={`Enter ${fragmentType} value…`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50">
          <button
            className="flex-1 px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          {hasUserOverride && (
            <button
              className="px-2 py-1 text-xs rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleRemove}
              title="Remove user override"
            >
              Clear
            </button>
          )}
          <button
            className="flex-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            onClick={handleSave}
            disabled={inputValue.trim() === ''}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
};
