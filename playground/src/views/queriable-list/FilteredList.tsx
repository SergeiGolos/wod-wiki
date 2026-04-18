import React, { useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FileTextIcon, PlayIcon, CheckCircleIcon, CalendarIcon } from 'lucide-react';
import type { FilteredListItem } from './types';

interface FilteredListProps {
  items: FilteredListItem[];
  onSelect: (item: FilteredListItem) => void;
  /** Optional per-item action renderer. Only called for items with type === 'note'. */
  renderItemActions?: (item: FilteredListItem) => React.ReactNode;
  selectedDate?: Date;
  stickyOffset?: number;
  /** Called when the topmost visible date group changes during scroll */
  onVisibleDateChange?: (dateKey: string) => void;
}

const ItemIcon = ({ type }: { type: FilteredListItem['type'] }) => {
  switch (type) {
    case 'note': return <FileTextIcon className="size-4 text-blue-500" />;
    case 'block': return <PlayIcon className="size-4 text-emerald-500" />;
    case 'result': return <CheckCircleIcon className="size-4 text-purple-500" />;
  }
};

export const FilteredList: React.FC<FilteredListProps> = ({ 
  items, 
  onSelect, 
  renderItemActions,
  selectedDate, 
  stickyOffset = 0, 
  onVisibleDateChange 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track which date-group header is topmost visible and report it upstream
  useEffect(() => {
    if (!onVisibleDateChange) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            // Pick the one closest to the top of the viewport
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });
        if (visible.length > 0 && visible[0].target.id) {
          onVisibleDateChange(visible[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: [0, 0.5, 1.0] },
    );

    // Observe all date-group containers
    Object.values(itemRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [onVisibleDateChange, items]); // re-attach when items change

  const groupedItems = useMemo(() => {
    const groups: { dateKey: string; dateStr: string; date: number | null; items: FilteredListItem[] }[] = [];
    
    items.forEach(item => {
      const date = item.date ? new Date(item.date) : null;
      const dateKey = date ? date.toISOString().split('T')[0] : 'no-date';
      const dateStr = date ? date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'No Date';
      
      let group = groups.find(g => g.dateKey === dateKey);
      if (!group) {
        group = { dateKey, dateStr, date: item.date || null, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    return groups;
  }, [items]);

  useEffect(() => {
    if (selectedDate) {
      const dateKey = selectedDate.toISOString().split('T')[0];
      const element = itemRefs.current[dateKey];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedDate, stickyOffset]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
        <p className="text-sm font-medium">No results found for your query.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" ref={scrollContainerRef}>
      {groupedItems.map((group) => {
        const isSelectedGroup = selectedDate && group.date && 
          new Date(group.date).toDateString() === selectedDate.toDateString();

        return (
          <div 
            key={group.dateKey} 
            id={group.dateKey}
            ref={el => { itemRefs.current[group.dateKey] = el; }}
            className="flex flex-col"
          >
            <div
              className={cn(
                "sticky z-[5] px-6 py-2 bg-muted/80 backdrop-blur-sm border-y border-border flex items-center gap-2",
                isSelectedGroup && "bg-primary/10 border-primary/20"
              )}
              style={{ top: stickyOffset }}
            >              <CalendarIcon className={cn("size-3", isSelectedGroup ? "text-primary" : "text-muted-foreground")} />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isSelectedGroup ? "text-primary" : "text-muted-foreground"
              )}>
                {group.dateStr}
              </span>
            </div>

            <div className="divide-y divide-border/50">
              {group.items.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  id={`workout-${item.id}`}
                  onClick={() => onSelect(item)}
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors text-left group relative",
                    isSelectedGroup && "bg-primary/5"
                  )}
                >
                  {isSelectedGroup && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
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
                          {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-medium">
                      {item.subtitle}
                    </p>
                  </div>

                  {renderItemActions && item.type === 'note' && (
                    <div className="flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                      {renderItemActions(item)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
