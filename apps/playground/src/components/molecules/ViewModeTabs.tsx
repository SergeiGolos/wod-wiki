import React from 'react';
import { Button } from '@/components/atoms/primitives/button';
import { cn } from '@/lib/utils';

export interface ViewModeTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ViewModeTabsProps {
  views: ViewModeTab[];
  activeView: string;
  onChange: (id: string) => void;
  isMobile?: boolean;
}

export const ViewModeTabs: React.FC<ViewModeTabsProps> = ({
  views,
  activeView,
  onChange,
  isMobile = false,
}) => {
  return (
    <>
      {views.map((view) => (
        <Button
          key={view.id}
          id={`tutorial-view-mode-${view.id}`}
          variant={activeView === view.id ? 'default' : 'ghost'}
          size={isMobile ? 'icon' : 'sm'}
          onClick={() => onChange(view.id)}
          className={cn('gap-2', activeView !== view.id && 'text-muted-foreground hover:text-foreground')}
        >
          {view.icon}
          {!isMobile && view.label}
        </Button>
      ))}
    </>
  );
};
