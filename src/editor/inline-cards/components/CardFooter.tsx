/**
 * CardFooter - Footer decoration for cards
 * 
 * Compact footer with optional action buttons
 */

import React from 'react';
import { CardType, FooterAction } from '../row-types';
import { Play, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface CardFooterProps {
  cardType: CardType;
  actions?: FooterAction[];
  onAction?: (actionId: string) => void;
  className?: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  'start-workout': Play,
  'edit': Edit,
  'expand': ChevronDown,
  'collapse': ChevronUp,
};

export const CardFooter: React.FC<CardFooterProps> = ({
  cardType,
  actions = [],
  onAction,
  className = '',
}) => {
  const hasActions = actions.length > 0;

  return (
    <div 
      className={`
        card-footer 
        flex items-center justify-end gap-2 
        px-3 py-1.5 
        bg-muted/30
        border-b border-l border-r border-border 
        rounded-b-lg
        ${className}
      `}
    >
      {hasActions ? (
        actions.map((action) => {
          const IconComponent = ACTION_ICONS[action.id] || Edit;
          
          return (
            <Button
              key={action.id}
              variant={action.variant === 'primary' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => onAction?.(action.id)}
            >
              <IconComponent className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          );
        })
      ) : (
        <span className="text-xs text-muted-foreground">
          {/* Empty footer placeholder */}
        </span>
      )}
    </div>
  );
};
