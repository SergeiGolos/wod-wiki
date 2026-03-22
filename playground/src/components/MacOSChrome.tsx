import { type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

/** MacOS-style chrome wrapper for sticky panels */
export function MacOSChrome({ title, children, onReset, headerActions }: { title: string; children: ReactNode; onReset?: () => void; headerActions?: ReactNode }) {
  return (
    <div className="flex flex-col w-full h-full rounded-2xl lg:rounded-3xl overflow-hidden border border-border shadow-2xl bg-background">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/60 shrink-0">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-red-500/50" />
          <div className="size-2.5 rounded-full bg-amber-500/50" />
          <div className="size-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</span>
          {headerActions}
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-transparent hover:border-border/60 transition-all"
            >
              <RotateCcw className="size-2.5" />
              Reset
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
