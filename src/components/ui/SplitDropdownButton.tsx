/**
 * SplitDropdownButton
 *
 * Two-sided pill: left = primary action, right = chevron that opens a
 * DropdownMenu listing any number of additional INavActivation actions.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { INavActivation, INavAction } from '@/nav/navTypes';

export interface SplitDropdownButtonProps {
  /** Primary left-hand action */
  primary: INavActivation;
  /** Actions shown in the dropdown */
  actions: INavActivation[];
  size?: 'sm' | 'default';
  className?: string;
  /** Override action execution — supply when NavActionDeps are available. */
  onAction?: (action: INavAction, activation: INavActivation) => void;
}

function fireAction(
  activation: INavActivation,
  onAction?: SplitDropdownButtonProps['onAction'],
): void {
  if (onAction) {
    onAction(activation.action, activation);
    return;
  }
  if (activation.action.type === 'call') {
    activation.action.handler();
  }
}

export const SplitDropdownButton: React.FC<SplitDropdownButtonProps> = ({
  primary,
  actions,
  size = 'default',
  className,
  onAction,
}) => {
  const PrimaryIcon = primary.icon;
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

      {/* Dropdown trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="More options"
            className={cn(
              'flex items-center justify-center transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              iconPadding,
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {actions.map((act, i) => {
            if (act.action.type === 'none') {
              return <DropdownMenuSeparator key={act.id ?? i} />;
            }
            const Icon = act.icon;
            return (
              <DropdownMenuItem
                key={act.id}
                onClick={() => fireAction(act, onAction)}
                className="gap-2"
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                {act.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
