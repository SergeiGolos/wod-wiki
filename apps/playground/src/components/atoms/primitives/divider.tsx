import { cn } from "@/lib/utils"
import type React from 'react'

export function Divider({
  soft = false,
  className,
  ...props
}: { soft?: boolean } & React.ComponentPropsWithoutRef<'hr'>) {
  return (
    <hr
      role="presentation"
      {...props}
      className={cn(
        className,
        'w-full border-t',
        soft && 'border-border/30',
        !soft && 'border-border/60'
      )}
    />
  )
}

export function AnimatedDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
  return (
    <hr
      {...props}
      className={cn(
        className,
        'w-full border-t border-border/60',
        'animate-pulse-opacity'
      )}
    />
  )
}
