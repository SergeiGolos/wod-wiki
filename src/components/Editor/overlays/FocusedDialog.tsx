/**
 * FocusedDialog
 *
 * Full-screen takeover dialog used for immersive views (track, review).
 * Covers the entire viewport with an opaque background, prevents body scroll,
 * and renders children in a full-height flex column with an optional header.
 */

import React, { useEffect } from "react";
import * as ReactDOM from "react-dom";
import { X } from "lucide-react";

export interface FocusedDialogProps {
  /** Title shown in the header bar. If omitted, no header is rendered. */
  title?: string;
  /** Called when the user clicks the close button. */
  onClose: () => void;
  /** Dialog contents — fills the remaining vertical space. */
  children: React.ReactNode;
  /** Extra class name for the close button (e.g. to set z-index when header is hidden). */
  closeButtonClassName?: string;
  /** When true, render a floating close button instead of a header bar. */
  floatingClose?: boolean;
  /** Visual variant of the dialog. 'default' uses theme background, 'minimal' uses white/excel style. */
  variant?: 'default' | 'minimal';
  /** Optional actions (e.g. Cast button) to show to the left of the close button. */
  actions?: React.ReactNode;
}

export const FocusedDialog: React.FC<FocusedDialogProps> = ({
  title,
  onClose,
  children,
  closeButtonClassName,
  floatingClose = false,
  variant = 'default',
  actions,
}) => {
  // Prevent scrolling on the body while the dialog is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const isMinimal = variant === 'minimal';

  const closeBtn = (
    <button
      onClick={onClose}
      className={
        closeButtonClassName ??
        `p-2 rounded-full ${isMinimal ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-950' : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'} transition-colors shadow-sm`
      }
      title="Close"
    >
      <X className="h-5 w-5" />
    </button>
  );

  // Portal to document.body so we escape any CSS containing blocks
  // (CodeMirror sets `contain: size style` on .cm-editor which traps fixed positioning).
  return (ReactDOM as any).createPortal(
    <div className={`fixed inset-0 z-[100] flex flex-col ${isMinimal ? 'bg-white text-zinc-950' : 'bg-background'} animate-in fade-in duration-200`}>
      {floatingClose || (isMinimal && !title) ? (
        <div className="absolute top-4 right-4 z-[110] flex items-center gap-2">
          {actions}
          {closeBtn}
        </div>
      ) : title ? (
        <div className={`flex items-center justify-between px-6 py-4 border-b border-border ${isMinimal ? 'bg-zinc-50/50' : 'bg-muted/30'} shrink-0`}>
          <h2 className={`text-lg ${isMinimal ? 'font-black tracking-tight uppercase text-[11px] text-zinc-400' : 'font-semibold'}`}>{title}</h2>
          <div className="flex items-center gap-2">
            {actions}
            {closeBtn}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>,
    document.body,
  );
};
