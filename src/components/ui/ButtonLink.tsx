import * as React from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

type ButtonLinkIcon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

export interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {
  icon?: ButtonLinkIcon
  trailingIcon?: ButtonLinkIcon
  fullWidth?: boolean
}

function getIconSize(size: ButtonLinkProps['size']): string {
  switch (size) {
    case 'sm':
      return 'h-4 w-4'
    case 'lg':
      return 'h-5 w-5'
    case 'icon':
      return 'h-4 w-4'
    default:
      return 'h-4 w-4'
  }
}

export const ButtonLink = React.memo(React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, icon: Icon, trailingIcon: TrailingIcon, fullWidth = false, children, ...props }, ref) => {
    const iconSize = getIconSize(size)

    return (
      <a
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          'gap-2 no-underline [&_svg]:pointer-events-none [&_svg]:shrink-0',
          fullWidth && 'w-full justify-start',
          className,
        )}
        {...props}
      >
        {Icon && <Icon className={iconSize} aria-hidden="true" />}
        <span className="truncate">{children}</span>
        {TrailingIcon && <TrailingIcon className={cn(iconSize, 'ml-auto')} aria-hidden="true" />}
      </a>
    )
  },
))
ButtonLink.displayName = 'ButtonLink'
