import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { HistoryRow } from './HistoryRow';

export interface HistoryItem {
  id: string;
  label: string;
  startTime: number;
  endTime?: number; // undefined if active
  type: string;
  depth: number;
  fragments: ICodeFragment[];
  isHeader: boolean;
  status: 'active' | 'completed' | 'failed' | 'skipped';
}

export interface HistoryListProps {
  items: HistoryItem[];
  activeItemId?: string | null;
  className?: string;
  autoScroll?: boolean;
  onItemClick?: (item: HistoryItem) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  activeItemId,
  className,
  autoScroll = true,
  onItemClick
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when items change
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items.length, autoScroll]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
       <div
         ref={scrollRef}
         className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2"
       >
         {items.length === 0 ? (
           <div className="p-4 text-sm text-muted-foreground italic text-center opacity-50">
             No events recorded
           </div>
         ) : (
           <div className="flex flex-col">
             {items.map((item) => (
               <HistoryRow
                 key={item.id}
                 id={item.id}
                 label={item.label}
                 timestamp={item.startTime}
                 duration={item.endTime ? item.endTime - item.startTime : undefined}
                 type={item.type}
                 depth={item.depth}
                 fragments={item.fragments}
                 isHeader={item.isHeader}
                 isActive={item.id === activeItemId}
                 onClick={() => onItemClick?.(item)}
               />
             ))}
           </div>
         )}
       </div>
    </div>
  );
};
