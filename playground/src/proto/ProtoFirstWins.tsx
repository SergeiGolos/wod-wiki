// PROTOTYPE — throwaway
// Achievement shelf for the home canvas route: a strip of five "first"
// milestones, unlocked by the user's early actions in the demo editor.

import { Check, Lock, Pencil, Play, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

type TileState = 'unlocked' | 'locked'

interface TileProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  state: TileState
  subCaption: string
}

function Tile({ icon: Icon, label, state, subCaption }: TileProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center',
        state === 'unlocked'
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-dashed border-muted-foreground/30 opacity-50',
      )}
    >
      <Icon
        className={cn('size-4', state === 'unlocked' ? 'text-amber-500' : 'text-muted-foreground')}
        aria-hidden
      />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-[9px] leading-tight text-muted-foreground">
        {state === 'unlocked' ? 'today' : subCaption}
      </span>
    </div>
  )
}

export interface ProtoFirstWinsProps {
  hasEdited: boolean
  hasRun: boolean
  hasLogged: boolean
  hasCompletedQuest: boolean
}

export function ProtoFirstWins({
  hasEdited,
  hasRun,
  hasLogged,
  hasCompletedQuest,
}: ProtoFirstWinsProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      <Tile icon={Pencil} label="First Edit" state={hasEdited ? 'unlocked' : 'locked'} subCaption="edit the example" />
      <Tile icon={Play} label="First Run" state={hasRun ? 'unlocked' : 'locked'} subCaption="run the timer" />
      <Tile icon={Check} label="First Log" state={hasLogged ? 'unlocked' : 'locked'} subCaption="finish a workout" />
      <Tile icon={ScrollText} label="First Quest" state={hasCompletedQuest ? 'unlocked' : 'locked'} subCaption="finish a quest" />
      <Tile icon={Lock} label="First Collection" state="locked" subCaption="coming soon" />
    </div>
  )
}
