import { cn } from '@/lib/utils';
import type { IListItem } from './types';

export interface ActionBarViewProps<TPayload> {
  items: IListItem<TPayload>[];
  onSelect: (item: IListItem<TPayload>) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function ActionBarView<TPayload>({
  items,
  onSelect,
  orientation = 'horizontal',
  className,
}: ActionBarViewProps<TPayload>) {
  return (
    <div
      role="toolbar"
      className={cn(
        'flex items-center gap-1',
        orientation === 'vertical' && 'flex-col',
        className,
      )}
    >
      {items.map(item => {
        const isPrimary = (item.payload as { primary?: boolean })?.primary ?? false;

        return (
          <button
            key={item.id}
            title={item.label}
            disabled={item.isDisabled}
            onClick={() => onSelect(item)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
              isPrimary
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
              item.isDisabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            {item.icon && <span className="h-3 w-3">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
