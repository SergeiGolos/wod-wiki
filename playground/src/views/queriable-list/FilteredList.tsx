import React from 'react';
import { cn } from '@/lib/utils';
import { FileTextIcon, PlayIcon, CheckCircleIcon } from 'lucide-react';
import type { FilteredListItem } from './types';

interface FilteredListProps {
  items: FilteredListItem[];
  onSelect: (item: FilteredListItem) => void;
}

const ItemIcon = ({ type }: { type: FilteredListItem['type'] }) => {
  switch (type) {
    case 'note': return <FileTextIcon className="size-4 text-blue-500" />;
    case 'block': return <PlayIcon className="size-4 text-emerald-500" />;
    case 'result': return <CheckCircleIcon className="size-4 text-purple-500" />;
  }
};

export const FilteredList: React.FC<FilteredListProps> = ({ items, onSelect }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
        <p className="text-sm font-medium">No results found for your query.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <button
          key={`${item.type}-${item.id}`}
          onClick={() => onSelect(item)}
          className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-left group"
        >
          <div className="flex-shrink-0 size-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
            <ItemIcon type={item.type} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-sm font-bold text-foreground truncate uppercase tracking-tight">
                {item.title}
              </h3>
              {item.date && (
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate font-medium">
              {item.subtitle}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
