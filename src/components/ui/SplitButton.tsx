/**
 * SplitButton
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

export interface SplitButtonProps {
  /** Primary left-hand action — shows label + icon */
  primary: INavActivation;
  /** Secondary right-hand action — shows icon only */
  secondary: INavActivation;
  size?: 'sm' | 'default';
  className?: string;
  /** Override action execution — supply when NavActionDeps are available. */
  onAction?: (action: INavAction, activation: INavActivation) => void;
}

function fireAction(
  activation: INavActivation,
  onAction?: SplitButtonProps['onAction'],
): void {
  if (onAction) {
    onAction(activation.action, activation);
    return;
  }
  if (activation.action.type === 'call') {
    activation.action.handler();
  }
}

export const SplitButton: React.FC<SplitButtonProps> = ({
  primary,
  secondary,
  size = 'default',
  className,
  onAction,
}) => {
  const PrimaryIcon = primary.icon;
  const SecondaryIcon = secondary.icon;

  const padding = size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const iconPadding = size === 'sm' ? 'px-2 py-1.5' : 'px-2.5 py-2';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-lg overflow-hidden border border-border/70',
        'bg-muted text-muted-foreground shadow-sm hover:shadow-md transition-shadow font-medium',
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
          'flex items-center gap-2 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          padding,
        )}
      >
        {PrimaryIcon && <PrimaryIcon className="h-4 w-4 shrink-0" />}
        <span>{primary.label}</span>
      </button>

      {/* Divider */}
      <div className="w-px bg-border/60 self-stretch" />

      {/* Secondary */}
      <button
        type="button"
        title={secondary.label}
        onClick={() => fireAction(secondary, onAction)}
        className={cn(
          'flex items-center justify-center transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          iconPadding,
        )}
      >
        {SecondaryIcon
          ? <SecondaryIcon className="h-4 w-4" />
          : <span className="sr-only">{secondary.label}</span>
        }
      </button>
    </div>
  );
};
