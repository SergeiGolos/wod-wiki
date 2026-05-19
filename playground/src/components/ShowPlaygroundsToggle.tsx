import React from 'react';
import { Eye } from 'lucide-react';
import { Switch } from '@/components/playground/switch';
import { useShowPlaygrounds } from '../hooks/useShowPlaygrounds';

export const ShowPlaygroundsToggle: React.FC = () => {
  const [showPlaygrounds, setShowPlaygrounds] = useShowPlaygrounds();

  return (
    <div className="flex items-center gap-3 px-6 lg:px-10 pb-3">
      <Eye className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
      <span className="flex-1 text-sm font-medium text-muted-foreground">
        Show playgrounds
      </span>
      <Switch
        checked={showPlaygrounds}
        onChange={setShowPlaygrounds}
        aria-label="Show playground entries"
      />
    </div>
  );
};
