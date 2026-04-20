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
  size?: 'sm' | 'default';
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
  onAction,
}) => {
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary.icon;
  const isPrimary = variant === 'primary';

  const padding = size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const iconPadding = size === 'sm' ? 'px-2 py-1.5' : 'px-2.5 py-2';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

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
        onClick={() => fireAction(primary, onAction)}
        className={cn(
          'flex items-center gap-2 transition-colors active:scale-95',
          isPrimary
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest pl-5 pr-4 py-2'
            : cn('hover:bg-accent hover:text-accent-foreground text-muted-foreground font-medium', padding),
        )}
      >
        {PrimaryIcon && <PrimaryIcon className={cn('shrink-0', isPrimary ? 'size-3 fill-current' : 'h-4 w-4')} />}
        <span>{primary.label}</span>
      </button>

      {/* Divider */}
      <div className={cn(
        'self-stretch',
        isPrimary ? 'w-px bg-primary-foreground/20 my-1' : 'w-px bg-border/60',
      )} />

      {/* Secondary */}
      <button
        type="button"
        title={secondary.label}
        onClick={() => fireAction(secondary, onAction)}
        className={cn(
          'flex items-center justify-center transition-colors active:scale-95',
          isPrimary
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2'
            : cn('hover:bg-accent hover:text-accent-foreground text-muted-foreground', iconPadding),
        )}
      >
        {SecondaryIcon
          ? <SecondaryIcon className={cn('shrink-0', isPrimary ? 'size-3.5' : 'h-4 w-4')} />
          : <span className="sr-only">{secondary.label}</span>
        }
      </button>
    </div>
  );
};
