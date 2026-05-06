import * as React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

type ButtonLinkIcon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

export interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {
  to?: string
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
  ({ className, variant, size, to, icon: Icon, trailingIcon: TrailingIcon, fullWidth = false, children, ...props }, ref) => {
    const iconSize = getIconSize(size)
    const content = (
      <>
        {Icon && <Icon className={iconSize} aria-hidden="true" />}
        <span className="truncate">{children}</span>
        {TrailingIcon && <TrailingIcon className={cn(iconSize, 'ml-auto')} aria-hidden="true" />}
      </>
    )

    const classes = cn(
      buttonVariants({ variant, size }),
      'gap-2 no-underline [&_svg]:pointer-events-none [&_svg]:shrink-0',
      fullWidth && 'w-full justify-start',
      className,
    )

    if (to) {
      return (
        <RouterLink
          to={to}
          ref={ref}
          className={classes}
        >
          {content}
        </RouterLink>
      )
    }

    return (
      <a
        ref={ref}
        className={classes}
        {...props}
      >
        {content}
      </a>
    )
  },
))
ButtonLink.displayName = 'ButtonLink'
