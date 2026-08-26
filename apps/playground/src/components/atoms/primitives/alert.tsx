import { cn } from "@/lib/utils"
import type React from 'react'

export function Alert({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        className,
        'relative w-full rounded-lg border border-destructive/20 p-4',
        'bg-destructive/5 text-foreground'
      )}
    />
  )
}

export function AlertTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h5'>) {
  return (
    <h5
      {...props}
      className={cn(className, 'mb-1 font-medium leading-none tracking-tight')}
    />
  )
}

export function AlertDescription({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={cn(className, 'text-sm text-muted-foreground [&_p]:leading-relaxed')}
    />
  )
}
