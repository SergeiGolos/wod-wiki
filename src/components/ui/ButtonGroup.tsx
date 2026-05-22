/**
 * ButtonGroup
 *
 * Two-sided pill button driven by INavActivation.
 * Left side = primary action (label + optional icon).
 * Right side = secondary action (icon only).
 *
 * Actions with type='call' are fired inline.
 * All other action types require a NavActionDeps context —
 * use executeNavAction() at the molecule/organism layer.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { INavActivation, INavAction } from '@/nav/navTypes';

export interface ButtonGroupProps {
  /** Primary left-hand action — shows label + icon */
  primary: INavActivation;
  /** Secondary right-hand action — shows icon only */
  secondary: INavActivation;
  size?: 'xs' | 'sm' | 'default';
  /** Optional className applied to primary/secondary label spans (e.g. 'hidden sm:inline') */
  labelClassName?: string;
  /**
   * Visual variant.
   * - 'default': muted bordered pill (subtle actions, lists)
   * - 'primary': bg-primary CTA pill with shadow (run buttons, hero CTAs)
   */
  variant?: 'default' | 'primary';
  className?: string;
  /** Override action execution — supply when NavActionDeps are available. */
  onAction?: (action: INavAction, activation: INavActivation) => void;
}

function fireAction(
  activation: INavActivation,
  onAction?: ButtonGroupProps['onAction'],
): void {
  if (onAction) {
    onAction(activation.action, activation);
    return;
  }
  if (activation.action.type === 'call') {
    activation.action.handler();
  }
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  primary,
  secondary,
  size = 'default',
  variant = 'default',
  className,
  labelClassName,
  onAction,
}) => {
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary.icon;
  const isPrimary = variant === 'primary';

  const padding = size === 'xs'
    ? 'h-11 min-w-11 justify-center px-0 sm:h-auto sm:min-w-0 sm:px-2 sm:py-0.5 sm:justify-start'
    : size === 'sm'
      ? 'px-2.5 py-1.5'
      : 'px-3 py-2';
  const iconPadding = size === 'xs'
    ? 'h-11 w-11 px-0 sm:h-auto sm:w-auto sm:px-1.5 sm:py-0.5'
    : size === 'sm'
      ? 'px-2 py-1.5'
      : 'px-2.5 py-2';
  const primaryPadding = size === 'xs'
    ? 'h-11 min-w-11 justify-center px-0 sm:h-auto sm:min-w-0 sm:pl-5 sm:pr-4 sm:py-2 sm:justify-start'
    : 'pl-5 pr-4 py-2';
  const primaryIconPadding = size === 'xs'
    ? 'h-11 w-11 px-0 sm:h-auto sm:w-auto sm:px-3 sm:py-2'
    : 'px-3 py-2';
  const textSize = size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div
      className={cn(
        'inline-flex items-stretch overflow-hidden',
        isPrimary
          ? 'rounded-full shadow-lg shadow-primary/25'
          : 'rounded-lg border border-border/70 bg-muted shadow-sm hover:shadow-md transition-shadow',
        textSize,
        className,
      )}
    >
      {/* Primary */}
      <button
        type="button"
        title={primary.label}
        aria-label={primary.label}
        onClick={() => fireAction(primary, onAction)}
        className={cn(
          'flex items-center gap-2 transition-colors active:scale-95',
          size === 'xs' && 'gap-0 sm:gap-2',
          isPrimary
            ? cn('bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest', primaryPadding)
            : cn('hover:bg-accent hover:text-accent-foreground text-muted-foreground font-medium', padding),
        )}
      >
        {PrimaryIcon && <PrimaryIcon className={cn('shrink-0', isPrimary ? 'size-4 fill-current sm:size-3' : 'size-4 sm:h-4 sm:w-4')} />}
        <span className={labelClassName}>{primary.label}</span>
      </button>

      {/* Divider */}
      <div className={cn(
        'self-stretch',
        isPrimary ? 'w-px bg-primary-foreground/20 my-2 sm:my-1' : 'w-px bg-border/60',
      )} />

      {/* Secondary */}
      <button
        type="button"
        title={secondary.label}
        aria-label={secondary.label}
        onClick={() => fireAction(secondary, onAction)}
        className={cn(
          'flex items-center justify-center transition-colors active:scale-95',
          isPrimary
            ? cn('bg-primary text-primary-foreground hover:bg-primary/90', primaryIconPadding)
            : cn('hover:bg-accent hover:text-accent-foreground text-muted-foreground', iconPadding),
        )}
      >
        {SecondaryIcon
          ? <SecondaryIcon className={cn('shrink-0', isPrimary ? 'size-4 sm:size-3.5' : 'size-4 sm:h-4 sm:w-4')} />
          : <span className="sr-only">{secondary.label}</span>
        }
      </button>
    </div>
  );
};
